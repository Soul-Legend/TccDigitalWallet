import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Clipboard,
} from 'react-native';
import {useAppStore} from '../stores/useAppStore';
import {LoadingIndicator, ErrorMessage, SuccessMessage, TransportModeSelector} from '../components';
import {Scenario, PresentationExchangeRequest, ValidationResult} from '../types';
import {TransportMode} from '../services/TransportService';
import CryptoService from '../services/CryptoService';
import QRCode from 'react-native-qrcode-svg';

// Hoisted: scenarios are immutable presets. The election_id for the
// `elections` scenario is generated freshly when the user selects it (see
// `handleSelectScenario`) so it doesn't get frozen at module load.
//
// IDs are aligned with `src/services/verification/ScenarioCatalog.ts` so the
// UI catalogue and the back-end pipeline share a single naming scheme. The
// human-readable Portuguese labels live here because they are display-only
// concerns (the catalogue would otherwise need an i18n field).
const SCENARIOS: readonly Scenario[] = [
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

const VerifierScreen: React.FC = () => {
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

  // Pre-configured scenarios are hoisted to module scope (see SCENARIOS).
  const scenarios = SCENARIOS;

  /**
   * Handles scenario selection and generates PEX request
   */
  const handleSelectScenario = async (scenario: Scenario) => {
    // Inject a fresh election_id for the elections scenario so each PEX
    // request gets a unique nullifier scope.
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
      // Generate PEX request based on scenario
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
  };

  /**
   * Generates a PEX request for the selected scenario
   */
  const generatePEXRequest = (scenario: Scenario): PresentationExchangeRequest => {
    // SECURITY: PEX challenges must be unpredictable to prevent replay
    // attacks. Use the CSPRNG-backed CryptoService.generateNonce() instead
    // of Math.random (P0 C1 hardening, enforced by ESLint).
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

    // Add scenario-specific data
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
  };

  /**
   * Copies the generated request to clipboard
   */
  const handleCopyRequest = () => {
    if (generatedRequest) {
      Clipboard.setString(generatedRequest);
      setSuccess('Requisição copiada para área de transferência!');
      setTimeout(() => setSuccess(null), 3000);
    }
  };

  /**
   * Validates the pasted presentation
   */
  const handleValidatePresentation = async () => {
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
      // Parse the presentation to validate JSON format
      const presentation = JSON.parse(presentationInput.trim());

      // Parse the generated request
      const pexRequest = JSON.parse(generatedRequest);

      // Import VerificationService dynamically
      const VerificationService = (await import('../services/VerificationService')).default;

      // Validate the presentation
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
  };

  /**
   * Resets the verifier state
   */
  const handleReset = () => {
    setSelectedScenario(null);
    setGeneratedRequest(null);
    setPresentationInput('');
    setValidationResult(null);
    setError(null);
    setSuccess(null);
    setLabInput('');
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Módulo Verificador</Text>
        <Text style={styles.subtitle}>
          Valide apresentações verificáveis e controle acesso
        </Text>

        {/* Transport Mode Selector */}
        <TransportModeSelector
          selectedMode={transportMode}
          onSelectMode={setTransportMode}
          disabled={isGenerating || isValidating}
        />

        {/* Scenario Selector */}
        {!selectedScenario && (
          <View style={styles.scenarioSection}>
            <Text style={styles.sectionTitle}>Selecione um Cenário</Text>
            {scenarios.map(scenario => (
              <TouchableOpacity
                key={scenario.id}
                style={styles.scenarioCard}
                onPress={() => handleSelectScenario(scenario)}>
                <Text style={styles.scenarioName}>{scenario.name}</Text>
                <Text style={styles.scenarioDescription}>
                  {scenario.description}
                </Text>
                <View style={styles.scenarioTypeBadge}>
                  <Text style={styles.scenarioTypeText}>
                    {scenario.type === 'selective_disclosure' && '🔒 SD-JWT'}
                    {scenario.type === 'zkp_eligibility' && '🔐 ZKP'}
                    {scenario.type === 'range_proof' && '📊 Range Proof'}
                    {scenario.type === 'access_control' && '🚪 Controle de Acesso'}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Selected Scenario View */}
        {selectedScenario && (
          <>
            {/* Scenario Header */}
            <View style={styles.selectedScenarioHeader}>
              <View style={styles.selectedScenarioInfo}>
                <Text style={styles.selectedScenarioName}>
                  {selectedScenario.name}
                </Text>
                <Text style={styles.selectedScenarioDescription}>
                  {selectedScenario.description}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.resetButton}
                onPress={handleReset}>
                <Text style={styles.resetButtonText}>← Voltar</Text>
              </TouchableOpacity>
            </View>

            {/* Lab Input for the access-control scenario */}
            {selectedScenario.id === 'lab_access' && !generatedRequest && (
              <View style={styles.labInputSection}>
                <Text style={styles.sectionTitle}>
                  Especifique o Laboratório ou Prédio
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ex: Lab 101, Prédio A"
                  placeholderTextColor="#999"
                  value={labInput}
                  onChangeText={setLabInput}
                />
                <TouchableOpacity
                  style={[styles.button, !labInput.trim() && styles.buttonDisabled]}
                  onPress={() => {
                    if (!labInput.trim()) {
                      setError('Por favor, especifique o laboratório ou prédio');
                      return;
                    }
                    handleSelectScenario(selectedScenario);
                  }}
                  disabled={!labInput.trim()}>
                  <Text style={styles.buttonText}>Gerar Requisição</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Loading Indicator */}
            {isGenerating && (
              <LoadingIndicator message="Gerando requisição PEX..." />
            )}

            {/* Challenge Display */}
            {generatedRequest && (
              <View style={styles.challengeSection}>
                <Text style={styles.sectionTitle}>Requisição Gerada</Text>

                {/* QR Code Display */}
                {transportMode === 'qrcode' && (
                  <View style={styles.qrContainer}>
                    <QRCode
                      value={generatedRequest}
                      size={220}
                      backgroundColor="#ffffff"
                      color="#003366"
                    />
                    <Text style={styles.qrHint}>
                      Escaneie com o módulo Titular
                    </Text>
                  </View>
                )}

                {/* Clipboard / Text Display */}
                {(transportMode === 'clipboard' || transportMode === 'qrcode') && (
                  <View style={styles.challengeDisplay}>
                    <ScrollView
                      style={styles.challengeScroll}
                      nestedScrollEnabled>
                      <Text style={styles.challengeText}>{generatedRequest}</Text>
                    </ScrollView>
                  </View>
                )}

                {transportMode === 'clipboard' && (
                  <TouchableOpacity
                    style={styles.copyButton}
                    onPress={handleCopyRequest}>
                    <Text style={styles.copyButtonText}>
                      📋 Copiar para Área de Transferência
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* Presentation Input */}
            {generatedRequest && (
              <View style={styles.presentationSection}>
                <Text style={styles.sectionTitle}>Validar Apresentação</Text>
                <Text style={styles.sectionSubtitle}>
                  Cole a apresentação recebida do titular
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder="Cole a apresentação aqui"
                  placeholderTextColor="#999"
                  multiline
                  numberOfLines={6}
                  value={presentationInput}
                  onChangeText={setPresentationInput}
                  editable={!isValidating}
                />
                <TouchableOpacity
                  style={[styles.button, isValidating && styles.buttonDisabled]}
                  onPress={handleValidatePresentation}
                  disabled={isValidating}>
                  <Text style={styles.buttonText}>
                    {isValidating ? 'Validando...' : 'Validar Apresentação'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Validation Loading */}
            {isValidating && (
              <LoadingIndicator message="Validando apresentação..." />
            )}

            {/* Validation Result */}
            {validationResult && (
              <View
                style={[
                  styles.validationResult,
                  validationResult.valid
                    ? styles.validationSuccess
                    : styles.validationFailure,
                ]}>
                <Text style={styles.validationIcon}>
                  {validationResult.valid ? '✅' : '❌'}
                </Text>
                <Text style={styles.validationTitle}>
                  {validationResult.valid
                    ? 'Apresentação Válida'
                    : 'Apresentação Inválida'}
                </Text>

                {/* Trust Chain Status */}
                {validationResult.trust_chain_valid !== undefined && (
                  <View style={styles.trustChainStatus}>
                    <Text style={styles.trustChainIcon}>
                      {validationResult.trust_chain_valid ? '🔗' : '⛓️‍💥'}
                    </Text>
                    <Text
                      style={[
                        styles.trustChainText,
                        validationResult.trust_chain_valid
                          ? styles.trustChainValid
                          : styles.trustChainInvalid,
                      ]}>
                      {validationResult.trust_chain_valid
                        ? 'Cadeia de confiança verificada'
                        : 'Emissor fora da cadeia de confiança'}
                    </Text>
                  </View>
                )}

                {validationResult.errors && validationResult.errors.length > 0 && (
                  <View style={styles.validationErrors}>
                    {validationResult.errors.map((err, idx) => (
                      <Text key={idx} style={styles.validationErrorText}>
                        • {err}
                      </Text>
                    ))}
                  </View>
                )}
              </View>
            )}
          </>
        )}

        {/* Error Message */}
        {error && <ErrorMessage message={error} />}

        {/* Success Message */}
        {success && <SuccessMessage message={success} />}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#003366',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
  },
  scenarioSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#003366',
    marginBottom: 12,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  scenarioCard: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  scenarioName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#003366',
    marginBottom: 8,
  },
  scenarioDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    lineHeight: 20,
  },
  scenarioTypeBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#e3f2fd',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  scenarioTypeText: {
    fontSize: 12,
    color: '#1976d2',
    fontWeight: '600',
  },
  selectedScenarioHeader: {
    backgroundColor: '#e8f5e9',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectedScenarioInfo: {
    flex: 1,
  },
  selectedScenarioName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2e7d32',
    marginBottom: 4,
  },
  selectedScenarioDescription: {
    fontSize: 14,
    color: '#558b2f',
  },
  resetButton: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#2e7d32',
  },
  resetButtonText: {
    color: '#2e7d32',
    fontSize: 14,
    fontWeight: '600',
  },
  labInputSection: {
    backgroundColor: '#fff3e0',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#ffb74d',
  },
  challengeSection: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  challengeDisplay: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    maxHeight: 200,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  challengeScroll: {
    maxHeight: 180,
  },
  challengeText: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: '#333',
  },
  copyButton: {
    backgroundColor: '#1976d2',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  copyButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  presentationSection: {
    backgroundColor: '#e1f5fe',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#4fc3f7',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#333',
    backgroundColor: '#ffffff',
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: 12,
  },
  button: {
    backgroundColor: '#003366',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#999',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  validationResult: {
    borderRadius: 8,
    padding: 20,
    marginTop: 16,
    alignItems: 'center',
  },
  validationSuccess: {
    backgroundColor: '#e8f5e9',
    borderWidth: 2,
    borderColor: '#4caf50',
  },
  validationFailure: {
    backgroundColor: '#ffebee',
    borderWidth: 2,
    borderColor: '#f44336',
  },
  validationIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  validationTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#003366',
    marginBottom: 8,
  },
  validationErrors: {
    marginTop: 12,
    alignSelf: 'stretch',
  },
  validationErrorText: {
    fontSize: 14,
    color: '#c62828',
    marginBottom: 4,
  },
  trustChainStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  trustChainIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  trustChainText: {
    fontSize: 14,
    fontWeight: '600',
  },
  trustChainValid: {
    color: '#2e7d32',
  },
  trustChainInvalid: {
    color: '#c62828',
  },
  qrContainer: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  qrHint: {
    fontSize: 14,
    color: '#666',
    marginTop: 12,
    textAlign: 'center',
  },
});

export default VerifierScreen;
