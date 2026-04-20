import {useEffect, useState, useCallback} from 'react';
import {Alert, Clipboard} from 'react-native';
import {useAppStore} from '../../stores/useAppStore';
import {VerifiableCredential, ConsentData, PresentationExchangeRequest} from '../../types';
import {TransportMode} from '../../services/TransportService';
import CredentialService from '../../services/CredentialService';
import StorageService from '../../services/StorageService';
import LogService from '../../services/LogService';
import PresentationService from '../../services/PresentationService';
import {Module} from '../../utils/constants';

export function useHolderState() {
  const setCurrentModule = useAppStore(state => state.setCurrentModule);

  // Credential storage state
  const [credentialInput, setCredentialInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [credentials, setCredentials] = useState<VerifiableCredential[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoadingCredentials, setIsLoadingCredentials] = useState(true);

  // Presentation request state
  const [requestInput, setRequestInput] = useState('');
  const [isProcessingRequest, setIsProcessingRequest] = useState(false);
  const [consentData, setConsentData] = useState<ConsentData | null>(null);
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [selectedAttributes, setSelectedAttributes] = useState<string[]>([]);
  const [currentRequest, setCurrentRequest] = useState<PresentationExchangeRequest | null>(null);
  const [transportMode, setTransportMode] = useState<TransportMode>('clipboard');
  const [presentationOutput, setPresentationOutput] = useState<string | null>(null);

  const loadCredentials = useCallback(async () => {
    try {
      setIsLoadingCredentials(true);
      const storedTokens = await StorageService.getCredentials();

      const parsedCredentials: VerifiableCredential[] = [];
      for (const token of storedTokens) {
        try {
          const credential =
            await CredentialService.validateAndParseCredential(token);
          parsedCredentials.push(credential);
        } catch (err) {
          console.error('Failed to parse stored credential:', err);
        }
      }

      setCredentials(parsedCredentials);
      setCurrentIndex(parsedCredentials.length > 0 ? 0 : -1);
    } catch (err) {
      console.error('Failed to load credentials:', err);
      setError('Erro ao carregar credenciais armazenadas');
    } finally {
      setIsLoadingCredentials(false);
    }
  }, []);

  useEffect(() => {
    setCurrentModule(Module.HOLDER);
    loadCredentials();
  }, [setCurrentModule, loadCredentials]);

  const handleStoreCredential = useCallback(async () => {
    if (!credentialInput.trim()) {
      setError('Por favor, cole uma credencial válida');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const credential = await CredentialService.validateAndParseCredential(
        credentialInput.trim(),
      );

      await StorageService.storeCredential(credentialInput.trim());

      LogService.captureEvent(
        'credential_issuance',
        Module.HOLDER,
        {
          parameters: {
            action: 'credential_stored',
            issuer: credential.issuer,
            holder: credential.credentialSubject.id,
          },
        },
        true,
      );

      await loadCredentials();

      setSuccess('Credencial armazenada com sucesso!');
      setCredentialInput('');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      const errorMessage =
        err.message || 'Erro ao armazenar credencial. Verifique o formato.';
      setError(errorMessage);

      LogService.captureEvent(
        'credential_issuance',
        Module.HOLDER,
        {parameters: {action: 'credential_storage_failed'}},
        false,
        err instanceof Error ? err : new Error(String(err)),
      );
    } finally {
      setIsLoading(false);
    }
  }, [credentialInput, loadCredentials]);

  const handlePrevious = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  }, [currentIndex]);

  const handleNext = useCallback(() => {
    if (currentIndex < credentials.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  }, [currentIndex, credentials.length]);

  const handleDeleteCredential = useCallback(() => {
    Alert.alert(
      'Excluir Credencial',
      'Tem certeza que deseja excluir esta credencial?',
      [
        {text: 'Cancelar', style: 'cancel'},
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              await StorageService.deleteCredential(currentIndex);
              await loadCredentials();
              setSuccess('Credencial excluída com sucesso');
              setTimeout(() => setSuccess(null), 3000);
            } catch (err) {
              setError('Erro ao excluir credencial');
            }
          },
        },
      ],
    );
  }, [currentIndex, loadCredentials]);

  const handleProcessRequest = useCallback(async () => {
    if (!requestInput.trim()) {
      setError('Por favor, cole uma requisição PEX válida');
      return;
    }

    if (credentials.length === 0) {
      setError('Nenhuma credencial disponível para criar apresentação');
      return;
    }

    setIsProcessingRequest(true);
    setError(null);
    setSuccess(null);

    try {
      const credential = credentials[currentIndex];
      const consent = await PresentationService.processPEXRequest(
        requestInput.trim(),
        credential,
      );

      const validatedRequest = PresentationService.validatePEXFormat(requestInput.trim());
      setCurrentRequest(validatedRequest);
      setConsentData(consent);
      setSelectedAttributes([...consent.required_attributes]);
      setShowConsentModal(true);
    } catch (err: any) {
      const errorMessage =
        err.message || 'Erro ao processar requisição. Verifique o formato PEX.';
      setError(errorMessage);

      LogService.captureEvent(
        'presentation_creation',
        Module.HOLDER,
        {parameters: {action: 'request_processing_failed'}},
        false,
        err instanceof Error ? err : new Error(String(err)),
      );
    } finally {
      setIsProcessingRequest(false);
    }
  }, [requestInput, credentials, currentIndex]);

  const handleAttributeToggle = useCallback((attribute: string) => {
    if (!consentData) {return;}
    if (consentData.required_attributes.includes(attribute)) {return;}

    setSelectedAttributes(prev => {
      if (prev.includes(attribute)) {
        return prev.filter(a => a !== attribute);
      } else {
        return [...prev, attribute];
      }
    });
  }, [consentData]);

  const handleApproveConsent = useCallback(async () => {
    if (!currentRequest || !consentData) {
      setError('Dados de consentimento não disponíveis');
      setShowConsentModal(false);
      return;
    }

    setShowConsentModal(false);
    setIsProcessingRequest(true);
    setError(null);

    try {
      const credential = credentials[currentIndex];
      const hasPredicates = consentData.predicates && consentData.predicates.length > 0;

      let presentation;
      if (hasPredicates) {
        presentation = await PresentationService.createZKPPresentation(
          credential,
          currentRequest,
          consentData.predicates!,
        );
      } else {
        presentation = await PresentationService.createPresentation(
          credential,
          currentRequest,
          selectedAttributes,
        );
      }

      const presentationJson = JSON.stringify(presentation, null, 2);
      setPresentationOutput(presentationJson);

      if (transportMode === 'clipboard') {
        Clipboard.setString(presentationJson);
        setSuccess('Apresentação criada e copiada para área de transferência!');
      } else {
        setSuccess('Apresentação criada! Escaneie o QR Code abaixo com o verificador.');
      }
      setRequestInput('');
      setCurrentRequest(null);
      setConsentData(null);
      setSelectedAttributes([]);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      const errorMessage = err.message || 'Erro ao criar apresentação';
      setError(errorMessage);
    } finally {
      setIsProcessingRequest(false);
    }
  }, [currentRequest, consentData, credentials, currentIndex, selectedAttributes, transportMode]);

  const handleCancelConsent = useCallback(() => {
    setShowConsentModal(false);
    setConsentData(null);
    setSelectedAttributes([]);
    setCurrentRequest(null);

    LogService.captureEvent(
      'presentation_creation',
      Module.HOLDER,
      {parameters: {action: 'consent_cancelled'}},
      true,
    );
  }, []);

  const handleTransportModeChange = useCallback((mode: TransportMode) => {
    setTransportMode(mode);
    setPresentationOutput(null);
  }, []);

  const handleCopyOutput = useCallback(() => {
    if (presentationOutput) {
      Clipboard.setString(presentationOutput);
      setSuccess('Apresentação copiada para área de transferência!');
      setTimeout(() => setSuccess(null), 3000);
    }
  }, [presentationOutput]);

  return {
    // Credential state
    credentialInput,
    setCredentialInput,
    isLoading,
    error,
    success,
    credentials,
    currentIndex,
    isLoadingCredentials,

    // Presentation state
    requestInput,
    setRequestInput,
    isProcessingRequest,
    consentData,
    showConsentModal,
    selectedAttributes,
    transportMode,
    presentationOutput,

    // Actions
    handleStoreCredential,
    handlePrevious,
    handleNext,
    handleDeleteCredential,
    handleProcessRequest,
    handleAttributeToggle,
    handleApproveConsent,
    handleCancelConsent,
    handleTransportModeChange,
    handleCopyOutput,
  };
}
