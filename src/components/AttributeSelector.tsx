import React from 'react';
import {View, Text, StyleSheet, TouchableOpacity} from 'react-native';
import {formatAttributeName} from '../utils/formatters';
import {getTheme, scaleFontSize, Theme} from '../utils/theme';

interface AttributeSelectorProps {
  attributes: string[];
  selectedAttributes: string[];
  onToggle: (attribute: string) => void;
  disabled?: boolean;
}

/**
 * AttributeSelector - Component for selecting optional attributes
 *
 * This component:
 * - Displays a list of selectable attributes
 * - Allows toggling selection state
 * - Shows visual feedback for selected/unselected states
 */
const AttributeSelector: React.FC<AttributeSelectorProps> = ({
  attributes,
  selectedAttributes,
  onToggle,
  disabled = false,
}) => {
  const theme = getTheme();
  const styles = createStyles(theme);

  if (attributes.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyStateText}>
          Nenhum atributo opcional disponível
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Selecione os atributos opcionais:</Text>
      <Text style={styles.subtitle}>
        Toque para selecionar ou desselecionar
      </Text>

      <View style={styles.attributeList}>
        {attributes.map(attr => {
          const isSelected = selectedAttributes.includes(attr);
          return (
            <TouchableOpacity
              key={attr}
              style={[
                styles.attributeItem,
                isSelected && styles.selectedItem,
                disabled && styles.disabledItem,
              ]}
              onPress={() => !disabled && onToggle(attr)}
              disabled={disabled}
              accessibilityLabel={`${formatAttributeName(attr)}${isSelected ? ', selecionado' : ', não selecionado'}`}
              accessibilityRole="checkbox">
              <View style={styles.checkbox}>
                <Text
                  style={[
                    styles.checkboxIcon,
                    isSelected && styles.checkboxIconSelected,
                  ]}>
                  {isSelected ? '☑' : '☐'}
                </Text>
              </View>
              <Text
                style={[
                  styles.attributeText,
                  isSelected && styles.selectedText,
                  disabled && styles.disabledText,
                ]}>
                {formatAttributeName(attr)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.summary}>
        <Text style={styles.summaryText}>
          {selectedAttributes.length} de {attributes.length} selecionado(s)
        </Text>
      </View>
    </View>
  );
};

const createStyles = (theme: Theme) => StyleSheet.create({
  container: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.medium,
    padding: theme.spacing.md,
    marginVertical: theme.spacing.sm,
  },
  title: {
    fontSize: scaleFontSize(16),
    fontWeight: 'bold',
    color: theme.colors.primary,
    marginBottom: theme.spacing.xs,
  },
  subtitle: {
    fontSize: scaleFontSize(13),
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.md,
  },
  attributeList: {
    gap: theme.spacing.sm,
  },
  attributeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.medium,
    borderWidth: 1,
    borderColor: theme.colors.divider,
  },
  selectedItem: {
    backgroundColor: theme.colors.background,
    borderColor: theme.colors.secondary,
  },
  disabledItem: {
    opacity: 0.5,
  },
  checkbox: {
    marginRight: 12,
    width: 24,
    alignItems: 'center',
  },
  checkboxIcon: {
    fontSize: scaleFontSize(20),
    color: theme.colors.textSecondary,
  },
  checkboxIconSelected: {
    color: theme.colors.secondary,
  },
  attributeText: {
    fontSize: scaleFontSize(15),
    color: theme.colors.text,
    flex: 1,
  },
  selectedText: {
    color: theme.colors.secondary,
    fontWeight: '500',
  },
  disabledText: {
    color: theme.colors.textDisabled,
  },
  summary: {
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.divider,
  },
  summaryText: {
    fontSize: scaleFontSize(14),
    color: theme.colors.textSecondary,
    textAlign: 'center',
    fontWeight: '500',
  },
  emptyState: {
    padding: theme.spacing.lg,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: scaleFontSize(14),
    color: theme.colors.textDisabled,
    fontStyle: 'italic',
  },
});

export default AttributeSelector;
