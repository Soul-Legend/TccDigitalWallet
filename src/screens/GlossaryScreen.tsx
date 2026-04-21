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
      backgroundColor: theme.colors.primary,
      padding: theme.spacing.lg,
      paddingTop: theme.spacing.lg,
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
    },
    searchContainer: {
      padding: theme.spacing.md,
      backgroundColor: theme.colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.divider,
    },
    searchInput: {
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.medium,
      padding: theme.spacing.md,
      fontSize: scaleFontSize(theme.typography.fontSizeLarge),
      backgroundColor: theme.colors.background,
      minHeight: MIN_TOUCH_TARGET_SIZE,
    },
    categoryScroll: {
      backgroundColor: theme.colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.divider,
    },
    categoryContainer: {
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.md,
      gap: theme.spacing.sm,
    },
    categoryButton: {
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      borderRadius: 20,
      backgroundColor: theme.colors.background,
      borderWidth: 1,
      borderColor: theme.colors.border,
      minHeight: MIN_TOUCH_TARGET_SIZE,
      justifyContent: 'center',
    },
    categoryButtonActive: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    categoryButtonText: {
      fontSize: scaleFontSize(theme.typography.fontSizeBase),
      color: theme.colors.textSecondary,
      fontWeight: '500',
    },
    categoryButtonTextActive: {
      color: theme.colors.surface,
      fontWeight: 'bold',
    },
    termsList: {
      flex: 1,
      padding: theme.spacing.md,
    },
    termCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.medium,
      padding: theme.spacing.md,
      marginBottom: theme.spacing.md,
      ...(theme.shadows.medium as any),
    },
    termHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: theme.spacing.sm,
    },
    termTitle: {
      fontSize: scaleFontSize(theme.typography.fontSizeLarge),
      fontWeight: 'bold',
      color: theme.colors.primary,
      flex: 1,
      marginRight: theme.spacing.sm,
    },
    categoryBadge: {
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
      borderRadius: theme.borderRadius.large,
    },
    categoryBadgeText: {
      fontSize: scaleFontSize(theme.typography.fontSizeSmall - 1),
      color: theme.colors.surface,
      fontWeight: '600',
    },
    termDefinition: {
      fontSize: scaleFontSize(theme.typography.fontSizeBase),
      color: theme.colors.text,
      lineHeight: scaleFontSize(theme.typography.lineHeightBase),
    },
    emptyState: {
      alignItems: 'center',
      justifyContent: 'center',
      padding: theme.spacing.xl,
      marginTop: theme.spacing.xl,
    },
    emptyStateIcon: {
      fontSize: 64,
      marginBottom: theme.spacing.md,
    },
    emptyStateText: {
      fontSize: scaleFontSize(theme.typography.fontSizeLarge + 2),
      fontWeight: '600',
      color: theme.colors.textSecondary,
      marginBottom: theme.spacing.sm,
    },
    emptyStateSubtext: {
      fontSize: scaleFontSize(theme.typography.fontSizeBase),
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
        <Text style={styles.title}>Glossário SSI</Text>
        <Text style={styles.subtitle}>
          Termos e definições de Identidade Auto-Soberana
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
