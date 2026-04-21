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
        <Text style={styles.title}>Módulo Verificador</Text>
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
    padding: theme.spacing.md + theme.spacing.xs,
  },
  title: {
    fontSize: scaleFontSize(28),
    fontWeight: 'bold',
    color: theme.colors.primary,
    marginBottom: theme.spacing.sm,
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
    fontSize: scaleFontSize(18),
    fontWeight: 'bold',
    color: theme.colors.primary,
    marginBottom: theme.spacing.sm + theme.spacing.xs,
  },
  sectionSubtitle: {
    fontSize: scaleFontSize(theme.typography.fontSizeBase),
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm + theme.spacing.xs,
  },
  scenarioCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.medium,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm + theme.spacing.xs,
    ...(theme.shadows.medium as object),
  },
  scenarioName: {
    fontSize: scaleFontSize(18),
    fontWeight: 'bold',
    color: theme.colors.primary,
    marginBottom: theme.spacing.sm,
  },
  scenarioDescription: {
    fontSize: scaleFontSize(theme.typography.fontSizeBase),
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm + theme.spacing.xs,
    lineHeight: theme.typography.lineHeightBase,
  },
  scenarioTypeBadge: {
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.large,
    paddingHorizontal: theme.spacing.sm + theme.spacing.xs,
    paddingVertical: theme.spacing.xs,
  },
  scenarioTypeText: {
    fontSize: scaleFontSize(theme.typography.fontSizeSmall),
    color: theme.colors.secondary,
    fontWeight: '600',
  },
  selectedScenarioHeader: {
    backgroundColor: theme.colors.successLight,
    borderRadius: theme.borderRadius.medium,
    padding: theme.spacing.md,
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
    borderRadius: theme.borderRadius.medium,
    paddingHorizontal: theme.spacing.sm + theme.spacing.xs,
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
    borderRadius: theme.borderRadius.medium,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.warning,
  },
  challengeSection: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.medium,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    ...(theme.shadows.medium as object),
  },
  challengeDisplay: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.medium,
    padding: theme.spacing.sm + theme.spacing.xs,
    marginBottom: theme.spacing.sm + theme.spacing.xs,
    maxHeight: 200,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  challengeScroll: {
    maxHeight: 180,
  },
  challengeText: {
    fontSize: scaleFontSize(theme.typography.fontSizeSmall),
    fontFamily: 'monospace',
    color: theme.colors.text,
  },
  copyButton: {
    backgroundColor: theme.colors.secondary,
    borderRadius: theme.borderRadius.medium,
    padding: theme.spacing.sm + theme.spacing.xs,
    alignItems: 'center',
  },
  copyButtonText: {
    color: theme.colors.surface,
    fontSize: scaleFontSize(theme.typography.fontSizeBase),
    fontWeight: '600',
  },
  presentationSection: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.medium,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.secondary,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.medium,
    padding: theme.spacing.sm + theme.spacing.xs,
    fontSize: scaleFontSize(theme.typography.fontSizeBase),
    color: theme.colors.text,
    backgroundColor: theme.colors.surface,
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: theme.spacing.sm + theme.spacing.xs,
  },
  button: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.medium,
    padding: theme.spacing.md,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: theme.colors.textDisabled,
  },
  buttonText: {
    color: theme.colors.surface,
    fontSize: scaleFontSize(theme.typography.fontSizeLarge),
    fontWeight: 'bold',
  },
  validationResult: {
    borderRadius: theme.borderRadius.medium,
    padding: theme.spacing.md + theme.spacing.xs,
    marginTop: theme.spacing.md,
    alignItems: 'center',
  },
  validationSuccess: {
    backgroundColor: theme.colors.successLight,
    borderWidth: 2,
    borderColor: theme.colors.success,
  },
  validationFailure: {
    backgroundColor: theme.colors.errorLight,
    borderWidth: 2,
    borderColor: theme.colors.error,
  },
  validationIcon: {
    fontSize: scaleFontSize(48),
    marginBottom: theme.spacing.sm + theme.spacing.xs,
  },
  validationTitle: {
    fontSize: scaleFontSize(theme.typography.fontSizeXLarge),
    fontWeight: 'bold',
    color: theme.colors.primary,
    marginBottom: theme.spacing.sm,
  },
  validationErrors: {
    marginTop: theme.spacing.sm + theme.spacing.xs,
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
    padding: theme.spacing.md + theme.spacing.xs,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.medium,
    marginBottom: theme.spacing.sm + theme.spacing.xs,
    borderWidth: 1,
    borderColor: theme.colors.divider,
  },
  qrHint: {
    fontSize: scaleFontSize(theme.typography.fontSizeBase),
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.sm + theme.spacing.xs,
    textAlign: 'center',
  },
});

export default VerifierScreen;
