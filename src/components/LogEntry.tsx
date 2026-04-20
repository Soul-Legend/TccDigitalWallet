import React, {useState} from 'react';
import {View, Text, StyleSheet, TouchableOpacity} from 'react-native';
import {LogEntry as LogEntryType} from '../types';

interface LogEntryProps {
  log: LogEntryType;
}

const LogEntry: React.FC<LogEntryProps> = ({log}) => {
  const [expanded, setExpanded] = useState(false);

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
          <Text
            style={[
              styles.statusBadge,
              log.success ? styles.successBadge : styles.errorBadge,
            ]}>
            {log.success ? '✓' : '✗'}
          </Text>
        </View>
      </View>

      <Text style={styles.timestamp}>{formatTimestamp(log.timestamp)}</Text>

      {log.error && (
        <View style={styles.errorMessageContainer}>
          <Text style={styles.errorMessage}>{log.error.message}</Text>
        </View>
      )}

      {expanded && renderDetails()}

      <Text style={styles.expandHint}>
        {expanded ? '▲ Toque para recolher' : '▼ Toque para expandir'}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 16,
    marginVertical: 6,
    marginHorizontal: 12,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    borderLeftWidth: 4,
    borderLeftColor: '#4caf50',
  },
  errorContainer: {
    borderLeftColor: '#f44336',
    backgroundColor: '#ffebee',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerLeft: {
    flex: 1,
  },
  headerRight: {
    marginLeft: 12,
  },
  operationText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#003366',
    marginBottom: 4,
  },
  moduleText: {
    fontSize: 13,
    color: '#666',
  },
  timestamp: {
    fontSize: 12,
    color: '#999',
    marginBottom: 8,
  },
  statusBadge: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  successBadge: {
    color: '#4caf50',
  },
  errorBadge: {
    color: '#f44336',
  },
  errorMessageContainer: {
    backgroundColor: '#ffcdd2',
    padding: 8,
    borderRadius: 4,
    marginVertical: 8,
  },
  errorMessage: {
    fontSize: 13,
    color: '#c62828',
    fontWeight: '500',
  },
  detailsContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  detailRow: {
    marginBottom: 10,
  },
  detailLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
    fontWeight: '600',
  },
  detailValue: {
    fontSize: 14,
    color: '#333',
  },
  detailValueMono: {
    fontSize: 13,
    color: '#333',
    fontFamily: 'monospace',
  },
  successText: {
    color: '#2e7d32',
    fontWeight: 'bold',
  },
  errorText: {
    color: '#c62828',
    fontWeight: 'bold',
  },
  parametersContainer: {
    backgroundColor: '#f5f5f5',
    padding: 8,
    borderRadius: 4,
    marginTop: 4,
  },
  parameterRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  parameterKey: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
    marginRight: 8,
  },
  parameterValue: {
    fontSize: 12,
    color: '#333',
    flex: 1,
  },
  stackTrace: {
    fontSize: 11,
    color: '#666',
    fontFamily: 'monospace',
    backgroundColor: '#f5f5f5',
    padding: 8,
    borderRadius: 4,
    marginTop: 4,
  },
  expandHint: {
    fontSize: 11,
    color: '#999',
    textAlign: 'center',
    marginTop: 8,
  },
});

export default LogEntry;
