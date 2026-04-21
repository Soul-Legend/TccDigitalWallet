import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {MaterialCommunityIcons} from '@expo/vector-icons';
import {getTheme, scaleFontSize, Theme} from '../utils/theme';

interface ErrorMessageProps {
  message: string;
  details?: string;
}

const ErrorMessage: React.FC<ErrorMessageProps> = ({message, details}) => {
  const theme = getTheme();
  const styles = createStyles(theme);

  return (
    <View
      style={styles.container}
      accessible={true}
      accessibilityLabel={`Erro: ${message}${details ? '. ' + details : ''}`}
      accessibilityRole="alert"
      accessibilityLiveRegion="assertive">
      <MaterialCommunityIcons name="alert" size={24} color={theme.colors.error} style={styles.icon} />
      <Text style={styles.message}>{message}</Text>
      {details && <Text style={styles.details}>{details}</Text>}
    </View>
  );
};

const createStyles = (theme: Theme) => StyleSheet.create({
  container: {
    backgroundColor: theme.colors.errorLight,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.error,
    padding: theme.spacing.md,
    marginVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.small,
  },
  icon: {
    fontSize: scaleFontSize(24),
    marginBottom: theme.spacing.sm,
  },
  message: {
    fontSize: scaleFontSize(16),
    fontWeight: 'bold',
    color: theme.colors.error,
    marginBottom: theme.spacing.xs,
  },
  details: {
    fontSize: scaleFontSize(14),
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
});

export default ErrorMessage;
