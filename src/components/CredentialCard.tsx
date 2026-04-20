import React from 'react';
import {View, Text, StyleSheet, ScrollView} from 'react-native';
import {VerifiableCredential} from '../types';

interface CredentialCardProps {
  credential: VerifiableCredential;
}

const CredentialCard: React.FC<CredentialCardProps> = ({credential}) => {
  const {credentialSubject} = credential;

  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('pt-BR');
    } catch {
      return dateString;
    }
  };

  const formatBoolean = (value: boolean): string => {
    return value ? 'Sim' : 'Não';
  };

  const formatArray = (arr: string[]): string => {
    return arr.length > 0 ? arr.join(', ') : 'Nenhum';
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>Carteira de Identidade Acadêmica</Text>
        <Text style={styles.issuer}>Emitido por: {credential.issuer}</Text>
        <Text style={styles.date}>
          Data de emissão: {formatDate(credential.issuanceDate)}
        </Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Dados Pessoais</Text>
          <View style={styles.field}>
            <Text style={styles.label}>Nome Completo:</Text>
            <Text style={styles.value}>{credentialSubject.nome_completo}</Text>
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>CPF:</Text>
            <Text style={styles.value}>{credentialSubject.cpf}</Text>
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>Data de Nascimento:</Text>
            <Text style={styles.value}>
              {formatDate(credentialSubject.data_nascimento)}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Dados Acadêmicos</Text>
          <View style={styles.field}>
            <Text style={styles.label}>Matrícula:</Text>
            <Text style={styles.value}>{credentialSubject.matricula}</Text>
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>Curso:</Text>
            <Text style={styles.value}>{credentialSubject.curso}</Text>
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>Status:</Text>
            <Text
              style={[
                styles.value,
                credentialSubject.status_matricula === 'Ativo'
                  ? styles.statusActive
                  : styles.statusInactive,
              ]}>
              {credentialSubject.status_matricula}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Benefícios e Auxílios</Text>
          <View style={styles.field}>
            <Text style={styles.label}>Alojamento Indígena:</Text>
            <Text style={styles.value}>
              {formatBoolean(credentialSubject.alojamento_indigena)}
            </Text>
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>Auxílio Creche:</Text>
            <Text style={styles.value}>
              {formatBoolean(credentialSubject.auxilio_creche)}
            </Text>
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>Auxílio Moradia:</Text>
            <Text style={styles.value}>
              {formatBoolean(credentialSubject.auxilio_moradia)}
            </Text>
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>Bolsa Estudantil:</Text>
            <Text style={styles.value}>
              {formatBoolean(credentialSubject.bolsa_estudantil)}
            </Text>
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>Bolsa Permanência MEC:</Text>
            <Text style={styles.value}>
              {formatBoolean(credentialSubject.bolsa_permanencia_mec)}
            </Text>
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>PAIQ:</Text>
            <Text style={styles.value}>
              {formatBoolean(credentialSubject.paiq)}
            </Text>
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>Moradia Estudantil:</Text>
            <Text style={styles.value}>
              {formatBoolean(credentialSubject.moradia_estudantil)}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Isenções</Text>
          <View style={styles.field}>
            <Text style={styles.label}>Isenção RU:</Text>
            <Text style={styles.value}>
              {formatBoolean(credentialSubject.isencao_ru)}
            </Text>
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>Isenção Esporte:</Text>
            <Text style={styles.value}>
              {formatBoolean(credentialSubject.isencao_esporte)}
            </Text>
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>Isenção Idiomas:</Text>
            <Text style={styles.value}>
              {formatBoolean(credentialSubject.isencao_idiomas)}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Permissões de Acesso</Text>
          <View style={styles.field}>
            <Text style={styles.label}>Acesso a Laboratórios:</Text>
            <Text style={styles.value}>
              {formatArray(credentialSubject.acesso_laboratorios)}
            </Text>
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>Acesso a Prédios:</Text>
            <Text style={styles.value}>
              {formatArray(credentialSubject.acesso_predios)}
            </Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>DID do Titular:</Text>
          <Text style={styles.footerValue}>{credentialSubject.id}</Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    marginVertical: 12,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    maxHeight: 600,
  },
  header: {
    borderBottomWidth: 2,
    borderBottomColor: '#003366',
    paddingBottom: 12,
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#003366',
    marginBottom: 8,
  },
  issuer: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  date: {
    fontSize: 12,
    color: '#666',
  },
  content: {
    flex: 1,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#003366',
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    paddingBottom: 4,
  },
  field: {
    marginBottom: 8,
  },
  label: {
    fontSize: 13,
    color: '#666',
    marginBottom: 2,
  },
  value: {
    fontSize: 15,
    color: '#333',
    fontWeight: '500',
  },
  statusActive: {
    color: '#2e7d32',
    fontWeight: 'bold',
  },
  statusInactive: {
    color: '#c62828',
    fontWeight: 'bold',
  },
  footer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  footerText: {
    fontSize: 11,
    color: '#999',
    marginBottom: 4,
  },
  footerValue: {
    fontSize: 10,
    color: '#666',
    fontFamily: 'monospace',
  },
});

export default CredentialCard;
