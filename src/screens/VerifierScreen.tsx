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
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{flex: 1}}>
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
                <Text style={styles.scenarioName}>{scenario.name}</Text>
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
                    <View style={{flexDirection: 'row', alignItems: 'center', gap: 4}}>
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
                <MaterialCommunityIcons
                  name={validationResult.valid ? 'check-circle' : 'close-circle'}
                  size={48}
                  color={validationResult.valid ? theme.colors.success : theme.colors.error}
                  style={styles.validationIcon}
                />
                <Text style={styles.validationTitle}>
                  {validationResult.valid
                    ? 'Apresentação Válida'
                    : 'Apresentação Inválida'}
                </Text>

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
    padding: theme.spacing.md,
    paddingBottom: theme.spacing.xl + 16,
  },
  title: {
    fontSize: scaleFontSize(32),
    fontWeight: '800',
    color: theme.colors.primaryDark,
    marginBottom: theme.spacing.sm,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: scaleFontSize(theme.typography.fontSizeLarge),
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.lg,
  },
  scenarioSection: {
    marginBottom: theme.spacing.md,
  },
  sectionTitle: {
    fontSize: scaleFontSize(theme.typography.fontSizeXLarge),
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  sectionSubtitle: {
    fontSize: scaleFontSize(theme.typography.fontSizeBase),
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
  },
  scenarioCard: {
    backgroundColor: theme.colors.surfaceContainerLowest,
    borderRadius: theme.borderRadius.large,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
    ...theme.shadows.small as object,
    borderWidth: 1,
    borderColor: 'rgba(195,198,213,0.2)',
  },
  scenarioName: {
    fontSize: scaleFontSize(18),
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  scenarioDescription: {
    fontSize: scaleFontSize(theme.typography.fontSizeBase),
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
    lineHeight: 20,
  },
  scenarioTypeBadge: {
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.surfaceContainerHighest,
    borderRadius: 20,
    paddingHorizontal: theme.spacing.sm + 4,
    paddingVertical: theme.spacing.xs,
  },
  scenarioTypeText: {
    fontSize: scaleFontSize(theme.typography.fontSizeSmall),
    color: theme.colors.textSecondary,
    fontWeight: '600',
  },
  selectedScenarioHeader: {
    backgroundColor: theme.colors.successLight,
    borderRadius: theme.borderRadius.large,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectedScenarioInfo: {
    flex: 1,
  },
  selectedScenarioName: {
    fontSize: scaleFontSize(theme.typography.fontSizeXLarge),
    fontWeight: 'bold',
    color: theme.colors.success,
    marginBottom: theme.spacing.xs,
  },
  selectedScenarioDescription: {
    fontSize: scaleFontSize(theme.typography.fontSizeBase),
    color: theme.colors.success,
  },
  resetButton: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.small,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.success,
  },
  resetButtonText: {
    color: theme.colors.success,
    fontSize: scaleFontSize(theme.typography.fontSizeBase),
    fontWeight: '600',
  },
  labInputSection: {
    backgroundColor: theme.colors.warningLight,
    borderRadius: theme.borderRadius.large,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.warning,
  },
  challengeSection: {
    backgroundColor: theme.colors.surfaceContainerLow,
    borderRadius: theme.borderRadius.large,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  challengeDisplay: {
    backgroundColor: theme.colors.surfaceContainerHighest,
    borderRadius: theme.borderRadius.small,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    maxHeight: 200,
  },
  challengeScroll: {
    maxHeight: 180,
  },
  challengeText: {
    fontSize: scaleFontSize(theme.typography.fontSizeSmall),
    fontFamily: 'monospace',
    color: theme.colors.textSecondary,
  },
  copyButton: {
    backgroundColor: theme.colors.secondaryContainer,
    borderRadius: theme.borderRadius.small,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  copyButtonText: {
    color: theme.colors.onSecondaryContainer,
    fontSize: scaleFontSize(theme.typography.fontSizeBase),
    fontWeight: '600',
  },
  presentationSection: {
    backgroundColor: theme.colors.surfaceContainerLow,
    borderRadius: theme.borderRadius.large,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  input: {
    borderWidth: 0,
    borderRadius: theme.borderRadius.small,
    padding: theme.spacing.md,
    fontSize: scaleFontSize(theme.typography.fontSizeBase),
    color: theme.colors.text,
    backgroundColor: theme.colors.surfaceContainerHighest,
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: theme.spacing.sm,
  },
  button: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.small,
    paddingVertical: theme.spacing.sm + 4,
    paddingHorizontal: theme.spacing.lg,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  buttonDisabled: {
    backgroundColor: theme.colors.textDisabled,
  },
  buttonText: {
    color: theme.colors.onPrimary,
    fontSize: scaleFontSize(theme.typography.fontSizeLarge),
    fontWeight: 'bold',
  },
  validationResult: {
    borderRadius: theme.borderRadius.large,
    padding: theme.spacing.lg,
    marginTop: theme.spacing.md,
    alignItems: 'center',
    borderLeftWidth: 4,
  },
  validationSuccess: {
    backgroundColor: theme.colors.surfaceContainerLowest,
    borderLeftColor: theme.colors.tertiaryContainer,
    ...theme.shadows.small as object,
  },
  validationFailure: {
    backgroundColor: theme.colors.errorLight,
    borderLeftColor: theme.colors.error,
  },
  validationIcon: {
    fontSize: scaleFontSize(48),
    marginBottom: theme.spacing.sm,
  },
  validationTitle: {
    fontSize: scaleFontSize(theme.typography.fontSizeXLarge),
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  validationErrors: {
    marginTop: theme.spacing.sm,
    alignSelf: 'stretch',
  },
  validationErrorText: {
    fontSize: scaleFontSize(theme.typography.fontSizeBase),
    color: theme.colors.error,
    marginBottom: theme.spacing.xs,
  },
  trustChainStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: theme.spacing.sm,
    paddingTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.divider,
  },
  trustChainIcon: {
    fontSize: scaleFontSize(theme.typography.fontSizeLarge),
    marginRight: theme.spacing.sm,
  },
  trustChainText: {
    fontSize: scaleFontSize(theme.typography.fontSizeBase),
    fontWeight: '600',
  },
  trustChainValid: {
    color: theme.colors.success,
  },
  trustChainInvalid: {
    color: theme.colors.error,
  },
  qrContainer: {
    alignItems: 'center',
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.medium,
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.divider,
  },
  qrHint: {
    fontSize: scaleFontSize(theme.typography.fontSizeBase),
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.sm,
    textAlign: 'center',
  },
});

export default VerifierScreen;
