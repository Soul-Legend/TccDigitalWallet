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
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex1}>
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.content}>
        <View style={styles.headerSection}>
          <Text style={styles.headerLabel}>Universidade Federal de Santa Catarina</Text>
          <Text style={styles.title}>Nova Credencial{'\n'}Acadêmica</Text>
        </View>

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
      padding: 16,
      paddingBottom: 48,
    },
    headerSection: {
      paddingTop: 8,
      paddingBottom: 16,
    },
    headerLabel: {
      fontSize: scaleFontSize(12),
      fontWeight: 'bold',
      color: '#1351B4',
      textTransform: 'uppercase',
      letterSpacing: 1.2,
      marginBottom: 4,
    },
    title: {
      fontSize: scaleFontSize(32),
      fontWeight: '900',
      color: '#071D41',
      lineHeight: 38,
    },
    section: {
      backgroundColor: '#FFFFFF',
      borderRadius: 8,
      padding: 20,
      marginBottom: 12,
    },
    sectionTitle: {
      fontSize: scaleFontSize(20),
      fontWeight: '700',
      color: '#071D41',
      marginBottom: 16,
    },
    fieldContainer: {
      marginBottom: 16,
    },
    label: {
      fontSize: scaleFontSize(14),
      fontWeight: '600',
      color: '#333333',
      marginBottom: 6,
    },
    input: {
      height: 54,
      borderWidth: 0,
      borderRadius: 4,
      paddingHorizontal: 16,
      fontSize: scaleFontSize(14),
      backgroundColor: '#EEEEEE',
      color: '#333333',
    },
    inputError: {
      borderColor: '#E52207',
      borderWidth: 2,
    },
    errorText: {
      fontSize: scaleFontSize(12),
      color: '#E52207',
      marginTop: 4,
      marginLeft: 4,
    },
    statusContainer: {
      flexDirection: 'row',
      gap: 8,
    },
    statusButton: {
      flex: 1,
      paddingVertical: 12,
      borderWidth: 1,
      borderColor: '#CCCCCC',
      borderRadius: 4,
      alignItems: 'center',
    },
    statusButtonActive: {
      backgroundColor: '#071D41',
      borderColor: '#071D41',
    },
    statusButtonText: {
      fontSize: scaleFontSize(14),
      color: '#888888',
      fontWeight: '600',
    },
    statusButtonTextActive: {
      color: '#FFFFFF',
      fontWeight: 'bold',
    },
    switchContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 8,
    },
    switchLabel: {
      fontSize: scaleFontSize(16),
      fontWeight: '400',
      color: '#333333',
    },
    buttonContainer: {
      marginTop: 8,
      marginBottom: 32,
    },
    issueButton: {
      backgroundColor: '#071D41',
      minHeight: 56,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: 8,
    },
    issueButtonText: {
      color: '#FFFFFF',
      fontSize: scaleFontSize(18),
      fontWeight: 'bold',
    },
    credentialToken: {
      fontSize: scaleFontSize(12),
      fontFamily: 'monospace',
      color: '#333333',
      backgroundColor: '#EEEEEE',
      padding: 16,
      borderRadius: 4,
      marginBottom: 8,
    },
    copyButton: {
      backgroundColor: '#FFCD07',
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 8,
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 6,
    },
    copyButtonText: {
      color: '#071D41',
      fontSize: scaleFontSize(14),
      fontWeight: '600',
    },
    flex1: {
      flex: 1,
    },
  });

export default IssuerScreen;
