import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import {MaterialCommunityIcons} from '@expo/vector-icons';
import {ConsentData, Predicate} from '../types';
import {formatAttributeName} from '../utils/formatters';
import {getTheme, scaleFontSize, Theme} from '../utils/theme';

interface ConsentModalProps {
  visible: boolean;
  consentData: ConsentData | null;
  selectedAttributes: string[];
  isGenerating?: boolean;
  onAttributeToggle: (attribute: string) => void;
  onApprove: () => void;
  onCancel: () => void;
}

/**
 * ConsentModal - Modal for displaying requested attributes and obtaining user consent
 *
 * This component:
 * - Displays required and optional attributes
 * - Allows selection/deselection of optional attributes
 * - Shows predicates if any
 * - Provides approve/cancel actions
 */
const ConsentModal: React.FC<ConsentModalProps> = ({
  visible,
  consentData,
  selectedAttributes,
  isGenerating = false,
  onAttributeToggle,
  onApprove,
  onCancel,
}) => {
  const theme = getTheme();
  const styles = createStyles(theme);

  if (!consentData) {
    return null;
  }



  /**
   * Formats predicate for display
   */
  const formatPredicate = (predicate: Predicate): string => {
    const operatorMap: Record<string, string> = {
      '>=': 'maior ou igual a',
      '<=': 'menor ou igual a',
      '==': 'igual a',
      '!=': 'diferente de',
    };

    const operatorText = operatorMap[predicate.p_type] || predicate.p_type;

    // Special formatting for age verification
    if (predicate.attribute === 'data_nascimento' && predicate.p_type === '>=' && predicate.value === 18) {
      return 'Idade maior ou igual a 18 anos (sem revelar data de nascimento)';
    }

    return `${formatAttributeName(predicate.attribute)} ${operatorText} ${predicate.value}`;
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <View style={styles.header}>
            <Text style={styles.title}>Solicitação de Apresentação</Text>
            <Text style={styles.subtitle}>
              Revise os atributos solicitados antes de aprovar
            </Text>
          </View>

          <ScrollView style={styles.content}>
            {/* Required Attributes */}
            {consentData.required_attributes.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  <MaterialCommunityIcons name="check-circle" size={16} color={theme.colors.success} /> Atributos Obrigatórios
                </Text>
                <Text style={styles.sectionDescription}>
                  Estes atributos são necessários e serão compartilhados
                </Text>
                {consentData.required_attributes.map(attr => (
                  <View key={attr} style={styles.attributeItem}>
                    <View style={styles.attributeIcon}>
                      <Text style={styles.requiredIcon}>●</Text>
                    </View>
                    <Text style={styles.attributeText}>
                      {formatAttributeName(attr)}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {/* Optional Attributes */}
            {consentData.optional_attributes.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>○ Atributos Opcionais</Text>
                <Text style={styles.sectionDescription}>
                  Você pode escolher quais atributos compartilhar
                </Text>
                {consentData.optional_attributes.map(attr => {
                  const isSelected = selectedAttributes.includes(attr);
                  return (
                    <TouchableOpacity
                      key={attr}
                      style={[
                        styles.attributeItem,
                        styles.selectableAttribute,
                        isSelected && styles.selectedAttribute,
                      ]}
                      onPress={() => onAttributeToggle(attr)}
                      accessibilityLabel={`${formatAttributeName(attr)}${isSelected ? ', selecionado' : ', não selecionado'}`}
                      accessibilityRole="checkbox">
                      <View style={styles.attributeIcon}>
                        <Text
                          style={[
                            styles.optionalIcon,
                            isSelected && styles.selectedIcon,
                          ]}>
                          {isSelected ? '☑' : '☐'}
                        </Text>
                      </View>
                      <Text
                        style={[
                          styles.attributeText,
                          isSelected && styles.selectedText,
                        ]}>
                        {formatAttributeName(attr)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {/* Predicates */}
            {consentData.predicates && consentData.predicates.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>⚡ Provas Solicitadas</Text>
                <Text style={styles.sectionDescription}>
                  Provas matemáticas sem revelar valores exatos
                </Text>
                {consentData.predicates.map((predicate, index) => (
                  <View key={index} style={styles.predicateItem}>
                    <MaterialCommunityIcons name="lock" size={18} color={theme.colors.primary} style={styles.predicateIcon} />
                    <Text style={styles.predicateText}>
                      {formatPredicate(predicate)}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {/* Summary */}
            <View style={styles.summary}>
              <Text style={styles.summaryTitle}>Resumo</Text>
              <Text style={styles.summaryText}>
                {selectedAttributes.length} atributo(s) será(ão) compartilhado(s)
              </Text>
              {consentData.predicates && consentData.predicates.length > 0 && (
                <Text style={styles.summaryText}>
                  {consentData.predicates.length} prova(s) será(ão) gerada(s)
                </Text>
              )}
            </View>
          </ScrollView>

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={onCancel}
              disabled={isGenerating}
              accessibilityLabel="Cancelar compartilhamento"
              accessibilityRole="button">
              <Text style={[styles.cancelButtonText, isGenerating && {opacity: 0.5}]}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.approveButton, isGenerating && {opacity: 0.7}]}
              onPress={onApprove}
              disabled={isGenerating}
              accessibilityLabel={isGenerating ? 'Gerando apresentação' : 'Aprovar compartilhamento de atributos'}
              accessibilityRole="button">
              {isGenerating ? (
                <View style={{flexDirection: 'row', alignItems: 'center', gap: 8}}>
                  <ActivityIndicator size="small" color={theme.colors.surface} />
                  <Text style={styles.approveButtonText}>Gerando...</Text>
                </View>
              ) : (
                <Text style={styles.approveButtonText}>Aprovar</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const createStyles = (theme: Theme) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: theme.colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    width: '90%',
    maxHeight: '80%',
    ...(theme.shadows.large as any),
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider,
  },
  title: {
    fontSize: scaleFontSize(22),
    fontWeight: 'bold',
    color: theme.colors.primary,
    marginBottom: theme.spacing.sm,
  },
  subtitle: {
    fontSize: scaleFontSize(14),
    color: theme.colors.textSecondary,
  },
  content: {
    padding: 20,
  },
  section: {
    marginBottom: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: scaleFontSize(16),
    fontWeight: 'bold',
    color: theme.colors.primary,
    marginBottom: theme.spacing.sm,
  },
  sectionDescription: {
    fontSize: scaleFontSize(13),
    color: theme.colors.textSecondary,
    marginBottom: 12,
    fontStyle: 'italic',
  },
  attributeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.medium,
    marginBottom: theme.spacing.sm,
  },
  selectableAttribute: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  selectedAttribute: {
    backgroundColor: '#e3f2fd',
    borderColor: theme.colors.secondary,
  },
  attributeIcon: {
    marginRight: 12,
    width: 24,
    alignItems: 'center',
  },
  requiredIcon: {
    fontSize: scaleFontSize(16),
    color: theme.colors.error,
  },
  optionalIcon: {
    fontSize: scaleFontSize(20),
    color: theme.colors.textSecondary,
  },
  selectedIcon: {
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
  predicateItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: theme.colors.warningLight,
    borderRadius: theme.borderRadius.medium,
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.warning,
  },
  predicateIcon: {
    fontSize: scaleFontSize(16),
    marginRight: 12,
  },
  predicateText: {
    fontSize: scaleFontSize(14),
    color: theme.colors.warning,
    flex: 1,
  },
  summary: {
    backgroundColor: theme.colors.successLight,
    borderRadius: theme.borderRadius.medium,
    padding: theme.spacing.md,
    marginTop: theme.spacing.sm,
  },
  summaryTitle: {
    fontSize: scaleFontSize(15),
    fontWeight: 'bold',
    color: theme.colors.success,
    marginBottom: theme.spacing.sm,
  },
  summaryText: {
    fontSize: scaleFontSize(14),
    color: theme.colors.success,
    marginBottom: theme.spacing.xs,
  },
  actions: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: theme.colors.divider,
    gap: 12,
  },
  button: {
    flex: 1,
    borderRadius: theme.borderRadius.medium,
    padding: theme.spacing.md,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  cancelButtonText: {
    color: theme.colors.textSecondary,
    fontSize: scaleFontSize(16),
    fontWeight: '600',
  },
  approveButton: {
    backgroundColor: theme.colors.primary,
  },
  approveButtonText: {
    color: theme.colors.surface,
    fontSize: scaleFontSize(16),
    fontWeight: '600',
  },
});

export default ConsentModal;
