import React from 'react';
import {View, TouchableOpacity, StyleSheet} from 'react-native';
import {getTheme} from '../utils/theme';

interface AppCardProps {
  children: React.ReactNode;
  variant?: 'default' | 'elevated' | 'outlined';
  style?: any;
  onPress?: () => void;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  accessibilityRole?: string;
}

const AppCard: React.FC<AppCardProps> = ({
  children,
  variant = 'default',
  style,
  onPress,
  accessibilityLabel,
  accessibilityHint,
  accessibilityRole,
}) => {
  const theme = getTheme();

  const getShadow = () => {
    switch (variant) {
      case 'default':
        return theme.shadows.medium;
      case 'elevated':
        return theme.shadows.large;
      case 'outlined':
        return {};
    }
  };

  const cardStyles = [
    styles.card,
    {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.large,
      padding: theme.spacing.md,
      ...getShadow(),
    },
    variant === 'outlined' && {
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    style,
  ];

  if (onPress) {
    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.7}
        style={cardStyles}
        accessibilityRole={(accessibilityRole as any) || 'button'}
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={accessibilityHint}>
        {children}
      </TouchableOpacity>
    );
  }

  return (
    <View
      style={cardStyles}
      accessibilityRole={accessibilityRole as any}
      accessibilityLabel={accessibilityLabel}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
  },
});

export default AppCard;
