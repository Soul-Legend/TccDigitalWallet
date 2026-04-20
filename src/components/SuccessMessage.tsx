import React from 'react';
import {View, Text, StyleSheet} from 'react-native';

interface SuccessMessageProps {
  message: string;
  details?: string;
}

const SuccessMessage: React.FC<SuccessMessageProps> = ({message, details}) => {
  return (
    <View
      style={styles.container}
      accessible={true}
      accessibilityLabel={`Sucesso: ${message}${details ? '. ' + details : ''}`}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite">
      <Text style={styles.icon} accessible={false}>✓</Text>
      <Text style={styles.message}>{message}</Text>
      {details && <Text style={styles.details}>{details}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#e8f5e9',
    borderLeftWidth: 4,
    borderLeftColor: '#2e7d32',
    padding: 16,
    marginVertical: 8,
    borderRadius: 4,
  },
  icon: {
    fontSize: 24,
    marginBottom: 8,
    color: '#2e7d32',
  },
  message: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2e7d32',
    marginBottom: 4,
  },
  details: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
});

export default SuccessMessage;
