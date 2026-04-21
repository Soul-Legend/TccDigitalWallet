import React, {useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import {MaterialCommunityIcons} from '@expo/vector-icons';
import {useRouter} from 'expo-router';
import {useAppStore} from '../stores/useAppStore';
import {AppModule, AppModuleType} from '../utils/constants';
import {Routes} from '../utils/routes';
import {getTheme, scaleFontSize, accessibleColors, Theme} from '../utils/theme';

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    header: {
      backgroundColor: theme.colors.primary,
      padding: theme.spacing.md + theme.spacing.xs,
      alignItems: 'center',
    },
    title: {
      fontSize: scaleFontSize(theme.typography.fontSizeTitle),
      fontWeight: 'bold',
      color: accessibleColors.textOnDark,
      marginBottom: theme.spacing.sm,
    },
    subtitle: {
      fontSize: scaleFontSize(theme.typography.fontSizeBase),
      color: accessibleColors.secondaryTextOnDark,
      textAlign: 'center',
    },
    modulesContainer: {
      padding: theme.spacing.md,
    },
    moduleCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.medium,
      padding: theme.spacing.md + theme.spacing.xs,
      marginBottom: theme.spacing.md,
      ...(theme.shadows.medium as object),
      minHeight: 44, // Minimum touch target
    },
    moduleIcon: {
      marginBottom: theme.spacing.sm + theme.spacing.xs,
    },
    moduleName: {
      fontSize: scaleFontSize(theme.typography.fontSizeXLarge),
      fontWeight: 'bold',
      color: theme.colors.primary,
      marginBottom: theme.spacing.sm,
    },
    moduleDescription: {
      fontSize: scaleFontSize(theme.typography.fontSizeBase),
      color: theme.colors.textSecondary,
    },
  });

const HomeScreen: React.FC = () => {
  const router = useRouter();
  const setCurrentModule = useAppStore(state => state.setCurrentModule);
  const theme = getTheme();
  const styles = createStyles(theme);

  useEffect(() => {
    setCurrentModule(AppModule.HOME);
  }, [setCurrentModule]);
  const modules = [
    {
      name: 'Emissor',
      description: 'Emitir credenciais acadêmicas verificáveis',
      route: 'Emissor' as const,
      path: Routes.Emissor,
      icon: 'file-document-edit' as const,
    },
    {
      name: 'Titular',
      description: 'Gerenciar e apresentar credenciais',
      route: 'Titular' as const,
      path: Routes.Titular,
      icon: 'account' as const,
    },
    {
      name: 'Verificador',
      description: 'Validar apresentações verificáveis',
      route: 'Verificador' as const,
      path: Routes.Verificador,
      icon: 'check-circle' as const,
    },
    {
      name: 'Logs',
      description: 'Monitorar eventos criptográficos',
      route: 'Logs' as const,
      path: Routes.Logs,
      icon: 'chart-bar' as const,
    },
    {
      name: 'Glossário',
      description: 'Termos e definições SSI',
      route: 'Glossario' as const,
      path: Routes.Glossario,
      icon: 'book-open-variant' as const,
    },
  ];

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Carteira Digital SSI</Text>
        <Text style={styles.subtitle}>
          Sistema de Identidade Auto-Soberana Acadêmica
        </Text>
      </View>

      <View style={styles.modulesContainer}>
        {modules.map(module => (
          <TouchableOpacity
            key={module.route}
            style={styles.moduleCard}
            onPress={() => {
              setCurrentModule(
                module.route.toLowerCase() as AppModuleType,
              );
              router.push(module.path);
            }}
            accessible={true}
            accessibilityLabel={`Módulo ${module.name}`}
            accessibilityHint={module.description}
            accessibilityRole="button">
            <View style={styles.moduleIcon} accessible={false}>
              <MaterialCommunityIcons name={module.icon} size={32} color={theme.colors.primary} />
            </View>
            <Text style={styles.moduleName}>{module.name}</Text>
            <Text style={styles.moduleDescription}>{module.description}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
};

export default HomeScreen;
