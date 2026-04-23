import React, {useReducer, useEffect, useRef, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ScrollView,
  Share,
  Platform,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import {MaterialIcons} from '@expo/vector-icons';
import {getTheme, scaleFontSize} from '../utils/theme';
import type {Theme} from '../utils/theme';
import RuntimeTestRunner from '../services/RuntimeTestRunner';
import {registerAllRuntimeTests} from '../services/runtimeTests';
import {
  generateMarkdownReport,
  generateJSONReport,
} from '../services/RuntimeTestReportService';
import type {
  RuntimeTestResult,
  RuntimeTestSuiteResult,
  TestCategory,
} from '../types/runtime-tests';

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

interface State {
  status: 'idle' | 'running' | 'done';
  results: RuntimeTestResult[];
  completed: number;
  total: number;
  currentTest: string;
  filter: TestCategory | null;
  expandedId: string | null;
  suiteResult: RuntimeTestSuiteResult | null;
}

type Action =
  | {type: 'START'; total: number}
  | {type: 'PROGRESS'; completed: number; total: number; result: RuntimeTestResult}
  | {type: 'DONE'; suite: RuntimeTestSuiteResult}
  | {type: 'FILTER'; category: TestCategory | null}
  | {type: 'TOGGLE_EXPAND'; id: string}
  | {type: 'RESET'};

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'START':
      return {
        ...state,
        status: 'running',
        results: [],
        completed: 0,
        total: action.total,
        currentTest: '',
        expandedId: null,
        suiteResult: null,
      };
    case 'PROGRESS':
      return {
        ...state,
        completed: action.completed,
        total: action.total,
        currentTest: action.result.name,
        results: [...state.results, action.result],
      };
    case 'DONE':
      return {
        ...state,
        status: 'done',
        suiteResult: action.suite,
        results: action.suite.results,
      };
    case 'FILTER':
      return {...state, filter: action.category};
    case 'TOGGLE_EXPAND':
      return {
        ...state,
        expandedId: state.expandedId === action.id ? null : action.id,
      };
    case 'RESET':
      return initialState;
    default:
      return state;
  }
}

const initialState: State = {
  status: 'idle',
  results: [],
  completed: 0,
  total: 0,
  currentTest: '',
  filter: null,
  expandedId: null,
  suiteResult: null,
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function DiagnosticsScreen(): React.JSX.Element {
  const theme = getTheme();
  const styles = createStyles(theme);
  const [state, dispatch] = useReducer(reducer, initialState);
  const registeredRef = useRef(false);

  useEffect(() => {
    if (!registeredRef.current) {
      registerAllRuntimeTests();
      registeredRef.current = true;
    }
  }, []);

  const categories = RuntimeTestRunner.getCategories();

  const runTests = useCallback(
    async (category: TestCategory | null) => {
      const tests = category
        ? RuntimeTestRunner.getTests().filter(t => t.category === category)
        : RuntimeTestRunner.getTests();

      dispatch({type: 'START', total: tests.length});

      const suite = category
        ? await RuntimeTestRunner.runByCategory(category, (c, t, r) =>
            dispatch({type: 'PROGRESS', completed: c, total: t, result: r}),
          )
        : await RuntimeTestRunner.runAll((c, t, r) =>
            dispatch({type: 'PROGRESS', completed: c, total: t, result: r}),
          );

      dispatch({type: 'DONE', suite});
    },
    [],
  );

  const handleExportMarkdown = useCallback(async () => {
    if (!state.suiteResult) {return;}
    const report = generateMarkdownReport(state.suiteResult);

    if (Platform.OS === 'web') {
      await Clipboard.setStringAsync(report);
      return;
    }

    try {
      await Share.share({message: report, title: 'Runtime Test Report'});
    } catch {
      await Clipboard.setStringAsync(report);
    }
  }, [state.suiteResult]);

  const handleCopyJSON = useCallback(async () => {
    if (!state.suiteResult) {return;}
    await Clipboard.setStringAsync(generateJSONReport(state.suiteResult));
  }, [state.suiteResult]);

  const filteredResults = state.filter
    ? state.results.filter(r => r.category === state.filter)
    : state.results;

  // -------------------------------------------------------------------------
  // Render helpers
  // -------------------------------------------------------------------------

  const renderStatusIcon = (status: RuntimeTestResult['status']) => {
    switch (status) {
      case 'passed':
        return <MaterialIcons name="check-circle" size={20} color={theme.colors.success} />;
      case 'failed':
        return <MaterialIcons name="cancel" size={20} color={theme.colors.error} />;
      case 'running':
        return <MaterialIcons name="hourglass-top" size={20} color={theme.colors.warning} />;
      default:
        return <MaterialIcons name="radio-button-unchecked" size={20} color={theme.colors.textDisabled} />;
    }
  };

  const renderItem = ({item}: {item: RuntimeTestResult}) => {
    const expanded = state.expandedId === item.id;
    return (
      <TouchableOpacity
        style={[styles.resultRow, item.status === 'failed' && styles.resultRowFailed]}
        onPress={() => dispatch({type: 'TOGGLE_EXPAND', id: item.id})}
        activeOpacity={0.7}
      >
        <View style={styles.resultRowHeader}>
          {renderStatusIcon(item.status)}
          <View style={styles.resultRowText}>
            <Text style={styles.resultName} numberOfLines={expanded ? undefined : 1}>
              {item.name}
            </Text>
            <View style={styles.resultMeta}>
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryBadgeText}>{item.category}</Text>
              </View>
              <Text style={styles.durationText}>{item.durationMs}ms</Text>
            </View>
          </View>
          <MaterialIcons
            name={expanded ? 'expand-less' : 'expand-more'}
            size={24}
            color={theme.colors.textDisabled}
          />
        </View>

        {expanded && item.status === 'failed' && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorLabel}>Error:</Text>
            <Text style={styles.errorText}>{item.error}</Text>
            {item.stackTrace ? (
              <>
                <Text style={styles.errorLabel}>Stack Trace:</Text>
                <ScrollView horizontal style={styles.stackScroll}>
                  <Text style={styles.stackText}>{item.stackTrace}</Text>
                </ScrollView>
              </>
            ) : null}
          </View>
        )}

        {expanded && item.status === 'passed' && (
          <View style={styles.passedDetail}>
            <Text style={styles.passedDetailText}>
              Concluído com sucesso em {item.durationMs}ms
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderHeader = () => (
    <View>
      {/* Title */}
      <View style={styles.header}>
        <Text style={styles.title}>Diagnóstico</Text>
        <Text style={styles.subtitle}>
          Testes automatizados em dispositivo real
        </Text>
        <Text style={styles.deviceInfo}>
          {Platform.OS} {Platform.Version} • __DEV__={String(typeof __DEV__ !== 'undefined' && __DEV__)}
        </Text>
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        <TouchableOpacity
          style={[styles.runButton, state.status === 'running' && styles.runButtonDisabled]}
          onPress={() => runTests(null)}
          disabled={state.status === 'running'}
        >
          <MaterialIcons name="play-arrow" size={20} color={theme.colors.onPrimary} />
          <Text style={styles.runButtonText}>Executar Todos</Text>
        </TouchableOpacity>

        {state.status === 'done' && (
          <View style={styles.exportButtons}>
            <TouchableOpacity style={styles.exportButton} onPress={handleExportMarkdown}>
              <MaterialIcons name="share" size={18} color={theme.colors.primary} />
              <Text style={styles.exportButtonText}>Exportar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.exportButton} onPress={handleCopyJSON}>
              <MaterialIcons name="content-copy" size={18} color={theme.colors.primary} />
              <Text style={styles.exportButtonText}>JSON</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Category chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chipScroll}
        contentContainerStyle={styles.chipContainer}
      >
        <TouchableOpacity
          style={[styles.chip, state.filter === null && styles.chipActive]}
          onPress={() => dispatch({type: 'FILTER', category: null})}
        >
          <Text style={[styles.chipText, state.filter === null && styles.chipTextActive]}>
            Todos
          </Text>
        </TouchableOpacity>
        {categories.map(cat => (
          <TouchableOpacity
            key={cat}
            style={[styles.chip, state.filter === cat && styles.chipActive]}
            onPress={() => {
              dispatch({type: 'FILTER', category: cat});
              if (state.status === 'idle' || state.status === 'done') {
                runTests(cat);
              }
            }}
          >
            <Text style={[styles.chipText, state.filter === cat && styles.chipTextActive]}>
              {cat}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Progress */}
      {state.status === 'running' && (
        <View style={styles.progress}>
          <View style={styles.progressBarBg}>
            <View
              style={[
                styles.progressBarFill,
                {width: `${state.total > 0 ? (state.completed / state.total) * 100 : 0}%`},
              ]}
            />
          </View>
          <Text style={styles.progressText}>
            {state.completed}/{state.total} testes concluídos
          </Text>
          <Text style={styles.currentTestText} numberOfLines={1}>
            {state.currentTest}
          </Text>
        </View>
      )}

      {/* Summary */}
      {state.status === 'done' && state.suiteResult && (
        <View style={styles.summary}>
          <MaterialIcons
            name={state.suiteResult.failed === 0 ? 'check-circle' : 'error'}
            size={40}
            color={
              state.suiteResult.failed === 0
                ? theme.colors.success
                : theme.colors.error
            }
          />
          <View style={styles.summaryDetails}>
            <Text style={styles.summaryTitle}>
              {state.suiteResult.failed === 0 ? 'Todos os testes passaram' : 'Falhas detectadas'}
            </Text>
            <Text style={styles.summaryStats}>
              {state.suiteResult.passed} passou • {state.suiteResult.failed} falhou •{' '}
              {(state.suiteResult.durationMs / 1000).toFixed(1)}s
            </Text>
          </View>
        </View>
      )}

      {/* Results section header */}
      {state.results.length > 0 && (
        <Text style={styles.sectionTitle}>Resultados</Text>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={filteredResults}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    listContent: {
      paddingBottom: 32,
    },
    header: {
      paddingHorizontal: 16,
      paddingTop: 8,
      paddingBottom: 12,
    },
    title: {
      fontSize: scaleFontSize(32),
      fontWeight: '900',
      color: theme.colors.primary,
      marginBottom: 2,
      letterSpacing: -0.5,
    },
    subtitle: {
      fontSize: scaleFontSize(14),
      color: theme.colors.textSecondary,
      marginBottom: 4,
    },
    deviceInfo: {
      fontSize: scaleFontSize(11),
      color: theme.colors.textDisabled,
      fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    },
    controls: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      gap: 12,
      marginBottom: 8,
    },
    runButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.primaryContainer,
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 8,
      gap: 6,
    },
    runButtonDisabled: {
      opacity: 0.5,
    },
    runButtonText: {
      color: theme.colors.onPrimary,
      fontWeight: '700',
      fontSize: scaleFontSize(14),
    },
    exportButtons: {
      flexDirection: 'row',
      gap: 8,
    },
    exportButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.colors.border,
      gap: 4,
    },
    exportButtonText: {
      color: theme.colors.primary,
      fontWeight: '600',
      fontSize: scaleFontSize(12),
    },
    chipScroll: {
      marginBottom: 8,
    },
    chipContainer: {
      paddingHorizontal: 16,
      gap: 8,
    },
    chip: {
      paddingHorizontal: 14,
      paddingVertical: 6,
      borderRadius: 16,
      backgroundColor: theme.colors.surfaceContainerHigh,
    },
    chipActive: {
      backgroundColor: theme.colors.primaryContainer,
    },
    chipText: {
      fontSize: scaleFontSize(12),
      fontWeight: '600',
      color: theme.colors.textSecondary,
      textTransform: 'capitalize',
    },
    chipTextActive: {
      color: theme.colors.onPrimary,
    },
    progress: {
      paddingHorizontal: 16,
      marginBottom: 12,
    },
    progressBarBg: {
      height: 6,
      backgroundColor: theme.colors.surfaceContainerHigh,
      borderRadius: 3,
      overflow: 'hidden',
      marginBottom: 6,
    },
    progressBarFill: {
      height: '100%',
      backgroundColor: theme.colors.primaryContainer,
      borderRadius: 3,
    },
    progressText: {
      fontSize: scaleFontSize(12),
      color: theme.colors.textSecondary,
      fontWeight: '600',
    },
    currentTestText: {
      fontSize: scaleFontSize(11),
      color: theme.colors.textDisabled,
      marginTop: 2,
    },
    summary: {
      flexDirection: 'row',
      alignItems: 'center',
      marginHorizontal: 16,
      marginBottom: 12,
      padding: 16,
      borderRadius: 12,
      backgroundColor: theme.colors.surfaceContainerLow,
      gap: 12,
    },
    summaryDetails: {
      flex: 1,
    },
    summaryTitle: {
      fontSize: scaleFontSize(16),
      fontWeight: '700',
      color: theme.colors.text,
    },
    summaryStats: {
      fontSize: scaleFontSize(13),
      color: theme.colors.textSecondary,
      marginTop: 2,
    },
    sectionTitle: {
      fontSize: scaleFontSize(14),
      fontWeight: '700',
      color: theme.colors.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
      paddingHorizontal: 16,
      marginTop: 4,
      marginBottom: 8,
    },
    resultRow: {
      marginHorizontal: 16,
      marginBottom: 6,
      padding: 12,
      borderRadius: 10,
      backgroundColor: theme.colors.surfaceContainerLowest,
      borderWidth: 1,
      borderColor: theme.colors.divider,
    },
    resultRowFailed: {
      borderColor: theme.colors.errorLight,
      backgroundColor: '#FFF5F5',
    },
    resultRowHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    resultRowText: {
      flex: 1,
    },
    resultName: {
      fontSize: scaleFontSize(13),
      fontWeight: '600',
      color: theme.colors.text,
    },
    resultMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginTop: 4,
    },
    categoryBadge: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 10,
      backgroundColor: theme.colors.surfaceContainerHigh,
    },
    categoryBadgeText: {
      fontSize: scaleFontSize(10),
      fontWeight: '600',
      color: theme.colors.textSecondary,
      textTransform: 'capitalize',
    },
    durationText: {
      fontSize: scaleFontSize(11),
      color: theme.colors.textDisabled,
    },
    errorContainer: {
      marginTop: 10,
      padding: 10,
      borderRadius: 8,
      backgroundColor: theme.colors.errorLight,
    },
    errorLabel: {
      fontSize: scaleFontSize(11),
      fontWeight: '700',
      color: theme.colors.error,
      marginBottom: 2,
      marginTop: 6,
    },
    errorText: {
      fontSize: scaleFontSize(12),
      color: theme.colors.text,
      fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    },
    stackScroll: {
      maxHeight: 200,
      marginTop: 4,
    },
    stackText: {
      fontSize: scaleFontSize(10),
      color: theme.colors.textSecondary,
      fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
      lineHeight: 16,
    },
    passedDetail: {
      marginTop: 8,
    },
    passedDetailText: {
      fontSize: scaleFontSize(12),
      color: theme.colors.success,
    },
  });
