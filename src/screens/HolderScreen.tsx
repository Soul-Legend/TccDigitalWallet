import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {MaterialCommunityIcons} from '@expo/vector-icons';
import {
  LoadingIndicator,
  ErrorMessage,
  SuccessMessage,
  CredentialCard,
  ConsentModal,
  TransportModeSelector,
} from '../components';
import QRCode from 'react-native-qrcode-svg';
import {useHolderState} from './hooks/useHolderState';
import {getTheme, scaleFontSize} from '../utils/theme';
import type {Theme} from '../utils/theme';

const HolderScreen: React.FC = () => {
  const theme = getTheme();
  const styles = createStyles(theme);

  const {
    credentialInput,
    setCredentialInput,
    isLoading,
    error,
    success,
    credentials,
    isLoadingCredentials,
    requestInput,
    setRequestInput,
    isProcessingRequest,
    consentData,
    showConsentModal,
    selectedAttributes,
    transportMode,
    presentationOutput,
    handleStoreCredential,
    handleDeleteCredential,
    handleProcessRequest,
    handleAttributeToggle,
    handleApproveConsent,
    handleCancelConsent,
    handleTransportModeChange,
    handleCopyOutput,
  } = useHolderState();

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{flex: 1}}>
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.content}>
        <Text style={styles.title}>Módulo Titular</Text>
        <Text style={styles.subtitle}>
          Armazene e visualize suas credenciais acadêmicas
        </Text>

        {/* Credential Input Section */}
        <View style={styles.inputSection}>
          <Text style={styles.sectionTitle}>Adicionar Credencial</Text>
          <TextInput
            style={styles.input}
            placeholder="Cole sua credencial aqui (SD-JWT ou AnonCreds)"
            placeholderTextColor={theme.colors.textDisabled}
            multiline
            numberOfLines={4}
            value={credentialInput}
            onChangeText={setCredentialInput}
            editable={!isLoading}
            accessibilityLabel="Campo de entrada de credencial"
          />
          <TouchableOpacity
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={handleStoreCredential}
            disabled={isLoading}
            accessibilityLabel={isLoading ? 'Processando credencial' : 'Armazenar credencial'}>
            <Text style={styles.buttonText}>
              {isLoading ? 'Processando...' : 'Armazenar Credencial'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Loading Indicator */}
        {isLoading && (
          <LoadingIndicator message="Validando e armazenando credencial..." />
        )}

        {/* Error Message */}
        {error && <ErrorMessage message={error} />}

        {/* Success Message */}
        {success && <SuccessMessage message={success} />}

        {/* Presentation Request Section */}
        {credentials.length > 0 && (
          <>
            {/* Transport Mode Selector */}
            <TransportModeSelector
              selectedMode={transportMode}
              onSelectMode={handleTransportModeChange}
              disabled={isProcessingRequest}
            />

            <View style={styles.requestSection}>
              <Text style={styles.sectionTitle}>Processar Requisição de Apresentação</Text>
              <Text style={styles.sectionSubtitle}>
                Cole uma requisição PEX para criar uma apresentação
              </Text>
              <TextInput
                style={styles.input}
                placeholder="Cole a requisição PEX aqui"
                placeholderTextColor={theme.colors.textDisabled}
                multiline
                numberOfLines={4}
                value={requestInput}
                onChangeText={setRequestInput}
                editable={!isProcessingRequest}
                accessibilityLabel="Campo de requisição PEX"
              />
              <TouchableOpacity
                style={[styles.button, isProcessingRequest && styles.buttonDisabled]}
                onPress={handleProcessRequest}
                disabled={isProcessingRequest}
                accessibilityLabel={isProcessingRequest ? 'Processando requisição' : 'Processar requisição'}>
                <Text style={styles.buttonText}>
                  {isProcessingRequest ? 'Processando...' : 'Processar Requisição'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Presentation Output (QR Code or Text) */}
            {presentationOutput && (
              <View style={styles.presentationOutputSection}>
                <Text style={styles.sectionTitle}>Apresentação Gerada</Text>
                {transportMode === 'qrcode' ? (
                  <View style={styles.qrContainer}>
                    <QRCode
                      value={presentationOutput}
                      size={220}
                      backgroundColor={theme.colors.surface}
                      color={theme.colors.primary}
                    />
                    <Text style={styles.qrHint}>
                      Escaneie com o módulo Verificador
                    </Text>
                  </View>
                ) : null}
                <TouchableOpacity
                  style={styles.copyOutputButton}
                  onPress={handleCopyOutput}
                  accessibilityLabel="Copiar apresentação">
                  <View style={{flexDirection: 'row', alignItems: 'center', gap: 4}}>
                    <MaterialCommunityIcons name="clipboard-text" size={16} color={theme.colors.surface} />
                    <Text style={styles.copyOutputButtonText}>Copiar Apresentação</Text>
                  </View>
                </TouchableOpacity>
              </View>
            )}
          </>
        )}

        {/* Consent Modal */}
        <ConsentModal
          visible={showConsentModal}
          consentData={consentData}
          selectedAttributes={selectedAttributes}
          isGenerating={isProcessingRequest}
          onAttributeToggle={handleAttributeToggle}
          onApprove={handleApproveConsent}
          onCancel={handleCancelConsent}
        />

        {/* Credentials Display Section */}
        {isLoadingCredentials ? (
          <LoadingIndicator message="Carregando credenciais..." />
        ) : credentials.length > 0 ? (
          <View style={styles.credentialsSection}>
            <View style={styles.navigationHeader}>
              <Text style={styles.sectionTitle}>Minhas Credenciais</Text>
              <Text style={styles.credentialCounter}>
                {credentials.length} credencial(is)
              </Text>
            </View>

            {/* Credential List */}
            <FlatList
              data={credentials}
              keyExtractor={(_item, index) => `credential-${index}`}
              scrollEnabled={false}
              renderItem={({item, index}) => (
                <View style={styles.credentialItemContainer}>
                  <CredentialCard credential={item} />
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => handleDeleteCredential(index)}
                    accessibilityLabel={`Excluir credencial ${index + 1}`}>
                    <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4}}>
                      <MaterialCommunityIcons name="delete" size={16} color={theme.colors.surface} />
                      <Text style={styles.deleteButtonText}>Excluir Credencial</Text>
                    </View>
                  </TouchableOpacity>
                </View>
              )}
              ItemSeparatorComponent={() => <View style={{height: theme.spacing.md}} />}
            />
          </View>
        ) : (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="clipboard-text" size={64} color={theme.colors.textSecondary} style={{marginBottom: theme.spacing.md}} />
            <Text style={styles.emptyStateText}>
              Nenhuma credencial armazenada
            </Text>
            <Text style={styles.emptyStateSubtext}>
              Cole uma credencial acima para começar
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
    </KeyboardAvoidingView>
  );
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    content: {
      padding: theme.spacing.lg,
    },
    title: {
      fontSize: scaleFontSize(theme.typography.fontSizeTitle + 4),
      fontWeight: 'bold',
      color: theme.colors.primary,
      marginBottom: theme.spacing.sm,
    },
    subtitle: {
      fontSize: scaleFontSize(theme.typography.fontSizeLarge),
      color: theme.colors.textSecondary,
      marginBottom: theme.spacing.lg,
    },
    inputSection: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.medium,
      padding: theme.spacing.md,
      marginBottom: theme.spacing.md,
      ...(theme.shadows.medium as any),
    },
    requestSection: {
      backgroundColor: theme.colors.warningLight,
      borderRadius: theme.borderRadius.medium,
      padding: theme.spacing.md,
      marginBottom: theme.spacing.md,
      borderWidth: 1,
      borderColor: theme.colors.warning,
      ...(theme.shadows.medium as any),
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
    input: {
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.medium,
      padding: theme.spacing.sm + theme.spacing.xs,
      fontSize: scaleFontSize(theme.typography.fontSizeBase),
      color: theme.colors.text,
      backgroundColor: theme.colors.background,
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
    credentialsSection: {
      marginTop: theme.spacing.lg,
    },
    navigationHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: theme.spacing.sm + theme.spacing.xs,
    },
    credentialCounter: {
      fontSize: scaleFontSize(theme.typography.fontSizeBase),
      color: theme.colors.textSecondary,
      fontWeight: '500',
    },
    credentialItemContainer: {
      marginBottom: theme.spacing.xs,
    },
    deleteButton: {
      backgroundColor: theme.colors.error,
      borderRadius: theme.borderRadius.medium,
      padding: theme.spacing.sm + theme.spacing.xs,
      alignItems: 'center',
      marginTop: theme.spacing.sm,
    },
    deleteButtonText: {
      color: theme.colors.surface,
      fontSize: scaleFontSize(theme.typography.fontSizeBase),
      fontWeight: '600',
    },
    emptyState: {
      alignItems: 'center',
      justifyContent: 'center',
      padding: theme.spacing.xl + theme.spacing.sm,
      marginTop: theme.spacing.xl + theme.spacing.sm,
    },
    emptyStateIcon: {
      fontSize: scaleFontSize(64),
      marginBottom: theme.spacing.md,
    },
    emptyStateText: {
      fontSize: scaleFontSize(18),
      fontWeight: '600',
      color: theme.colors.textSecondary,
      marginBottom: theme.spacing.sm,
    },
    emptyStateSubtext: {
      fontSize: scaleFontSize(theme.typography.fontSizeBase),
      color: theme.colors.textDisabled,
      textAlign: 'center',
    },
    presentationOutputSection: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.medium,
      padding: theme.spacing.md,
      marginBottom: theme.spacing.md,
      ...(theme.shadows.medium as any),
    },
    qrContainer: {
      alignItems: 'center',
      padding: theme.spacing.lg,
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
    copyOutputButton: {
      backgroundColor: theme.colors.secondary,
      borderRadius: theme.borderRadius.medium,
      padding: theme.spacing.sm + theme.spacing.xs,
      alignItems: 'center',
    },
    copyOutputButtonText: {
      color: theme.colors.surface,
      fontSize: scaleFontSize(theme.typography.fontSizeBase),
      fontWeight: '600',
    },
  });

export default HolderScreen;
