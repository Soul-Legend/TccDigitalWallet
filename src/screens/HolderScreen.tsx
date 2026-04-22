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
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex1}>
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.content}>
        <View style={styles.headerSection}>
          <Text style={styles.title}>Minha Carteira Acadêmica</Text>
          <Text style={styles.subtitle}>
            Gerencie suas credenciais acadêmicas e profissionais emitidas por instituições confiáveis.
          </Text>
        </View>

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
                  <View style={styles.buttonContent}>
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
                    <View style={styles.deleteButtonContent}>
                      <MaterialCommunityIcons name="delete" size={16} color={theme.colors.surface} />
                      <Text style={styles.deleteButtonText}>Excluir Credencial</Text>
                    </View>
                  </TouchableOpacity>
                </View>
              )}
              // eslint-disable-next-line react/no-unstable-nested-components
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
      padding: 16,
      paddingBottom: 48,
    },
    headerSection: {
      paddingTop: 8,
      paddingBottom: 16,
    },
    title: {
      fontSize: scaleFontSize(32),
      fontWeight: '900',
      color: theme.colors.primary,
      letterSpacing: -0.5,
    },
    subtitle: {
      fontSize: scaleFontSize(14),
      color: theme.colors.textSecondary,
      marginTop: 4,
      lineHeight: 20,
    },
    inputSection: {
      backgroundColor: theme.colors.surfaceContainerLow,
      borderRadius: 12,
      padding: 20,
      marginBottom: 12,
    },
    requestSection: {
      backgroundColor: theme.colors.surfaceContainerLow,
      borderRadius: 12,
      padding: 20,
      marginBottom: 12,
      borderLeftWidth: 4,
      borderLeftColor: theme.colors.primary,
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
    input: {
      borderWidth: 0,
      borderRadius: 8,
      padding: 16,
      fontSize: scaleFontSize(14),
      color: theme.colors.text,
      backgroundColor: theme.colors.surfaceContainerLowest,
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
    credentialsSection: {
      marginTop: 16,
    },
    navigationHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    credentialCounter: {
      fontSize: scaleFontSize(14),
      color: theme.colors.textDisabled,
      fontWeight: '500',
    },
    credentialItemContainer: {
      marginBottom: 4,
    },
    deleteButton: {
      backgroundColor: theme.colors.error,
      borderRadius: 12,
      paddingVertical: 10,
      paddingHorizontal: 16,
      alignItems: 'center',
      marginTop: 8,
    },
    deleteButtonText: {
      color: '#FFFFFF',
      fontSize: scaleFontSize(14),
      fontWeight: '600',
    },
    emptyState: {
      alignItems: 'center',
      justifyContent: 'center',
      padding: 40,
      marginTop: 32,
    },
    emptyStateIcon: {
      fontSize: scaleFontSize(64),
      marginBottom: 16,
    },
    emptyStateText: {
      fontSize: scaleFontSize(18),
      fontWeight: '600',
      color: theme.colors.textDisabled,
      marginBottom: 8,
    },
    emptyStateSubtext: {
      fontSize: scaleFontSize(14),
      color: theme.colors.textDisabled,
      textAlign: 'center',
    },
    presentationOutputSection: {
      backgroundColor: theme.colors.surfaceContainerLowest,
      borderRadius: 12,
      padding: 20,
      marginBottom: 12,
      ...theme.shadows.medium as object,
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
    copyOutputButton: {
      backgroundColor: theme.colors.secondaryContainer,
      borderRadius: 12,
      paddingVertical: 12,
      paddingHorizontal: 16,
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 6,
    },
    copyOutputButtonText: {
      color: theme.colors.onSecondaryContainer,
      fontSize: scaleFontSize(14),
      fontWeight: '600',
    },
    flex1: {
      flex: 1,
    },
    buttonContent: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 4,
    },
    deleteButtonContent: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      gap: 4,
    },
  });

export default HolderScreen;
