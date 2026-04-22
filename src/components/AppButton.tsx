import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import {getTheme, scaleFontSize} from '../utils/theme';

interface AppButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'outline';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  style?: any;
}

const AppButton: React.FC<AppButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  icon,
  accessibilityLabel,
  accessibilityHint,
  style,
}) => {
  const theme = getTheme();

  const handlePress = () => {
    if (disabled || loading) { return; }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  const getBackgroundColor = () => {
    if (disabled) { return theme.colors.textDisabled; }
    switch (variant) {
      case 'primary':
        return theme.colors.primary;
      case 'secondary':
        return theme.colors.secondary;
      case 'danger':
        return theme.colors.error;
      case 'outline':
        return 'transparent';
    }
  };

  const getTextColor = () => {
    if (disabled && variant === 'outline') { return theme.colors.textDisabled; }
    if (variant === 'outline') { return theme.colors.primary; }
    if (disabled) { return '#ffffff'; }
    return '#ffffff';
  };

  const getPadding = () => {
    switch (size) {
      case 'small':
        return {paddingVertical: theme.spacing.sm, paddingHorizontal: theme.spacing.md};
      case 'medium':
        return {paddingVertical: theme.spacing.md, paddingHorizontal: theme.spacing.lg};
      case 'large':
        return {paddingVertical: theme.spacing.lg, paddingHorizontal: theme.spacing.xl};
    }
  };

  const getFontSize = () => {
    switch (size) {
      case 'small':
        return scaleFontSize(theme.typography.fontSizeSmall);
      case 'medium':
        return scaleFontSize(theme.typography.fontSizeBase);
      case 'large':
        return scaleFontSize(theme.typography.fontSizeLarge);
    }
  };

  const buttonStyles = [
    styles.button,
    {
      backgroundColor: getBackgroundColor(),
      borderRadius: theme.borderRadius.medium,
      ...getPadding(),
    },
    variant === 'outline' && {
      borderWidth: 2,
      borderColor: disabled ? theme.colors.textDisabled : theme.colors.primary,
    },
    style,
  ];

  const textColor = getTextColor();

  return (
    <TouchableOpacity
      onPress={handlePress}
      disabled={disabled || loading}
      activeOpacity={0.7}
      style={buttonStyles}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || title}
      accessibilityHint={accessibilityHint}
      accessibilityState={{disabled: disabled || loading, busy: loading}}>
      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator
            size="small"
            color={textColor}
            style={styles.indicator}
          />
        ) : icon ? (
          <View style={styles.icon}>{icon}</View>
        ) : null}
        <Text style={[styles.text, {color: textColor, fontSize: getFontSize()}]}>
          {title}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    minHeight: 44,
    minWidth: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontWeight: '700',
    textAlign: 'center',
  },
  icon: {
    marginRight: 8,
  },
  indicator: {
    marginRight: 8,
  },
});

export default AppButton;
