import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {MaterialCommunityIcons} from '@expo/vector-icons';
import {LoadingIndicator, ErrorMessage, SuccessMessage, TransportModeSelector} from '../components';
import QRCode from 'react-native-qrcode-svg';
import {getTheme, scaleFontSize} from '../utils/theme';
import type {Theme} from '../utils/theme';
import {useVerifierState} from './hooks/useVerifierState';

const getScenarioIcon = (id: string): string => {
  const icons: Record<string, string> = {
    ru: 'food-apple',
    elections: 'vote',
    lab_access: 'flask',
    age_verification: 'account-clock',
  };
  return icons[id] || 'help-circle';
};

const VerifierScreen: React.FC = () => {
  const theme = getTheme();
  const styles = createStyles(theme);

  const {
    scenarios,
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
  } = useVerifierState();

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex1}>
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.content}>
        <Text style={styles.title}>Verificador de Credenciais</Text>
        <Text style={styles.subtitle}>
          Valide apresentações verificáveis e controle acesso
        </Text>

        {/* Transport Mode Selector */}
        <TransportModeSelector
          selectedMode={transportMode}
          onSelectMode={handleTransportModeChange}
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
                onPress={() => handleSelectScenario(scenario)}
                accessibilityLabel={`Selecionar cenário ${scenario.name}`}>
                <View style={styles.scenarioIconRow}>
                  <View style={styles.scenarioIconCircle}>
                    <MaterialCommunityIcons name={getScenarioIcon(scenario.id) as any} size={24} color={theme.colors.primary} />
                  </View>
                  <Text style={styles.scenarioName}>{scenario.name}</Text>
                </View>
                <Text style={styles.scenarioDescription}>
                  {scenario.description}
                </Text>
                <View style={styles.scenarioTypeBadge}>
                  <Text style={styles.scenarioTypeText}>
                    {scenario.type === 'selective_disclosure' && <><MaterialCommunityIcons name="lock" size={14} color={theme.colors.secondary} /> SD-JWT</>}
                    {scenario.type === 'zkp_eligibility' && <><MaterialCommunityIcons name="shield-lock" size={14} color={theme.colors.secondary} /> ZKP</>}
                    {scenario.type === 'range_proof' && <><MaterialCommunityIcons name="chart-bar" size={14} color={theme.colors.secondary} /> Range Proof</>}
                    {scenario.type === 'access_control' && <><MaterialCommunityIcons name="door" size={14} color={theme.colors.secondary} /> Controle de Acesso</>}
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
                onPress={handleReset}
                accessibilityLabel="Voltar para seleção de cenários">
                <Text style={styles.resetButtonText}><MaterialCommunityIcons name="chevron-left" size={16} color={theme.colors.success} /> Voltar</Text>
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
                  placeholderTextColor={theme.colors.textDisabled}
                  value={labInput}
                  onChangeText={setLabInput}
                  accessibilityLabel="Especifique o laboratório ou prédio"
                />
                <TouchableOpacity
                  style={[styles.button, !labInput.trim() && styles.buttonDisabled]}
                  onPress={() => handleSelectScenario(selectedScenario)}
                  disabled={!labInput.trim()}
                  accessibilityLabel="Gerar requisição de verificação">
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
                      backgroundColor={theme.colors.surface}
                      color={theme.colors.primary}
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
                    onPress={handleCopyRequest}
                    accessibilityLabel="Copiar requisição para área de transferência">
                    <View style={styles.buttonContent}>
                      <MaterialCommunityIcons name="clipboard-text" size={16} color={theme.colors.surface} />
                      <Text style={styles.copyButtonText}>Copiar para Área de Transferência</Text>
                    </View>
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
                  placeholderTextColor={theme.colors.textDisabled}
                  multiline
                  numberOfLines={6}
                  value={presentationInput}
                  onChangeText={setPresentationInput}
                  editable={!isValidating}
                  accessibilityLabel="Cole a apresentação aqui"
                />
                <TouchableOpacity
                  style={[styles.button, isValidating && styles.buttonDisabled]}
                  onPress={handleValidatePresentation}
                  disabled={isValidating}
                  accessibilityLabel="Validar apresentação">
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
                <View style={[styles.validationIconCircle, {backgroundColor: validationResult.valid ? theme.colors.tertiaryFixed : theme.colors.errorLight}]}>
                  <MaterialCommunityIcons
                    name={validationResult.valid ? 'check-bold' : 'close-thick'}
                    size={24}
                    color={validationResult.valid ? theme.colors.tertiary : theme.colors.error}
                  />
                </View>
                <Text style={styles.validationTitle}>
                  {validationResult.valid
                    ? 'Apresentação Válida'
                    : 'Apresentação Inválida'}
                </Text>
                {validationResult.valid && (
                  <Text style={styles.validationMetadata}>Assinaturas verificadas com sucesso</Text>
                )}

                {/* Trust Chain Status */}
                {validationResult.trust_chain_valid !== undefined && (
                  <View style={styles.trustChainStatus}>
                    <MaterialCommunityIcons
                      name={validationResult.trust_chain_valid ? 'link-variant' : 'link-variant-off'}
                      size={20}
                      color={validationResult.trust_chain_valid ? theme.colors.success : theme.colors.error}
                      style={styles.trustChainIcon}
                    />
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
    </KeyboardAvoidingView>
  );
};

const createStyles = (theme: Theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    padding: 16,
    paddingBottom: 48,
  },
  title: {
    fontSize: scaleFontSize(32),
    fontWeight: '900',
    color: theme.colors.primary,
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: scaleFontSize(14),
    color: theme.colors.textSecondary,
    marginBottom: 16,
    lineHeight: 20,
  },
  scenarioSection: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: scaleFontSize(20),
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: scaleFontSize(14),
    color: theme.colors.textSecondary,
    marginBottom: 8,
  },
  scenarioCard: {
    backgroundColor: theme.colors.surfaceContainerLowest,
    borderRadius: 12,
    padding: 24,
    marginBottom: 12,
    ...theme.shadows.small as object,
  },
  scenarioName: {
    fontSize: scaleFontSize(18),
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 8,
    flex: 1,
  },
  scenarioDescription: {
    fontSize: scaleFontSize(14),
    color: theme.colors.textSecondary,
    marginBottom: 8,
    lineHeight: 20,
  },
  scenarioTypeBadge: {
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.surfaceContainerHighest,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  scenarioTypeText: {
    fontSize: scaleFontSize(12),
    color: theme.colors.textSecondary,
    fontWeight: '600',
  },
  selectedScenarioHeader: {
    backgroundColor: theme.colors.surfaceContainerLow,
    borderRadius: 12,
    padding: 20,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.tertiary,
  },
  selectedScenarioInfo: {
    flex: 1,
  },
  selectedScenarioName: {
    fontSize: scaleFontSize(20),
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 4,
  },
  selectedScenarioDescription: {
    fontSize: scaleFontSize(14),
    color: theme.colors.textSecondary,
  },
  resetButton: {
    backgroundColor: theme.colors.surfaceContainerLowest,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  resetButtonText: {
    color: theme.colors.primary,
    fontSize: scaleFontSize(14),
    fontWeight: '600',
  },
  labInputSection: {
    backgroundColor: theme.colors.surfaceContainerLow,
    borderRadius: 12,
    padding: 20,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.secondary,
  },
  challengeSection: {
    backgroundColor: theme.colors.surfaceContainerLow,
    borderRadius: 12,
    padding: 20,
    marginBottom: 12,
  },
  challengeDisplay: {
    backgroundColor: theme.colors.surfaceContainerHighest,
    borderRadius: 8,
    padding: 16,
    marginBottom: 8,
    maxHeight: 200,
  },
  challengeScroll: {
    maxHeight: 180,
  },
  challengeText: {
    fontSize: scaleFontSize(12),
    fontFamily: 'monospace',
    color: theme.colors.textSecondary,
  },
  copyButton: {
    backgroundColor: theme.colors.secondaryContainer,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  copyButtonText: {
    color: theme.colors.onSecondaryContainer,
    fontSize: scaleFontSize(14),
    fontWeight: '600',
  },
  presentationSection: {
    backgroundColor: theme.colors.surfaceContainerLow,
    borderRadius: 12,
    padding: 20,
    marginBottom: 12,
  },
  input: {
    borderWidth: 0,
    borderRadius: 8,
    padding: 16,
    fontSize: scaleFontSize(14),
    color: theme.colors.text,
    backgroundColor: theme.colors.surfaceContainerHighest,
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: 8,
  },
  button: {
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: theme.colors.onPrimary,
    fontSize: scaleFontSize(16),
    fontWeight: '700',
  },
  validationResult: {
    borderRadius: 12,
    padding: 24,
    marginTop: 12,
    alignItems: 'center',
    borderLeftWidth: 4,
    ...theme.shadows.medium as object,
  },
  validationSuccess: {
    backgroundColor: theme.colors.surfaceContainerLowest,
    borderLeftColor: theme.colors.tertiary,
  },
  validationFailure: {
    backgroundColor: theme.colors.errorLight,
    borderLeftColor: theme.colors.error,
  },
  validationIcon: {
    fontSize: scaleFontSize(48),
    marginBottom: 8,
  },
  validationIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    alignSelf: 'center' as const,
    marginBottom: 16,
  },
  validationMetadata: {
    fontSize: scaleFontSize(14),
    color: theme.colors.textSecondary,
    marginBottom: 8,
  },
  scenarioIconRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    marginBottom: 4,
  },
  scenarioIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#D9E2FF',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginRight: 12,
  },
  validationTitle: {
    fontSize: scaleFontSize(20),
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 8,
  },
  validationErrors: {
    marginTop: 8,
    alignSelf: 'stretch',
  },
  validationErrorText: {
    fontSize: scaleFontSize(14),
    color: theme.colors.error,
    marginBottom: 4,
  },
  trustChainStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
  },
  trustChainIcon: {
    fontSize: scaleFontSize(16),
    marginRight: 8,
  },
  trustChainText: {
    fontSize: scaleFontSize(14),
    fontWeight: '600',
  },
  trustChainValid: {
    color: theme.colors.tertiary,
  },
  trustChainInvalid: {
    color: theme.colors.error,
  },
  qrContainer: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: theme.colors.surfaceContainerLowest,
    borderRadius: 12,
    marginBottom: 8,
  },
  qrHint: {
    fontSize: scaleFontSize(14),
    color: theme.colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
  flex1: {
    flex: 1,
  },
  buttonContent: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 4,
  },
});

export default VerifierScreen;
