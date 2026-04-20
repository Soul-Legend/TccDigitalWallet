import React, {useEffect, useMemo, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
} from 'react-native';
import {useAppStore} from '../stores/useAppStore';
import LogEntry from '../components/LogEntry';
import type {LogEntry as LogEntryType} from '../types';

const LogsScreen: React.FC = () => {
  const setCurrentModule = useAppStore(state => state.setCurrentModule);
  const logs = useAppStore(state => state.logs);
  const clearLogs = useAppStore(state => state.clearLogs);

  useEffect(() => {
    setCurrentModule('logs');
  }, [setCurrentModule]);

  const handleClearLogs = useCallback(() => {
    Alert.alert(
      'Limpar Histórico',
      'Tem certeza que deseja limpar todos os logs? Esta ação não pode ser desfeita.',
      [
        {text: 'Cancelar', style: 'cancel'},
        {text: 'Limpar', style: 'destructive', onPress: () => clearLogs()},
      ],
    );
  }, [clearLogs]);

  // Sort logs in reverse chronological order (newest first). Memoised so we
  // don't re-allocate the array on every parent re-render.
  const sortedLogs = useMemo<LogEntryType[]>(
    () =>
      [...logs].sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      ),
    [logs],
  );

  const renderItem = useCallback(
    ({item}: {item: LogEntryType}) => <LogEntry log={item} />,
    [],
  );
  const keyExtractor = useCallback((item: LogEntryType) => item.id, []);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Painel de Logs</Text>
        <Text style={styles.subtitle}>
          Monitoramento de eventos criptográficos
        </Text>
        <View style={styles.statsContainer}>
          <Text style={styles.statsText}>Total de eventos: {logs.length}</Text>
          {logs.length > 0 && (
            <TouchableOpacity
              style={styles.clearButton}
              onPress={handleClearLogs}>
              <Text style={styles.clearButtonText}>Limpar Histórico</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {logs.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>📋</Text>
          <Text style={styles.emptyText}>Nenhum evento registrado</Text>
          <Text style={styles.emptySubtext}>
            Os eventos criptográficos aparecerão aqui conforme você utiliza o
            aplicativo
          </Text>
        </View>
      ) : (
        <FlatList
          style={styles.logsList}
          contentContainerStyle={styles.logsListContent}
          data={sortedLogs}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          initialNumToRender={20}
          maxToRenderPerBatch={20}
          windowSize={10}
          removeClippedSubviews
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#003366',
    padding: 20,
    paddingTop: 24,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#b3d9ff',
    marginBottom: 12,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  statsText: {
    fontSize: 13,
    color: '#b3d9ff',
  },
  clearButton: {
    backgroundColor: '#f44336',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  clearButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    lineHeight: 20,
  },
  logsList: {
    flex: 1,
  },
  logsListContent: {
    paddingVertical: 12,
  },
});

export default LogsScreen;
