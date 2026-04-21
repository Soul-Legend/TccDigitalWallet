import React, {useRef} from 'react';
import {View, Text, TextInput, StyleSheet} from 'react-native';
import {getTheme, scaleFontSize} from '../utils/theme';

interface AppTextInputProps extends React.ComponentPropsWithoutRef<typeof TextInput> {
  label?: string;
  error?: string;
  helperText?: string;
}

const AppTextInput: React.FC<AppTextInputProps> = ({
  label,
  error,
  helperText,
  style,
  ...rest
}) => {
  const theme = getTheme();
  const inputRef = useRef<TextInput>(null);
  const inputId = useRef(`input-${Date.now()}`).current;

  return (
    <View style={styles.container}>
      {label && (
        <Text
          style={[
            styles.label,
            {
              fontSize: scaleFontSize(theme.typography.fontSizeSmall),
              color: theme.colors.textSecondary,
              marginBottom: theme.spacing.xs,
            },
          ]}
          onPress={() => inputRef.current?.focus()}
          accessibilityRole="text"
          nativeID={inputId}>
          {label}
        </Text>
      )}
      <TextInput
        ref={inputRef}
        style={[
          styles.input,
          {
            fontSize: scaleFontSize(theme.typography.fontSizeBase),
            color: theme.colors.text,
            borderColor: error ? theme.colors.error : theme.colors.border,
            borderRadius: theme.borderRadius.medium,
            padding: theme.spacing.md,
          },
          style,
        ]}
        placeholderTextColor={theme.colors.textDisabled}
        accessibilityLabelledBy={label ? inputId : undefined}
        accessibilityState={{disabled: rest.editable === false}}
        {...rest}
      />
      {error && (
        <Text
          style={[
            styles.error,
            {
              fontSize: scaleFontSize(theme.typography.fontSizeSmall),
              color: theme.colors.error,
              marginTop: theme.spacing.xs,
            },
          ]}
          accessibilityRole="alert">
          {error}
        </Text>
      )}
      {!error && helperText && (
        <Text
          style={[
            styles.helperText,
            {
              fontSize: scaleFontSize(theme.typography.fontSizeSmall),
              color: theme.colors.textSecondary,
              marginTop: theme.spacing.xs,
            },
          ]}>
          {helperText}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  label: {
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
  },
  error: {},
  helperText: {},
});

export default AppTextInput;
