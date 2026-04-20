import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import {ConsentData, Predicate} from '../types';
import {formatAttributeName} from '../utils/formatters';

interface ConsentModalProps {
  visible: boolean;
  consentData: ConsentData | null;
  selectedAttributes: string[];
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
  onAttributeToggle,
  onApprove,
  onCancel,
}) => {
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
                  ✓ Atributos Obrigatórios
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
                      onPress={() => onAttributeToggle(attr)}>
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
                    <Text style={styles.predicateIcon}>🔒</Text>
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
              onPress={onCancel}>
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.approveButton]}
              onPress={onApprove}>
              <Text style={styles.approveButtonText}>Aprovar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    width: '90%',
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#003366',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
  },
  content: {
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#003366',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 13,
    color: '#666',
    marginBottom: 12,
    fontStyle: 'italic',
  },
  attributeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    marginBottom: 8,
  },
  selectableAttribute: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  selectedAttribute: {
    backgroundColor: '#e3f2fd',
    borderColor: '#2196f3',
  },
  attributeIcon: {
    marginRight: 12,
    width: 24,
    alignItems: 'center',
  },
  requiredIcon: {
    fontSize: 16,
    color: '#c62828',
  },
  optionalIcon: {
    fontSize: 20,
    color: '#666',
  },
  selectedIcon: {
    color: '#2196f3',
  },
  attributeText: {
    fontSize: 15,
    color: '#333',
    flex: 1,
  },
  selectedText: {
    color: '#1976d2',
    fontWeight: '500',
  },
  predicateItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#fff3e0',
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#ffb74d',
  },
  predicateIcon: {
    fontSize: 16,
    marginRight: 12,
  },
  predicateText: {
    fontSize: 14,
    color: '#e65100',
    flex: 1,
  },
  summary: {
    backgroundColor: '#e8f5e9',
    borderRadius: 8,
    padding: 16,
    marginTop: 8,
  },
  summaryTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#2e7d32',
    marginBottom: 8,
  },
  summaryText: {
    fontSize: 14,
    color: '#388e3c',
    marginBottom: 4,
  },
  actions: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    gap: 12,
  },
  button: {
    flex: 1,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  approveButton: {
    backgroundColor: '#003366',
  },
  approveButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ConsentModal;
