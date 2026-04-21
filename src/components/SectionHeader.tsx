import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {getTheme, scaleFontSize} from '../utils/theme';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
}

const SectionHeader: React.FC<SectionHeaderProps> = ({title, subtitle, icon}) => {
  const theme = getTheme();

  return (
    <View style={styles.container}>
      {icon && <View style={styles.icon}>{icon}</View>}
      <View style={styles.textContainer}>
        <Text
          style={[
            styles.title,
            {
              fontSize: scaleFontSize(theme.typography.fontSizeLarge),
              color: theme.colors.text,
            },
          ]}
          accessibilityRole="header">
          {title}
        </Text>
        {subtitle && (
          <Text
            style={[
              styles.subtitle,
              {
                fontSize: scaleFontSize(theme.typography.fontSizeBase),
                color: theme.colors.textSecondary,
              },
            ]}>
            {subtitle}
          </Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    marginRight: 8,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontWeight: '700',
  },
  subtitle: {
    marginTop: 2,
  },
});

export default SectionHeader;
