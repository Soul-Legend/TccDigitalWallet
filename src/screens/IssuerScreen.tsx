import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Switch,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import LoadingIndicator from '../components/LoadingIndicator';
import SuccessMessage from '../components/SuccessMessage';
import ErrorMessage from '../components/ErrorMessage';
import TrustChainSection from '../components/TrustChainSection';
import {useIssuerState} from './hooks/useIssuerState';
import {getTheme, scaleFontSize} from '../utils/theme';
import type {Theme} from '../utils/theme';

const IssuerScreen: React.FC = () => {
  const theme = getTheme();
  const styles = createStyles(theme);

  const {
    formData,
    updateField,
    errors,
    isLoading,
    successMessage,
    generalError,
    credentialFormat,
    setCredentialFormat,
    issuedCredential,
    trustedIssuers,
    childDid,
    setChildDid,
    childName,
    setChildName,
    selectedParentDid,
    setSelectedParentDid,
    isChainLoading,
    chainExpanded,
    handleInitializeRoot,
    handleRegisterChild,
    handleIssueCredential,
    handleCopyCredential,
    toggleChainExpanded,
  } = useIssuerState();

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{flex: 1}}>
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.content}>
        <Text style={styles.title}>Módulo Emissor</Text>
        <Text style={styles.subtitle}>
          Simula a emissão de credenciais pela UFSC
        </Text>

        {generalError && <ErrorMessage message={generalError} />}
        {successMessage && <SuccessMessage message={successMessage} />}

        {/* Trust Chain Management */}
        <TrustChainSection
          expanded={chainExpanded}
          onToggleExpanded={toggleChainExpanded}
          trustedIssuers={trustedIssuers}
          isChainLoading={isChainLoading}
          childDid={childDid}
          onChildDidChange={setChildDid}
          childName={childName}
          onChildNameChange={setChildName}
          selectedParentDid={selectedParentDid}
          onSelectParent={setSelectedParentDid}
          onInitializeRoot={handleInitializeRoot}
          onRegisterChild={handleRegisterChild}
        />

        {/* Credential Format Selector */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Formato da Credencial</Text>
          <View style={styles.statusContainer}>
            <TouchableOpacity
              style={[
                styles.statusButton,
                credentialFormat === 'sd-jwt' && styles.statusButtonActive,
              ]}
              onPress={() => setCredentialFormat('sd-jwt')}
              disabled={isLoading}>
              <Text
                style={[
                  styles.statusButtonText,
                  credentialFormat === 'sd-jwt' && styles.statusButtonTextActive,
                ]}>
                SD-JWT
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.statusButton,
                credentialFormat === 'anoncreds' && styles.statusButtonActive,
              ]}
              onPress={() => setCredentialFormat('anoncreds')}
              disabled={isLoading}>
              <Text
                style={[
                  styles.statusButtonText,
                  credentialFormat === 'anoncreds' && styles.statusButtonTextActive,
                ]}>
                AnonCreds
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Issued Credential Display */}
        {issuedCredential && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Credencial Emitida</Text>
            <Text style={styles.credentialToken} numberOfLines={6}>
              {issuedCredential}
            </Text>
            <TouchableOpacity
              style={styles.copyButton}
              onPress={handleCopyCredential}>
              <Text style={styles.copyButtonText}>Copiar Token</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Required Fields Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Dados Obrigatórios</Text>

          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Nome Completo *</Text>
            <TextInput
              style={[styles.input, errors.nome_completo && styles.inputError]}
              value={formData.nome_completo}
              onChangeText={text =>
                updateField('nome_completo', text)
              }
              placeholder="Digite o nome completo"
              editable={!isLoading}
              accessibilityLabel="Nome completo do estudante"
            />
            {errors.nome_completo && (
              <Text style={styles.errorText}>{errors.nome_completo}</Text>
            )}
          </View>

          <View style={styles.fieldContainer}>
            <Text style={styles.label}>CPF *</Text>
            <TextInput
              style={[styles.input, errors.cpf && styles.inputError]}
              value={formData.cpf}
              onChangeText={text => updateField('cpf', text)}
              placeholder="Digite o CPF (11 dígitos)"
              keyboardType="numeric"
              editable={!isLoading}
              accessibilityLabel="CPF do estudante"
            />
            {errors.cpf && <Text style={styles.errorText}>{errors.cpf}</Text>}
          </View>

          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Matrícula *</Text>
            <TextInput
              style={[styles.input, errors.matricula && styles.inputError]}
              value={formData.matricula}
              onChangeText={text =>
                updateField('matricula', text)
              }
              placeholder="Digite a matrícula"
              editable={!isLoading}
              accessibilityLabel="Matrícula do estudante"
            />
            {errors.matricula && (
              <Text style={styles.errorText}>{errors.matricula}</Text>
            )}
          </View>

          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Curso *</Text>
            <TextInput
              style={[styles.input, errors.curso && styles.inputError]}
              value={formData.curso}
              onChangeText={text => updateField('curso', text)}
              placeholder="Digite o curso"
              editable={!isLoading}
              accessibilityLabel="Curso do estudante"
            />
            {errors.curso && (
              <Text style={styles.errorText}>{errors.curso}</Text>
            )}
          </View>

          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Status de Matrícula *</Text>
            <View style={styles.statusContainer}>
              <TouchableOpacity
                style={[
                  styles.statusButton,
                  formData.status_matricula === 'Ativo' &&
                    styles.statusButtonActive,
                ]}
                onPress={() =>
                  updateField('status_matricula', 'Ativo')
                }
                disabled={isLoading}>
                <Text
                  style={[
                    styles.statusButtonText,
                    formData.status_matricula === 'Ativo' &&
                      styles.statusButtonTextActive,
                  ]}>
                  Ativo
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.statusButton,
                  formData.status_matricula === 'Inativo' &&
                    styles.statusButtonActive,
                ]}
                onPress={() =>
                  updateField('status_matricula', 'Inativo')
                }
                disabled={isLoading}>
                <Text
                  style={[
                    styles.statusButtonText,
                    formData.status_matricula === 'Inativo' &&
                      styles.statusButtonTextActive,
                  ]}>
                  Inativo
                </Text>
              </TouchableOpacity>
            </View>
            {errors.status_matricula && (
              <Text style={styles.errorText}>{errors.status_matricula}</Text>
            )}
          </View>

          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Data de Nascimento *</Text>
            <TextInput
              style={[
                styles.input,
                errors.data_nascimento && styles.inputError,
              ]}
              value={formData.data_nascimento}
              onChangeText={text =>
                updateField('data_nascimento', text)
              }
              placeholder="AAAA-MM-DD"
              editable={!isLoading}
              accessibilityLabel="Data de nascimento do estudante"
            />
            {errors.data_nascimento && (
              <Text style={styles.errorText}>{errors.data_nascimento}</Text>
            )}
          </View>
        </View>

        {/* Benefits Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Benefícios e Programas</Text>

          <View style={styles.switchContainer}>
            <Text style={styles.switchLabel}>Alojamento Indígena</Text>
            <Switch
              value={formData.alojamento_indigena}
              onValueChange={value =>
                updateField('alojamento_indigena', value)
              }
              disabled={isLoading}
              accessibilityLabel="Alojamento Indígena"
              accessibilityRole="switch"
            />
          </View>

          <View style={styles.switchContainer}>
            <Text style={styles.switchLabel}>Auxílio Creche</Text>
            <Switch
              value={formData.auxilio_creche}
              onValueChange={value =>
                updateField('auxilio_creche', value)
              }
              disabled={isLoading}
              accessibilityLabel="Auxílio Creche"
              accessibilityRole="switch"
            />
          </View>

          <View style={styles.switchContainer}>
            <Text style={styles.switchLabel}>Auxílio Moradia</Text>
            <Switch
              value={formData.auxilio_moradia}
              onValueChange={value =>
                updateField('auxilio_moradia', value)
              }
              disabled={isLoading}
              accessibilityLabel="Auxílio Moradia"
              accessibilityRole="switch"
            />
          </View>

          <View style={styles.switchContainer}>
            <Text style={styles.switchLabel}>Bolsa Estudantil</Text>
            <Switch
              value={formData.bolsa_estudantil}
              onValueChange={value =>
                updateField('bolsa_estudantil', value)
              }
              disabled={isLoading}
              accessibilityLabel="Bolsa Estudantil"
              accessibilityRole="switch"
            />
          </View>

          <View style={styles.switchContainer}>
            <Text style={styles.switchLabel}>Bolsa Permanência MEC</Text>
            <Switch
              value={formData.bolsa_permanencia_mec}
              onValueChange={value =>
                updateField('bolsa_permanencia_mec', value)
              }
              disabled={isLoading}
              accessibilityLabel="Bolsa Permanência MEC"
              accessibilityRole="switch"
            />
          </View>

          <View style={styles.switchContainer}>
            <Text style={styles.switchLabel}>PAIQ</Text>
            <Switch
              value={formData.paiq}
              onValueChange={value => updateField('paiq', value)}
              disabled={isLoading}
              accessibilityLabel="PAIQ"
              accessibilityRole="switch"
            />
          </View>

          <View style={styles.switchContainer}>
            <Text style={styles.switchLabel}>Moradia Estudantil</Text>
            <Switch
              value={formData.moradia_estudantil}
              onValueChange={value =>
                updateField('moradia_estudantil', value)
              }
              disabled={isLoading}
              accessibilityLabel="Moradia Estudantil"
              accessibilityRole="switch"
            />
          </View>

          <View style={styles.switchContainer}>
            <Text style={styles.switchLabel}>Isenção RU</Text>
            <Switch
              value={formData.isencao_ru}
              onValueChange={value =>
                updateField('isencao_ru', value)
              }
              disabled={isLoading}
              accessibilityLabel="Isenção RU"
              accessibilityRole="switch"
            />
          </View>

          <View style={styles.switchContainer}>
            <Text style={styles.switchLabel}>Isenção Esporte</Text>
            <Switch
              value={formData.isencao_esporte}
              onValueChange={value =>
                updateField('isencao_esporte', value)
              }
              disabled={isLoading}
              accessibilityLabel="Isenção Esporte"
              accessibilityRole="switch"
            />
          </View>

          <View style={styles.switchContainer}>
            <Text style={styles.switchLabel}>Isenção Idiomas</Text>
            <Switch
              value={formData.isencao_idiomas}
              onValueChange={value =>
                updateField('isencao_idiomas', value)
              }
              disabled={isLoading}
              accessibilityLabel="Isenção Idiomas"
              accessibilityRole="switch"
            />
          </View>
        </View>

        {/* Issue Button */}
        <View style={styles.buttonContainer}>
          {isLoading ? (
            <LoadingIndicator message="Emitindo credencial..." />
          ) : (
            <TouchableOpacity
              style={styles.issueButton}
              onPress={handleIssueCredential}
              disabled={isLoading}>
              <Text style={styles.issueButtonText}>Emitir Credencial</Text>
            </TouchableOpacity>
          )}
        </View>
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
      fontSize: scaleFontSize(theme.typography.fontSizeTitle),
      fontWeight: 'bold',
      color: theme.colors.primary,
      marginBottom: theme.spacing.sm,
    },
    subtitle: {
      fontSize: scaleFontSize(theme.typography.fontSizeBase),
      color: theme.colors.textSecondary,
      marginBottom: theme.spacing.lg,
    },
    section: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.medium,
      padding: theme.spacing.md,
      marginBottom: theme.spacing.md,
      ...(theme.shadows.small as any),
    },
    sectionTitle: {
      fontSize: scaleFontSize(18),
      fontWeight: 'bold',
      color: theme.colors.primary,
      marginBottom: theme.spacing.md,
    },
    fieldContainer: {
      marginBottom: theme.spacing.md,
    },
    label: {
      fontSize: scaleFontSize(theme.typography.fontSizeBase),
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: theme.spacing.sm,
    },
    input: {
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.small,
      padding: theme.spacing.sm + theme.spacing.xs,
      fontSize: scaleFontSize(theme.typography.fontSizeLarge),
      backgroundColor: theme.colors.surface,
    },
    inputError: {
      borderColor: theme.colors.error,
    },
    errorText: {
      fontSize: scaleFontSize(theme.typography.fontSizeSmall),
      color: theme.colors.error,
      marginTop: theme.spacing.xs,
    },
    statusContainer: {
      flexDirection: 'row',
      gap: theme.spacing.sm + theme.spacing.xs,
    },
    statusButton: {
      flex: 1,
      padding: theme.spacing.sm + theme.spacing.xs,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.small,
      alignItems: 'center',
    },
    statusButtonActive: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    statusButtonText: {
      fontSize: scaleFontSize(theme.typography.fontSizeLarge),
      color: theme.colors.textSecondary,
    },
    statusButtonTextActive: {
      color: theme.colors.surface,
      fontWeight: 'bold',
    },
    switchContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: theme.spacing.sm + theme.spacing.xs,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.divider,
    },
    switchLabel: {
      fontSize: scaleFontSize(theme.typography.fontSizeLarge),
      color: theme.colors.text,
    },
    buttonContainer: {
      marginTop: theme.spacing.sm,
      marginBottom: theme.spacing.xl,
    },
    issueButton: {
      backgroundColor: theme.colors.primary,
      padding: theme.spacing.md,
      borderRadius: theme.borderRadius.medium,
      alignItems: 'center',
    },
    issueButtonText: {
      color: theme.colors.surface,
      fontSize: scaleFontSize(18),
      fontWeight: 'bold',
    },
    credentialToken: {
      fontSize: scaleFontSize(theme.typography.fontSizeSmall),
      fontFamily: 'monospace',
      color: theme.colors.text,
      backgroundColor: theme.colors.background,
      padding: theme.spacing.sm + theme.spacing.xs,
      borderRadius: theme.borderRadius.small,
      marginBottom: theme.spacing.sm + theme.spacing.xs,
    },
    copyButton: {
      backgroundColor: theme.colors.success,
      padding: theme.spacing.sm + theme.spacing.xs,
      borderRadius: theme.borderRadius.medium,
      alignItems: 'center',
    },
    copyButtonText: {
      color: theme.colors.surface,
      fontSize: scaleFontSize(theme.typography.fontSizeBase),
      fontWeight: '600',
    },
  });

export default IssuerScreen;
