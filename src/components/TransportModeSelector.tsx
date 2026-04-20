import React from 'react';
import {View, Text, StyleSheet, TouchableOpacity} from 'react-native';
import {TransportMode} from '../services/TransportService';

interface TransportModeSelectorProps {
  selectedMode: TransportMode;
  onSelectMode: (mode: TransportMode) => void;
  disabled?: boolean;
}

const TRANSPORT_OPTIONS: {mode: TransportMode; label: string; icon: string; description: string}[] = [
  {
    mode: 'clipboard',
    label: 'Clipboard',
    icon: '📋',
    description: 'Copiar/Colar manual',
  },
  {
    mode: 'qrcode',
    label: 'QR Code',
    icon: '📱',
    description: 'Leitura via câmera',
  },
];

const TransportModeSelector: React.FC<TransportModeSelectorProps> = ({
  selectedMode,
  onSelectMode,
  disabled = false,
}) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Modo de Transporte</Text>
      <View style={styles.optionsRow}>
        {TRANSPORT_OPTIONS.map(option => {
          const isSelected = selectedMode === option.mode;
          return (
            <TouchableOpacity
              key={option.mode}
              style={[
                styles.option,
                isSelected && styles.optionSelected,
                disabled && styles.optionDisabled,
              ]}
              onPress={() => onSelectMode(option.mode)}
              disabled={disabled}>
              <Text style={styles.optionIcon}>{option.icon}</Text>
              <Text
                style={[
                  styles.optionLabel,
                  isSelected && styles.optionLabelSelected,
                ]}>
                {option.label}
              </Text>
              <Text
                style={[
                  styles.optionDescription,
                  isSelected && styles.optionDescriptionSelected,
                ]}>
                {option.description}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#003366',
    marginBottom: 12,
  },
  optionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  option: {
    flex: 1,
    borderWidth: 2,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  optionSelected: {
    borderColor: '#003366',
    backgroundColor: '#e3f2fd',
  },
  optionDisabled: {
    opacity: 0.5,
  },
  optionIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  optionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
    marginBottom: 2,
  },
  optionLabelSelected: {
    color: '#003366',
  },
  optionDescription: {
    fontSize: 10,
    color: '#999',
    textAlign: 'center',
  },
  optionDescriptionSelected: {
    color: '#1976d2',
  },
});

export default TransportModeSelector;
