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
import {getTheme, scaleFontSize, Theme} from '../utils/theme';

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    scrollContent: {
      paddingBottom: theme.spacing.xl,
    },
    heroSection: {
      backgroundColor: theme.colors.primaryContainer,
      borderRadius: theme.borderRadius.large,
      marginHorizontal: theme.spacing.md,
      marginTop: theme.spacing.md,
      marginBottom: theme.spacing.lg,
      padding: theme.spacing.lg,
      overflow: 'hidden',
      ...theme.shadows.large as object,
    },
    heroTitle: {
      fontSize: scaleFontSize(28),
      fontWeight: 'bold',
      color: theme.colors.onPrimary,
      marginBottom: theme.spacing.sm,
      letterSpacing: -0.5,
    },
    heroSubtitle: {
      fontSize: scaleFontSize(theme.typography.fontSizeLarge),
      color: theme.colors.onPrimaryContainer,
      lineHeight: 24,
    },
    modulesContainer: {
      paddingHorizontal: theme.spacing.md,
      gap: theme.spacing.md,
    },
    moduleCard: {
      backgroundColor: theme.colors.surfaceContainerLowest,
      borderRadius: theme.borderRadius.large,
      padding: theme.spacing.lg,
      ...theme.shadows.small as object,
      borderWidth: 1,
      borderColor: 'rgba(195,198,213,0.2)',
      minHeight: 44,
    },
    moduleIconContainer: {
      width: 48,
      height: 48,
      borderRadius: 24,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: theme.spacing.md,
    },
    moduleName: {
      fontSize: scaleFontSize(theme.typography.fontSizeXLarge),
      fontWeight: 'bold',
      color: theme.colors.text,
      marginBottom: theme.spacing.xs,
    },
    moduleDescription: {
      fontSize: scaleFontSize(theme.typography.fontSizeBase),
      color: theme.colors.textSecondary,
      lineHeight: 20,
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
      name: 'Minha Carteira',
      description: 'Acesse e gerencie suas credenciais digitais armazenadas com segurança.',
      route: 'Titular' as const,
      path: Routes.Titular,
      icon: 'wallet' as const,
      iconBg: '#D9E2FF',
      iconColor: theme.colors.primary,
    },
    {
      name: 'Emitir Credencial',
      description: 'Emita novas credenciais verificáveis para estudantes ou entidades.',
      route: 'Emissor' as const,
      path: Routes.Emissor,
      icon: 'shield-plus' as const,
      iconBg: '#FFE089',
      iconColor: '#6E5700',
    },
    {
      name: 'Validar',
      description: 'Verifique a autenticidade de credenciais apresentadas a você.',
      route: 'Verificador' as const,
      path: Routes.Verificador,
      icon: 'shield-check' as const,
      iconBg: '#8FFB85',
      iconColor: '#004A09',
    },
    {
      name: 'Eventos',
      description: 'Consulte o histórico de atividades e logs de suas credenciais.',
      route: 'Logs' as const,
      path: Routes.Logs,
      icon: 'history' as const,
      iconBg: theme.colors.surfaceContainerHighest,
      iconColor: theme.colors.text,
    },
    {
      name: 'Glossário',
      description: 'Aprenda os termos técnicos e conceitos do ecossistema SSI.',
      route: 'Glossario' as const,
      path: Routes.Glossario,
      icon: 'book-open-variant' as const,
      iconBg: theme.colors.surfaceContainerHighest,
      iconColor: theme.colors.text,
    },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <View style={styles.heroSection}>
        <Text style={styles.heroTitle}>Olá, Estudante</Text>
        <Text style={styles.heroSubtitle}>
          Bem-vindo à sua Carteira Digital SSI. Gerencie suas credenciais verificáveis de forma segura e soberana.
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
            <View style={[styles.moduleIconContainer, {backgroundColor: module.iconBg}]} accessible={false}>
              <MaterialCommunityIcons name={module.icon} size={24} color={module.iconColor} />
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
