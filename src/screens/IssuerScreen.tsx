import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Switch,
} from 'react-native';
import LoadingIndicator from '../components/LoadingIndicator';
import SuccessMessage from '../components/SuccessMessage';
import ErrorMessage from '../components/ErrorMessage';
import TrustChainSection from '../components/TrustChainSection';
import {useIssuerState} from './hooks/useIssuerState';

const IssuerScreen: React.FC = () => {
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
    <ScrollView style={styles.container}>
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
            />
          </View>

          <View style={styles.switchContainer}>
            <Text style={styles.switchLabel}>PAIQ</Text>
            <Switch
              value={formData.paiq}
              onValueChange={value => updateField('paiq', value)}
              disabled={isLoading}
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
    fontSize: 24,
    fontWeight: 'bold',
    color: '#003366',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#003366',
    marginBottom: 16,
  },
  fieldContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  inputError: {
    borderColor: '#c62828',
  },
  errorText: {
    fontSize: 12,
    color: '#c62828',
    marginTop: 4,
  },
  statusContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  statusButton: {
    flex: 1,
    padding: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    alignItems: 'center',
  },
  statusButtonActive: {
    backgroundColor: '#003366',
    borderColor: '#003366',
  },
  statusButtonText: {
    fontSize: 16,
    color: '#666',
  },
  statusButtonTextActive: {
    color: '#fff',
    fontWeight: 'bold',
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  switchLabel: {
    fontSize: 16,
    color: '#333',
  },
  buttonContainer: {
    marginTop: 8,
    marginBottom: 32,
  },
  issueButton: {
    backgroundColor: '#003366',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  issueButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  credentialToken: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: '#333',
    backgroundColor: '#f0f0f0',
    padding: 12,
    borderRadius: 4,
    marginBottom: 12,
  },
  copyButton: {
    backgroundColor: '#4CAF50',
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  copyButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default IssuerScreen;
