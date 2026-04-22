import React from 'react';
import {View, Text, StyleSheet, ScrollView} from 'react-native';
import {MaterialIcons} from '@expo/vector-icons';
import {VerifiableCredential} from '../types';
import {getTheme, scaleFontSize, Theme} from '../utils/theme';

interface CredentialCardProps {
  credential: VerifiableCredential;
}

const CredentialCard: React.FC<CredentialCardProps> = ({credential}) => {
  const theme = getTheme();
  const styles = createStyles(theme);
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
        <View style={styles.headerRow}>
          <MaterialIcons name="school" size={24} color={theme.colors.primary} style={{marginRight: 8}} />
          <Text style={styles.title}>Carteira de Identidade Acadêmica</Text>
        </View>
        <View style={styles.verifiedBadge}>
          <Text style={styles.verifiedBadgeText}>VERIFICADA</Text>
        </View>
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

const createStyles = (theme: Theme) => StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.large,
    padding: 20,
    marginVertical: 12,
    ...(theme.shadows.large as any),
    maxHeight: 600,
  },
  header: {
    borderBottomWidth: 2,
    borderBottomColor: theme.colors.primary,
    paddingBottom: 12,
    marginBottom: theme.spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  verifiedBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(0,74,9,0.1)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginBottom: theme.spacing.sm,
  },
  verifiedBadgeText: {
    fontSize: scaleFontSize(11),
    fontWeight: '700',
    color: theme.colors.tertiary,
  },
  title: {
    fontSize: scaleFontSize(20),
    fontWeight: 'bold',
    color: theme.colors.primary,
    flex: 1,
  },
  issuer: {
    fontSize: scaleFontSize(12),
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  date: {
    fontSize: scaleFontSize(12),
    color: theme.colors.textSecondary,
  },
  content: {
    flex: 1,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: scaleFontSize(16),
    fontWeight: 'bold',
    color: theme.colors.primary,
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider,
    paddingBottom: theme.spacing.xs,
  },
  field: {
    marginBottom: theme.spacing.sm,
  },
  label: {
    fontSize: scaleFontSize(13),
    color: theme.colors.textSecondary,
    marginBottom: 2,
  },
  value: {
    fontSize: scaleFontSize(15),
    color: theme.colors.text,
    fontWeight: '500',
  },
  statusActive: {
    color: theme.colors.success,
    fontWeight: 'bold',
  },
  statusInactive: {
    color: theme.colors.error,
    fontWeight: 'bold',
  },
  footer: {
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.divider,
  },
  footerText: {
    fontSize: scaleFontSize(11),
    color: theme.colors.textDisabled,
    marginBottom: theme.spacing.xs,
  },
  footerValue: {
    fontSize: scaleFontSize(10),
    color: theme.colors.textSecondary,
    fontFamily: 'monospace',
  },
});

export default CredentialCard;
