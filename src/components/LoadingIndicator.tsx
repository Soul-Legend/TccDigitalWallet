import React from 'react';
import {View, ActivityIndicator, Text, StyleSheet} from 'react-native';
import {getTheme, scaleFontSize, Theme} from '../utils/theme';

interface LoadingIndicatorProps {
  message?: string;
  size?: 'small' | 'large';
}

const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({
  message = 'Processando...',
  size = 'large',
}) => {
  const theme = getTheme();
  const styles = createStyles(theme);

  return (
    <View
      style={styles.container}
      accessible={true}
      accessibilityLabel={`Carregando: ${message}`}
      accessibilityRole="progressbar"
      accessibilityLiveRegion="polite">
      <ActivityIndicator size={size} color={theme.colors.primary} />
      {message && <Text style={styles.message}>{message}</Text>}
    </View>
  );
};

const createStyles = (theme: Theme) => StyleSheet.create({
  container: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  message: {
    marginTop: 12,
    fontSize: scaleFontSize(14),
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
});

export default LoadingIndicator;
