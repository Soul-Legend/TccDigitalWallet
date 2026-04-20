import React from 'react';
import {View, Text, StyleSheet, TouchableOpacity} from 'react-native';
import {formatAttributeName} from '../utils/formatters';

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
              disabled={disabled}>
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

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 16,
    marginVertical: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#003366',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: '#666',
    marginBottom: 16,
  },
  attributeList: {
    gap: 8,
  },
  attributeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  selectedItem: {
    backgroundColor: '#e3f2fd',
    borderColor: '#2196f3',
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
    fontSize: 20,
    color: '#666',
  },
  checkboxIconSelected: {
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
  disabledText: {
    color: '#999',
  },
  summary: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  summaryText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    fontWeight: '500',
  },
  emptyState: {
    padding: 24,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
  },
});

export default AttributeSelector;
