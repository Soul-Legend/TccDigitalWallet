import {useEffect, useState, useCallback} from 'react';
import * as Clipboard from 'expo-clipboard';
import {useAppStore} from '../../stores/useAppStore';
import {Scenario, PresentationExchangeRequest, ValidationResult} from '../../types';
import {TransportMode} from '../../services/TransportService';
import CryptoService from '../../services/CryptoService';

/**
 * Pre-configured verification scenarios.
 *
 * IDs align with `src/services/verification/ScenarioCatalog.ts`.
 * The election_id for the `elections` scenario is generated freshly
 * when the user selects it (see `handleSelectScenario`).
 */
export const SCENARIOS: readonly Scenario[] = [
  {
    id: 'ru',
    name: 'Restaurante Universitário',
    description: 'Validar vínculo e isenção tarifária com divulgação seletiva (SD-JWT)',
    type: 'selective_disclosure',
    requested_attributes: ['status_matricula', 'isencao_ru'],
  },
  {
    id: 'elections',
    name: 'Eleições',
    description: 'Validar elegibilidade com prevenção de voto duplicado (ZKP + Nullifier)',
    type: 'zkp_eligibility',
    requested_attributes: ['status_matricula'],
  },
  {
    id: 'lab_access',
    name: 'Laboratórios',
    description: 'Validar permissões de acesso físico específicas',
    type: 'access_control',
    requested_attributes: ['acesso_laboratorios', 'acesso_predios'],
  },
  {
    id: 'age_verification',
    name: 'Maioridade',
    description: 'Validar maioridade civil sem revelar data de nascimento (Range Proof)',
    type: 'range_proof',
    predicates: [
      {attribute: 'data_nascimento', p_type: '>=', value: 18},
    ],
  },
];

export function useVerifierState() {
  const setCurrentModule = useAppStore(state => state.setCurrentModule);

  const [selectedScenario, setSelectedScenario] = useState<Scenario | null>(null);
  const [generatedRequest, setGeneratedRequest] = useState<string | null>(null);
  const [presentationInput, setPresentationInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [labInput, setLabInput] = useState('');
  const [transportMode, setTransportMode] = useState<TransportMode>('clipboard');

  useEffect(() => {
    setCurrentModule('verificador');
  }, [setCurrentModule]);

  const generatePEXRequest = useCallback((scenario: Scenario): PresentationExchangeRequest => {
    const challenge = `challenge_${Date.now()}_${CryptoService.generateNonce().slice(0, 16)}`;

    const baseRequest: PresentationExchangeRequest = {
      type: 'PresentationExchange',
      version: '1.0.0',
      challenge,
      presentation_definition: {
        id: `pd_${scenario.id}_${Date.now()}`,
        input_descriptors: [
          {
            id: `input_${scenario.id}`,
            name: scenario.name,
            purpose: scenario.description,
            constraints: {
              fields: (scenario.requested_attributes || []).map(attr => ({
                path: [`$.credentialSubject.${attr}`],
                predicate: 'required' as const,
              })),
              limit_disclosure: 'required',
            },
          },
        ],
      },
    };

    if (scenario.id === 'elections' && scenario.challenge_data?.election_id) {
      baseRequest.election_id = scenario.challenge_data.election_id;
    }

    if (scenario.id === 'lab_access' && labInput.trim()) {
      baseRequest.resource_id = labInput.trim();
    }

    if (scenario.predicates) {
      baseRequest.predicates = scenario.predicates.map(p => ({
        attribute: p.attribute,
        p_type: p.p_type,
        value: p.value,
      }));
    }

    return baseRequest;
  }, [labInput]);

  const handleSelectScenario = useCallback(async (scenario: Scenario) => {
    const liveScenario: Scenario =
      scenario.id === 'elections'
        ? {
            ...scenario,
            challenge_data: {election_id: `eleicao_${Date.now()}`},
          }
        : scenario;
    setSelectedScenario(liveScenario);
    setGeneratedRequest(null);
    setValidationResult(null);
    setPresentationInput('');
    setError(null);
    setSuccess(null);
    setIsGenerating(true);

    try {
      const request = generatePEXRequest(liveScenario);
      const requestJson = JSON.stringify(request, null, 2);
      setGeneratedRequest(requestJson);
      setSuccess('Requisição gerada com sucesso!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Erro ao gerar requisição');
    } finally {
      setIsGenerating(false);
    }
  }, [generatePEXRequest]);

  const handleCopyRequest = useCallback(() => {
    if (generatedRequest) {
      Clipboard.setStringAsync(generatedRequest);
      setSuccess('Requisição copiada para área de transferência!');
      setTimeout(() => setSuccess(null), 3000);
    }
  }, [generatedRequest]);

  const handleValidatePresentation = useCallback(async () => {
    if (!presentationInput.trim()) {
      setError('Por favor, cole uma apresentação válida');
      return;
    }

    if (!selectedScenario) {
      setError('Selecione um cenário primeiro');
      return;
    }

    if (!generatedRequest) {
      setError('Gere uma requisição primeiro');
      return;
    }

    setIsValidating(true);
    setError(null);
    setSuccess(null);
    setValidationResult(null);

    try {
      const presentation = JSON.parse(presentationInput.trim());
      const pexRequest = JSON.parse(generatedRequest);

      const VerificationService = (await import('../../services/VerificationService')).default;

      const result = await VerificationService.validatePresentation(
        presentation,
        pexRequest,
      );

      setValidationResult(result);

      if (result.valid) {
        setSuccess('Apresentação validada com sucesso!');
      } else {
        setError(
          result.errors?.join(', ') || 'Apresentação inválida',
        );
      }

      setTimeout(() => {
        setSuccess(null);
        setError(null);
      }, 5000);
    } catch (err: any) {
      setError(err.message || 'Erro ao validar apresentação. Verifique o formato.');
    } finally {
      setIsValidating(false);
    }
  }, [presentationInput, selectedScenario, generatedRequest]);

  const handleReset = useCallback(() => {
    setSelectedScenario(null);
    setGeneratedRequest(null);
    setPresentationInput('');
    setValidationResult(null);
    setError(null);
    setSuccess(null);
    setLabInput('');
  }, []);

  const handleTransportModeChange = useCallback((mode: TransportMode) => {
    setTransportMode(mode);
  }, []);

  return {
    scenarios: SCENARIOS,
    selectedScenario,
    generatedRequest,
    presentationInput,
    setPresentationInput,
    isGenerating,
    isValidating,
    error,
    success,
    validationResult,
    labInput,
    setLabInput,
    transportMode,

    handleSelectScenario,
    handleCopyRequest,
    handleValidatePresentation,
    handleReset,
    handleTransportModeChange,
  };
}
