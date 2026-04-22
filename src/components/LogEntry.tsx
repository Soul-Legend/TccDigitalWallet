import React, {useState, useCallback} from 'react';
import {View, Text, StyleSheet, TouchableOpacity} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import {MaterialCommunityIcons} from '@expo/vector-icons';
import {LogEntry as LogEntryType} from '../types';
import {getTheme, scaleFontSize, Theme} from '../utils/theme';

interface LogEntryProps {
  log: LogEntryType;
}

const LogEntry: React.FC<LogEntryProps> = ({log}) => {
  const theme = getTheme();
  const styles = createStyles(theme);
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopyEntry = useCallback(async () => {
    const lines: string[] = [];
    const ts = new Date(log.timestamp).toISOString();
    lines.push(`[${ts}] ${log.operation} | ${log.module} | ${log.success ? 'OK' : 'FAIL'}`);
    if (log.error) lines.push(`Error: ${log.error.message}`);
    if (log.details) {
      if (log.details.algorithm) lines.push(`Algorithm: ${log.details.algorithm}`);
      if (log.details.did_method) lines.push(`DID Method: ${log.details.did_method}`);
      if (log.details.format) lines.push(`Format: ${log.details.format}`);
      if (log.details.parameters) {
        for (const [k, v] of Object.entries(log.details.parameters)) {
          const val = typeof v === 'object' ? JSON.stringify(v) : String(v);
          lines.push(`${k}: ${val}`);
        }
      }
      if (log.details.stack_trace) {
        lines.push(`Stack Trace:\n  ${log.details.stack_trace.replace(/\n/g, '\n  ')}`);
      }
    }
    await Clipboard.setStringAsync(lines.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [log]);

  const formatTimestamp = (date: Date): string => {
    return new Date(date).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const getOperationLabel = (operation: LogEntryType['operation']): string => {
    const labels: Record<LogEntryType['operation'], string> = {
      key_generation: 'Geração de Chaves',
      credential_issuance: 'Emissão de Credencial',
      presentation_creation: 'Criação de Apresentação',
      verification: 'Verificação',
      hash_computation: 'Computação de Hash',
      zkp_generation: 'Geração de ZKP',
      trust_chain_init: 'Inicialização da Cadeia de Confiança',
      trust_chain_register: 'Registro de Emissor na Cadeia',
      error: 'Erro',
    };
    return labels[operation];
  };

  const getModuleLabel = (module: LogEntryType['module']): string => {
    const labels: Record<LogEntryType['module'], string> = {
      emissor: 'Emissor',
      titular: 'Titular',
      verificador: 'Verificador',
    };
    return labels[module];
  };

  const truncateHash = (hash: string, length: number = 16): string => {
    if (hash.length <= length) {return hash;}
    return `${hash.substring(0, length)}...`;
  };

  const obfuscateCPF = (cpf: string): string => {
    if (cpf.length < 4) {return '***';}
    return `***${cpf.slice(-4)}`;
  };

  const obfuscateName = (name: string): string => {
    const parts = name.split(' ');
    if (parts.length === 0) {return '***';}
    return `${parts[0]} ***`;
  };

  const renderDetails = () => {
    const {details} = log;

    return (
      <View style={styles.detailsContainer}>
        {details.algorithm && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Algoritmo:</Text>
            <Text style={styles.detailValue}>{details.algorithm}</Text>
          </View>
        )}

        {details.key_size && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Tamanho da Chave:</Text>
            <Text style={styles.detailValue}>{details.key_size} bits</Text>
          </View>
        )}

        {details.did_method && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Método DID:</Text>
            <Text style={styles.detailValue}>{details.did_method}</Text>
          </View>
        )}

        {details.hash_output && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Hash:</Text>
            <Text style={styles.detailValueMono}>
              {truncateHash(details.hash_output)}
            </Text>
          </View>
        )}

        {details.verification_result !== undefined && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Resultado da Validação:</Text>
            <Text
              style={[
                styles.detailValue,
                details.verification_result
                  ? styles.successText
                  : styles.errorText,
              ]}>
              {details.verification_result ? 'Válido' : 'Inválido'}
            </Text>
          </View>
        )}

        {details.parameters && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Parâmetros:</Text>
            <View style={styles.parametersContainer}>
              {Object.entries(details.parameters).map(([key, value]) => {
                let displayValue = value;

                // Obfuscate sensitive data
                if (key === 'cpf' && typeof value === 'string') {
                  displayValue = obfuscateCPF(value);
                } else if (key === 'nome_completo' && typeof value === 'string') {
                  displayValue = obfuscateName(value);
                } else if (typeof value === 'object') {
                  displayValue = JSON.stringify(value, null, 2);
                }

                return (
                  <View key={key} style={styles.parameterRow}>
                    <Text style={styles.parameterKey}>{key}:</Text>
                    <Text style={styles.parameterValue}>
                      {String(displayValue)}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {details.stack_trace && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Stack Trace:</Text>
            <Text style={styles.stackTrace}>{details.stack_trace}</Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <TouchableOpacity
      style={[
        styles.container,
        !log.success && styles.errorContainer,
      ]}
      onPress={() => setExpanded(!expanded)}
      activeOpacity={0.7}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.operationText}>
            {getOperationLabel(log.operation)}
          </Text>
          <Text style={styles.moduleText}>{getModuleLabel(log.module)}</Text>
        </View>
        <View style={styles.headerRight}>
          <MaterialCommunityIcons
            name={log.success ? 'check-circle' : 'close-circle'}
            size={20}
            color={log.success ? theme.colors.success : theme.colors.error}
          />
        </View>
      </View>

      <Text style={styles.timestamp}>{formatTimestamp(log.timestamp)}</Text>

      {log.error && (
        <View style={styles.errorMessageContainer}>
          <Text style={styles.errorMessage}>{log.error.message}</Text>
        </View>
      )}

      {expanded && renderDetails()}

      {expanded && (
        <TouchableOpacity
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: theme.spacing.sm,
            paddingVertical: theme.spacing.xs,
            backgroundColor: theme.colors.background,
            borderRadius: theme.borderRadius.small,
          }}
          onPress={handleCopyEntry}
          accessibilityLabel="Copiar log para a área de transferência"
          accessibilityRole="button">
          <MaterialCommunityIcons
            name={copied ? 'check' : 'content-copy'}
            size={14}
            color={theme.colors.primary}
          />
          <Text style={{
            fontSize: scaleFontSize(12),
            color: theme.colors.primary,
            marginLeft: 4,
            fontWeight: '600',
          }}>
            {copied ? 'Copiado!' : 'Copiar'}
          </Text>
        </TouchableOpacity>
      )}

      <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: theme.spacing.sm}}>
        <MaterialCommunityIcons name={expanded ? 'chevron-up' : 'chevron-down'} size={14} color={theme.colors.textDisabled} />
        <Text style={[styles.expandHint, {marginTop: 0}]}>
          {expanded ? ' Toque para recolher' : ' Toque para expandir'}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const createStyles = (theme: Theme) => StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    marginVertical: 4,
    borderLeftWidth: 3,
    borderLeftColor: '#168821',
    overflow: 'hidden',
  },
  errorContainer: {
    borderLeftColor: '#E52207',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  headerLeft: {
    flex: 1,
  },
  headerRight: {
    marginLeft: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  operationText: {
    fontSize: scaleFontSize(16),
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 2,
  },
  moduleText: {
    fontSize: scaleFontSize(13),
    color: '#888888',
  },
  timestamp: {
    fontSize: scaleFontSize(12),
    color: '#888888',
    fontWeight: '600',
    marginBottom: 8,
  },
  statusBadge: {
    fontSize: scaleFontSize(20),
    fontWeight: 'bold',
  },
  successBadge: {
    color: '#168821',
  },
  errorBadge: {
    color: '#E52207',
  },
  errorMessageContainer: {
    backgroundColor: '#FDE0DB',
    padding: 8,
    borderRadius: 4,
    marginVertical: 8,
  },
  errorMessage: {
    fontSize: scaleFontSize(13),
    color: '#E52207',
    fontWeight: '500',
  },
  detailsContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
  },
  detailRow: {
    marginBottom: 10,
  },
  detailLabel: {
    fontSize: scaleFontSize(12),
    color: '#888888',
    marginBottom: 4,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailValue: {
    fontSize: scaleFontSize(14),
    color: '#333333',
  },
  detailValueMono: {
    fontSize: scaleFontSize(13),
    color: '#888888',
    fontFamily: 'monospace',
  },
  successText: {
    color: '#168821',
    fontWeight: 'bold',
  },
  errorText: {
    color: '#E52207',
    fontWeight: 'bold',
  },
  parametersContainer: {
    backgroundColor: '#EEEEEE',
    padding: 8,
    borderRadius: 4,
    marginTop: 4,
  },
  parameterRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  parameterKey: {
    fontSize: scaleFontSize(12),
    color: '#888888',
    fontWeight: '600',
    marginRight: 8,
  },
  parameterValue: {
    fontSize: scaleFontSize(12),
    color: '#333333',
    flex: 1,
  },
  stackTrace: {
    fontSize: scaleFontSize(11),
    color: '#888888',
    fontFamily: 'monospace',
    backgroundColor: '#EEEEEE',
    padding: 8,
    borderRadius: 4,
    marginTop: 4,
  },
  expandHint: {
    fontSize: scaleFontSize(11),
    color: '#888888',
    textAlign: 'center',
    marginTop: 8,
  },
});

export default LogEntry;
