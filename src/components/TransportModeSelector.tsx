import React from 'react';
import {View, Text, StyleSheet, TouchableOpacity} from 'react-native';
import {MaterialCommunityIcons} from '@expo/vector-icons';
import {TransportMode} from '../services/TransportService';
import {getTheme, scaleFontSize, Theme} from '../utils/theme';

interface TransportModeSelectorProps {
  selectedMode: TransportMode;
  onSelectMode: (mode: TransportMode) => void;
  disabled?: boolean;
}

const TRANSPORT_OPTIONS: {mode: TransportMode; label: string; icon: React.ComponentProps<typeof MaterialCommunityIcons>['name']; description: string}[] = [
  {
    mode: 'clipboard',
    label: 'Clipboard',
    icon: 'clipboard-text',
    description: 'Copiar/Colar manual',
  },
  {
    mode: 'qrcode',
    label: 'QR Code',
    icon: 'qrcode',
    description: 'Leitura via câmera',
  },
];

const TransportModeSelector: React.FC<TransportModeSelectorProps> = ({
  selectedMode,
  onSelectMode,
  disabled = false,
}) => {
  const theme = getTheme();
  const styles = createStyles(theme);

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
              disabled={disabled}
              accessibilityLabel={`${option.label}: ${option.description}${isSelected ? ', selecionado' : ''}`}
              accessibilityRole="button">
              <MaterialCommunityIcons name={option.icon} size={24} color={isSelected ? theme.colors.primary : theme.colors.textSecondary} style={styles.optionIcon} />
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

const createStyles = (theme: Theme) => StyleSheet.create({
  container: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.medium,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  title: {
    fontSize: scaleFontSize(16),
    fontWeight: 'bold',
    color: theme.colors.primary,
    marginBottom: 12,
  },
  optionsRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  option: {
    flex: 1,
    borderWidth: 2,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.medium,
    padding: 12,
    alignItems: 'center',
  },
  optionSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.background,
  },
  optionDisabled: {
    opacity: 0.5,
  },
  optionIcon: {
    fontSize: scaleFontSize(24),
    marginBottom: theme.spacing.xs,
  },
  optionLabel: {
    fontSize: scaleFontSize(13),
    fontWeight: '600',
    color: theme.colors.textSecondary,
    marginBottom: 2,
  },
  optionLabelSelected: {
    color: theme.colors.primary,
  },
  optionDescription: {
    fontSize: scaleFontSize(10),
    color: theme.colors.textDisabled,
    textAlign: 'center',
  },
  optionDescriptionSelected: {
    color: theme.colors.secondary,
  },
});

export default TransportModeSelector;
