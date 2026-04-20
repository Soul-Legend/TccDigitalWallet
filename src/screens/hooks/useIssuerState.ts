import {useEffect, useState, useCallback, useReducer} from 'react';
import * as Clipboard from 'expo-clipboard';
import {useAppStore} from '../../stores/useAppStore';
import {StudentData, TrustedIssuer} from '../../types';
import CredentialService from '../../services/CredentialService';
import StorageService from '../../services/StorageService';
import TrustChainService from '../../services/TrustChainService';
import {Module, CredentialFormat, CredentialFormatType} from '../../utils/constants';

export interface FormErrors {
  nome_completo?: string;
  cpf?: string;
  matricula?: string;
  curso?: string;
  status_matricula?: string;
  data_nascimento?: string;
}

const INITIAL_FORM_DATA: Partial<StudentData> = {
  nome_completo: '',
  cpf: '',
  matricula: '',
  curso: '',
  status_matricula: 'Ativo',
  data_nascimento: '',
  alojamento_indigena: false,
  auxilio_creche: false,
  auxilio_moradia: false,
  bolsa_estudantil: false,
  bolsa_permanencia_mec: false,
  paiq: false,
  moradia_estudantil: false,
  isencao_ru: false,
  isencao_esporte: false,
  isencao_idiomas: false,
  acesso_laboratorios: [],
  acesso_predios: [],
};

type FormState = Partial<StudentData>;
type FormAction =
  | {type: 'updateField'; key: keyof StudentData; value: StudentData[keyof StudentData]}
  | {type: 'reset'}
  | {type: 'replace'; payload: FormState};

function formReducer(state: FormState, action: FormAction): FormState {
  switch (action.type) {
    case 'updateField':
      return {...state, [action.key]: action.value};
    case 'reset':
      return {...INITIAL_FORM_DATA};
    case 'replace':
      return {...action.payload};
    default:
      return state;
  }
}

export function useIssuerState() {
  const setCurrentModule = useAppStore(state => state.setCurrentModule);
  const addLog = useAppStore(state => state.addLog);
  const holderDID = useAppStore(state => state.holderDID);
  const setIssuerDID = useAppStore(state => state.setIssuerDID);

  // Form state — useReducer keeps callbacks stable and avoids the
  // setFormData({...formData, key: value}) pattern that re-creates the
  // updater closure on every render and forces a stale-state hazard.
  const [formData, dispatchForm] = useReducer(formReducer, INITIAL_FORM_DATA, init => ({
    ...init,
  }));
  const updateField = useCallback(
    <K extends keyof StudentData>(key: K, value: StudentData[K]) =>
      dispatchForm({type: 'updateField', key, value}),
    [],
  );
  const setFormData = useCallback(
    (payload: FormState) => dispatchForm({type: 'replace', payload}),
    [],
  );
  const resetForm = useCallback(() => dispatchForm({type: 'reset'}), []);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [credentialFormat, setCredentialFormat] = useState<CredentialFormatType>(CredentialFormat.SD_JWT);
  const [issuedCredential, setIssuedCredential] = useState<string | null>(null);

  // Trust chain state
  const [trustedIssuers, setTrustedIssuers] = useState<TrustedIssuer[]>([]);
  const [childDid, setChildDid] = useState('');
  const [childName, setChildName] = useState('');
  const [selectedParentDid, setSelectedParentDid] = useState<string | null>(null);
  const [isChainLoading, setIsChainLoading] = useState(false);
  const [chainExpanded, setChainExpanded] = useState(false);

  useEffect(() => {
    setCurrentModule(Module.ISSUER);
  }, [setCurrentModule]);

  const loadTrustChain = useCallback(async () => {
    try {
      const issuers = await TrustChainService.getAllIssuers();
      setTrustedIssuers(issuers);
    } catch {}
  }, []);

  useEffect(() => {
    loadTrustChain();
  }, [loadTrustChain]);

  const handleInitializeRoot = useCallback(async () => {
    setIsChainLoading(true);
    setGeneralError(null);
    try {
      const issuerDid = await StorageService.getRawItem('issuer_did');
      const rootDid = issuerDid || 'did:web:ufsc.br';
      await TrustChainService.initializeRootIssuer(rootDid, 'UFSC - Âncora Raiz');
      await loadTrustChain();
      setSuccessMessage('Âncora raiz da cadeia de confiança inicializada!');
      addLog({
        operation: 'trust_chain_init',
        module: Module.ISSUER,
        details: {root_did: rootDid},
        success: true,
      });
    } catch (err) {
      setGeneralError(
        `Erro ao inicializar âncora: ${err instanceof Error ? err.message : String(err)}`,
      );
    } finally {
      setIsChainLoading(false);
    }
  }, [loadTrustChain, addLog]);

  const handleRegisterChild = useCallback(async () => {
    if (!childDid.trim() || !childName.trim()) {
      setGeneralError('DID e nome do emissor filho são obrigatórios');
      return;
    }
    setIsChainLoading(true);
    setGeneralError(null);
    try {
      const parentDid = selectedParentDid
        || (await TrustChainService.getRootIssuer())?.did;
      if (!parentDid) {
        setGeneralError('Emissor pai não selecionado e âncora raiz não inicializada');
        return;
      }
      const parentKey = await TrustChainService.getIssuerPrivateKey(parentDid);
      if (!parentKey) {
        setGeneralError(`Chave privada do emissor pai não encontrada: ${parentDid}`);
        return;
      }
      await TrustChainService.registerChildIssuer(
        parentDid,
        parentKey,
        childDid.trim(),
        childName.trim(),
      );
      await loadTrustChain();
      const registeredName = childName.trim();
      setChildDid('');
      setChildName('');
      setSelectedParentDid(null);
      setSuccessMessage(`Emissor "${registeredName}" registrado sob ${parentDid}!`);
      addLog({
        operation: 'trust_chain_register',
        module: Module.ISSUER,
        details: {
          parent_did: parentDid,
          child_did: childDid.trim(),
          child_name: registeredName,
        },
        success: true,
      });
    } catch (err) {
      setGeneralError(
        `Erro ao registrar emissor: ${err instanceof Error ? err.message : String(err)}`,
      );
    } finally {
      setIsChainLoading(false);
    }
  }, [childDid, childName, selectedParentDid, loadTrustChain, addLog]);

  const validateForm = useCallback((): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.nome_completo || formData.nome_completo.trim() === '') {
      newErrors.nome_completo = 'Nome completo é obrigatório';
    }
    if (!formData.cpf || formData.cpf.trim() === '') {
      newErrors.cpf = 'CPF é obrigatório';
    } else if (!/^\d{11}$/.test(formData.cpf.replace(/\D/g, ''))) {
      newErrors.cpf = 'CPF deve conter 11 dígitos';
    }
    if (!formData.matricula || formData.matricula.trim() === '') {
      newErrors.matricula = 'Matrícula é obrigatória';
    }
    if (!formData.curso || formData.curso.trim() === '') {
      newErrors.curso = 'Curso é obrigatório';
    }
    if (!formData.status_matricula) {
      newErrors.status_matricula = 'Status de matrícula é obrigatório';
    }
    if (!formData.data_nascimento || formData.data_nascimento.trim() === '') {
      newErrors.data_nascimento = 'Data de nascimento é obrigatória';
    } else if (!/^\d{4}-\d{2}-\d{2}$/.test(formData.data_nascimento)) {
      newErrors.data_nascimento =
        'Data de nascimento deve estar no formato AAAA-MM-DD';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  const handleIssueCredential = useCallback(async () => {
    setSuccessMessage(null);
    setGeneralError(null);
    setIssuedCredential(null);

    if (!validateForm()) {
      setGeneralError('Por favor, corrija os erros no formulário');
      return;
    }

    if (!holderDID) {
      setGeneralError('DID do titular não encontrado. Inicialize o sistema primeiro.');
      return;
    }

    setIsLoading(true);

    try {
      const credential = await CredentialService.issueCredential(
        formData as StudentData,
        holderDID,
        credentialFormat,
      );

      const issuerDID = await StorageService.getRawItem('issuer_did');
      if (issuerDID) {
        setIssuerDID(issuerDID);
      }

      Clipboard.setStringAsync(credential);

      addLog({
        operation: 'credential_issuance',
        module: Module.ISSUER,
        details: {
          algorithm: credentialFormat === CredentialFormat.SD_JWT ? 'EdDSA' : 'CL-Signature',
          did_method: 'did:web',
          format: credentialFormat,
          holder: holderDID,
        },
        success: true,
      });

      setIssuedCredential(credential);
      setSuccessMessage(
        `Credencial ${credentialFormat.toUpperCase()} emitida com sucesso! Token copiado para a área de transferência.`,
      );
      resetForm();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Erro desconhecido';
      setGeneralError(`Erro ao emitir credencial: ${errorMessage}`);

      addLog({
        operation: 'error',
        module: Module.ISSUER,
        details: {
          stack_trace: error instanceof Error ? error.stack : undefined,
          format: credentialFormat,
        },
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
      });
    } finally {
      setIsLoading(false);
    }
  }, [formData, holderDID, credentialFormat, validateForm, addLog, setIssuerDID, resetForm]);

  const handleCopyCredential = useCallback(() => {
    if (issuedCredential) {
      Clipboard.setStringAsync(issuedCredential);
      setSuccessMessage('Token copiado para a área de transferência!');
    }
  }, [issuedCredential]);

  const toggleChainExpanded = useCallback(() => {
    setChainExpanded(prev => !prev);
  }, []);

  return {
    // Form state
    formData,
    setFormData,
    updateField,
    resetForm,
    errors,
    isLoading,
    successMessage,
    generalError,
    credentialFormat,
    setCredentialFormat,
    issuedCredential,

    // Trust chain state
    trustedIssuers,
    childDid,
    setChildDid,
    childName,
    setChildName,
    selectedParentDid,
    setSelectedParentDid,
    isChainLoading,
    chainExpanded,

    // Actions
    handleInitializeRoot,
    handleRegisterChild,
    handleIssueCredential,
    handleCopyCredential,
    toggleChainExpanded,
  };
}
