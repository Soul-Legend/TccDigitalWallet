import React, {useEffect, useMemo, useCallback, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import {MaterialCommunityIcons} from '@expo/vector-icons';
import {useAppStore} from '../stores/useAppStore';
import LogEntry from '../components/LogEntry';
import type {LogEntry as LogEntryType} from '../types';
import {getTheme, scaleFontSize} from '../utils/theme';
import type {Theme} from '../utils/theme';

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    header: {
      paddingHorizontal: 16,
      paddingTop: 8,
      paddingBottom: 16,
    },
    title: {
      fontSize: scaleFontSize(32),
      fontWeight: '900',
      color: '#071D41',
      marginBottom: 4,
    },
    subtitle: {
      fontSize: scaleFontSize(14),
      color: '#888888',
      marginBottom: 12,
    },
    statsContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 8,
    },
    statsText: {
      fontSize: scaleFontSize(12),
      color: '#888888',
    },
    clearButton: {
      backgroundColor: '#E52207',
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 4,
    },
    clearButtonText: {
      color: '#FFFFFF',
      fontSize: scaleFontSize(12),
      fontWeight: '600',
    },
    copyErrorsButton: {
      backgroundColor: '#1351B4',
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 4,
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      marginRight: 8,
    },
    copyErrorsButtonText: {
      color: '#FFFFFF',
      fontSize: scaleFontSize(12),
      fontWeight: '600',
      marginLeft: 4,
    },
    headerButtons: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 32,
    },
    emptyIcon: {
      fontSize: 64,
      marginBottom: 16,
    },
    emptyText: {
      fontSize: scaleFontSize(18),
      fontWeight: 'bold',
      color: '#888888',
      marginBottom: 8,
    },
    emptySubtext: {
      fontSize: scaleFontSize(14),
      color: '#888888',
      textAlign: 'center',
    },
    logsList: {
      flex: 1,
    },
    logsListContent: {
      paddingVertical: 8,
      paddingHorizontal: 16,
    },
  });

const LogsScreen: React.FC = () => {
  const setCurrentModule = useAppStore(state => state.setCurrentModule);
  const logs = useAppStore(state => state.logs);
  const clearLogs = useAppStore(state => state.clearLogs);
  const theme = getTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [refreshing, setRefreshing] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState(false);

  /** Serialize a log entry to a readable string for clipboard. */
  const serializeLog = useCallback((log: LogEntryType): string => {
    const lines: string[] = [];
    const ts = new Date(log.timestamp).toISOString();
    lines.push(`[${ts}] ${log.operation} | ${log.module} | ${log.success ? 'OK' : 'FAIL'}`);
    if (log.error) {
      lines.push(`  Error: ${log.error.message}`);
    }
    if (log.details) {
      if (log.details.algorithm) { lines.push(`  Algorithm: ${log.details.algorithm}`); }
      if (log.details.did_method) { lines.push(`  DID Method: ${log.details.did_method}`); }
      if (log.details.format) { lines.push(`  Format: ${log.details.format}`); }
      if (log.details.parameters) {
        for (const [k, v] of Object.entries(log.details.parameters)) {
          const val = typeof v === 'object' ? JSON.stringify(v) : String(v);
          lines.push(`  ${k}: ${val}`);
        }
      }
      if (log.details.stack_trace) {
        lines.push(`  Stack Trace:\n    ${log.details.stack_trace.replace(/\n/g, '\n    ')}`);
      }
    }
    return lines.join('\n');
  }, []);

  const handleCopyErrors = useCallback(async () => {
    const errors = logs.filter(l => !l.success);
    if (errors.length === 0) {
      Alert.alert('Nenhum erro', 'Não há erros para copiar.');
      return;
    }
    const sorted = [...errors].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );
    const text = sorted.map(serializeLog).join('\n\n---\n\n');
    await Clipboard.setStringAsync(text);
    setCopyFeedback(true);
    setTimeout(() => setCopyFeedback(false), 2000);
  }, [logs, serializeLog]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    // Logs are already reactive via zustand; the brief spinner gives visual feedback
    setTimeout(() => setRefreshing(false), 500);
  }, []);

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
        <Text style={styles.title}>Atividades de Segurança</Text>
        <Text style={styles.subtitle}>
          Registro de eventos criptográficos da Carteira Digital SSI
        </Text>
        <View style={styles.statsContainer}>
          <Text
            style={styles.statsText}
            accessibilityLabel={`Total de eventos: ${logs.length}`}>
            Total de eventos: {logs.length}
          </Text>
          {logs.length > 0 && (
            <View style={styles.headerButtons}>
              <TouchableOpacity
                style={styles.copyErrorsButton}
                onPress={handleCopyErrors}
                accessibilityLabel="Copiar erros para a área de transferência"
                accessibilityRole="button">
                <MaterialCommunityIcons name={copyFeedback ? 'check' : 'content-copy'} size={14} color={theme.colors.surface} />
                <Text style={styles.copyErrorsButtonText}>
                  {copyFeedback ? 'Copiado!' : 'Copiar Erros'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.clearButton}
                onPress={handleClearLogs}
                accessibilityLabel="Limpar histórico de logs"
                accessibilityRole="button">
                <Text style={styles.clearButtonText}>Limpar Histórico</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>

      {logs.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons name="clipboard-text" size={64} color={theme.colors.textSecondary} style={{marginBottom: theme.spacing.md}} />
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
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[theme.colors.primary]}
              tintColor={theme.colors.primary}
            />
          }
          accessibilityLabel="Lista de logs de eventos"
        />
      )}
    </View>
  );
};

export default LogsScreen;
