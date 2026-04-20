import React from 'react';
import {View, ActivityIndicator, Text, StyleSheet} from 'react-native';

interface LoadingIndicatorProps {
  message?: string;
  size?: 'small' | 'large';
}

const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({
  message = 'Processando...',
  size = 'large',
}) => {
  return (
    <View
      style={styles.container}
      accessible={true}
      accessibilityLabel={`Carregando: ${message}`}
      accessibilityRole="progressbar"
      accessibilityLiveRegion="polite">
      <ActivityIndicator size={size} color="#003366" />
      {message && <Text style={styles.message}>{message}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  message: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
});

export default LoadingIndicator;
