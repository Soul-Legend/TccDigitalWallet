import React, {useState, useMemo} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import {
  glossary,
  searchGlossary,
  getTermsByCategory,
  GlossaryTerm,
} from '../utils/glossary';
import {MIN_TOUCH_TARGET_SIZE} from '../utils/accessibility';
import {getTheme, scaleFontSize} from '../utils/theme';
import type {Theme} from '../utils/theme';

// Hoisted out of the component body — these never change between renders.
const CATEGORIES = [
  {id: 'all', label: 'Todos', value: null},
  {id: 'identity', label: 'Identidade', value: 'identity'},
  {id: 'cryptography', label: 'Criptografia', value: 'cryptography'},
  {id: 'credential', label: 'Credenciais', value: 'credential'},
  {id: 'protocol', label: 'Protocolos', value: 'protocol'},
] as const;

const CATEGORY_COLORS: Record<string, string> = {
  identity: '#2196f3',
  cryptography: '#9c27b0',
  credential: '#4caf50',
  protocol: '#ff9800',
};

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
      color: theme.colors.text,
      marginBottom: 4,
      letterSpacing: -0.5,
    },
    subtitle: {
      fontSize: scaleFontSize(14),
      color: theme.colors.textSecondary,
      lineHeight: 20,
    },
    searchContainer: {
      paddingHorizontal: 16,
      paddingVertical: 8,
    },
    searchInput: {
      borderWidth: 0,
      borderRadius: 24,
      padding: 14,
      paddingHorizontal: 20,
      fontSize: scaleFontSize(14),
      backgroundColor: theme.colors.surfaceContainerHighest,
      minHeight: MIN_TOUCH_TARGET_SIZE,
      color: theme.colors.text,
    },
    categoryScroll: {
      flexGrow: 0,
      flexShrink: 0,
    },
    categoryContainer: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      gap: 8,
    },
    categoryButton: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      backgroundColor: theme.colors.surfaceContainerLow,
    },
    categoryButtonActive: {
      backgroundColor: theme.colors.primary,
    },
    categoryButtonText: {
      fontSize: scaleFontSize(13),
      color: theme.colors.text,
      fontWeight: '500',
    },
    categoryButtonTextActive: {
      color: theme.colors.onPrimary,
      fontWeight: '700',
    },
    termsList: {
      flex: 1,
      padding: 16,
    },
    termCard: {
      backgroundColor: theme.colors.surfaceContainerLow,
      borderRadius: 12,
      padding: 20,
      marginBottom: 12,
      ...theme.shadows.small as object,
    },
    termHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 8,
    },
    termTitle: {
      fontSize: scaleFontSize(20),
      fontWeight: '700',
      color: theme.colors.primary,
      flex: 1,
      marginRight: 8,
      letterSpacing: -0.3,
    },
    categoryBadge: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 4,
    },
    categoryBadgeText: {
      fontSize: scaleFontSize(11),
      color: theme.colors.onPrimary,
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    termDefinition: {
      fontSize: scaleFontSize(14),
      color: theme.colors.text,
      lineHeight: 22,
    },
    emptyState: {
      alignItems: 'center',
      justifyContent: 'center',
      padding: 32,
      marginTop: 32,
    },
    emptyStateIcon: {
      fontSize: 64,
      marginBottom: 16,
    },
    emptyStateText: {
      fontSize: scaleFontSize(18),
      fontWeight: '600',
      color: theme.colors.textDisabled,
      marginBottom: 8,
    },
    emptyStateSubtext: {
      fontSize: scaleFontSize(14),
      color: theme.colors.textDisabled,
      textAlign: 'center',
    },
  });

const GlossaryScreen: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const theme = getTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const categories = CATEGORIES;

  // Filter terms based on search and category. Memoised so we don't sort
  // and reallocate on every keystroke when the query hasn't changed.
  const filteredTerms = useMemo<GlossaryTerm[]>(() => {
    let terms: GlossaryTerm[] = glossary;
    if (selectedCategory) {
      terms = getTermsByCategory(selectedCategory as any);
    }
    if (searchQuery.trim()) {
      terms = searchGlossary(searchQuery);
    }
    return [...terms].sort((a, b) => a.term.localeCompare(b.term));
  }, [searchQuery, selectedCategory]);

  const getCategoryColor = (category: string): string =>
    CATEGORY_COLORS[category] || theme.colors.textSecondary;

  const getCategoryLabel = (category: string): string => {
    const labels: Record<string, string> = {
      identity: 'Identidade',
      cryptography: 'Criptografia',
      credential: 'Credencial',
      protocol: 'Protocolo',
    };
    return labels[category] || category;
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Glossário</Text>
        <Text style={styles.subtitle}>
          Terminologia oficial para a arquitetura de Identidade Autossoberana (SSI).
        </Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar termo..."
          placeholderTextColor={theme.colors.textDisabled}
          value={searchQuery}
          onChangeText={setSearchQuery}
          accessible={true}
          accessibilityLabel="Campo de busca de termos"
          accessibilityHint="Digite para buscar termos no glossário"
        />
      </View>

      {/* Category Filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoryScroll}
        contentContainerStyle={styles.categoryContainer}>
        {categories.map(cat => (
          <TouchableOpacity
            key={cat.id}
            style={[
              styles.categoryButton,
              selectedCategory === cat.value && styles.categoryButtonActive,
            ]}
            onPress={() => setSelectedCategory(cat.value)}
            accessible={true}
            accessibilityLabel={`Filtrar por categoria ${cat.label}`}
            accessibilityRole="button"
            accessibilityState={{selected: selectedCategory === cat.value}}>
            <Text
              style={[
                styles.categoryButtonText,
                selectedCategory === cat.value &&
                  styles.categoryButtonTextActive,
              ]}>
              {cat.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Terms List */}
      <ScrollView style={styles.termsList}>
        {filteredTerms.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateIcon}>🔍</Text>
            <Text style={styles.emptyStateText}>
              Nenhum termo encontrado
            </Text>
            <Text style={styles.emptyStateSubtext}>
              Tente ajustar sua busca ou filtro
            </Text>
          </View>
        ) : (
          filteredTerms.map((term, index) => (
            <View
              key={index}
              style={styles.termCard}
              accessible={true}
              accessibilityLabel={`Termo: ${term.term}`}
              accessibilityHint={term.definition}
              accessibilityRole="text">
              <View style={styles.termHeader}>
                <Text style={styles.termTitle}>{term.term}</Text>
                <View
                  style={[
                    styles.categoryBadge,
                    {backgroundColor: getCategoryColor(term.category)},
                  ]}>
                  <Text style={styles.categoryBadgeText}>
                    {getCategoryLabel(term.category)}
                  </Text>
                </View>
              </View>
              <Text style={styles.termDefinition}>{term.definition}</Text>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
};

export default GlossaryScreen;
