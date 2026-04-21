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
      backgroundColor: theme.colors.primary,
      padding: theme.spacing.lg,
      paddingTop: theme.spacing.lg,
      ...(theme.shadows.large as any),
    },
    title: {
      fontSize: scaleFontSize(theme.typography.fontSizeTitle),
      fontWeight: 'bold',
      color: theme.colors.surface,
      marginBottom: theme.spacing.xs,
    },
    subtitle: {
      fontSize: scaleFontSize(theme.typography.fontSizeBase),
      color: theme.colors.primaryLight,
      marginBottom: theme.spacing.md,
    },
    statsContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: theme.spacing.sm,
    },
    statsText: {
      fontSize: scaleFontSize(theme.typography.fontSizeSmall),
      color: theme.colors.primaryLight,
    },
    clearButton: {
      backgroundColor: theme.colors.error,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      borderRadius: theme.borderRadius.small,
    },
    clearButtonText: {
      color: theme.colors.surface,
      fontSize: scaleFontSize(theme.typography.fontSizeSmall),
      fontWeight: '600',
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: theme.spacing.xl,
    },
    emptyIcon: {
      fontSize: 64,
      marginBottom: theme.spacing.md,
    },
    emptyText: {
      fontSize: scaleFontSize(theme.typography.fontSizeLarge + 2),
      fontWeight: 'bold',
      color: theme.colors.textSecondary,
      marginBottom: theme.spacing.sm,
    },
    emptySubtext: {
      fontSize: scaleFontSize(theme.typography.fontSizeBase),
      color: theme.colors.textDisabled,
      textAlign: 'center',
      lineHeight: scaleFontSize(theme.typography.lineHeightBase),
    },
    logsList: {
      flex: 1,
    },
    logsListContent: {
      paddingVertical: theme.spacing.md,
    },
  });

const LogsScreen: React.FC = () => {
  const setCurrentModule = useAppStore(state => state.setCurrentModule);
  const logs = useAppStore(state => state.logs);
  const clearLogs = useAppStore(state => state.clearLogs);
  const theme = getTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [refreshing, setRefreshing] = useState(false);

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
        <Text style={styles.title}>Painel de Logs</Text>
        <Text style={styles.subtitle}>
          Monitoramento de eventos criptográficos
        </Text>
        <View style={styles.statsContainer}>
          <Text
            style={styles.statsText}
            accessibilityLabel={`Total de eventos: ${logs.length}`}>
            Total de eventos: {logs.length}
          </Text>
          {logs.length > 0 && (
            <TouchableOpacity
              style={styles.clearButton}
              onPress={handleClearLogs}
              accessibilityLabel="Limpar histórico de logs"
              accessibilityRole="button">
              <Text style={styles.clearButtonText}>Limpar Histórico</Text>
            </TouchableOpacity>
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
