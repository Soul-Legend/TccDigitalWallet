import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {MaterialCommunityIcons} from '@expo/vector-icons';
import {getTheme, scaleFontSize, Theme} from '../utils/theme';

interface SuccessMessageProps {
  message: string;
  details?: string;
}

const SuccessMessage: React.FC<SuccessMessageProps> = ({message, details}) => {
  const theme = getTheme();
  const styles = createStyles(theme);

  return (
    <View
      style={styles.container}
      accessible={true}
      accessibilityLabel={`Sucesso: ${message}${details ? '. ' + details : ''}`}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite">
      <MaterialCommunityIcons name="check-circle" size={24} color={theme.colors.success} style={styles.icon} />
      <Text style={styles.message}>{message}</Text>
      {details && <Text style={styles.details}>{details}</Text>}
    </View>
  );
};

const createStyles = (theme: Theme) => StyleSheet.create({
  container: {
    backgroundColor: theme.colors.successLight,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.success,
    padding: theme.spacing.md,
    marginVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.small,
  },
  icon: {
    fontSize: scaleFontSize(24),
    marginBottom: theme.spacing.sm,
    color: theme.colors.success,
  },
  message: {
    fontSize: scaleFontSize(16),
    fontWeight: 'bold',
    color: theme.colors.success,
    marginBottom: theme.spacing.xs,
  },
  details: {
    fontSize: scaleFontSize(14),
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
});

export default SuccessMessage;
