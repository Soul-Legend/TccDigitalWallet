import React, {useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import {MaterialCommunityIcons} from '@expo/vector-icons';
import {MaterialIcons} from '@expo/vector-icons';
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
      borderRadius: 12,
      marginHorizontal: 16,
      marginTop: 16,
      marginBottom: 24,
      padding: 24,
      overflow: 'hidden',
      ...theme.shadows.large as object,
    },
    heroTitle: {
      fontSize: scaleFontSize(28),
      fontWeight: '900',
      color: theme.colors.onPrimary,
      marginBottom: 8,
      letterSpacing: -0.5,
    },
    heroSubtitle: {
      fontSize: scaleFontSize(15),
      color: theme.colors.onPrimaryContainer,
      lineHeight: 22,
    },
    modulesContainer: {
      paddingHorizontal: 16,
      gap: 12,
    },
    moduleCard: {
      backgroundColor: theme.colors.surfaceContainerLowest,
      borderRadius: 12,
      padding: 20,
      ...theme.shadows.medium as object,
    },
    moduleIconContainer: {
      width: 48,
      height: 48,
      borderRadius: 24,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 12,
    },
    moduleName: {
      fontSize: scaleFontSize(18),
      fontWeight: '700',
      color: theme.colors.text,
      marginBottom: 4,
    },
    moduleDescription: {
      fontSize: scaleFontSize(13),
      color: theme.colors.textSecondary,
      lineHeight: 18,
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
      icon: 'account-balance-wallet' as const,
      iconBg: '#D9E2FF',
      iconColor: '#003A8C',
      isMaterial: true,
    },
    {
      name: 'Emitir Credencial',
      description: 'Emita novas credenciais verificáveis para outros estudantes ou entidades.',
      route: 'Emissor' as const,
      path: Routes.Emissor,
      icon: 'shield-check' as const,
      iconBg: '#FFE089',
      iconColor: '#6E5700',
      isMaterial: false,
    },
    {
      name: 'Validar',
      description: 'Verifique a autenticidade de credenciais apresentadas a você.',
      route: 'Verificador' as const,
      path: Routes.Verificador,
      icon: 'verified-user' as const,
      iconBg: '#8FFB85',
      iconColor: '#004A09',
      isMaterial: true,
    },
    {
      name: 'Eventos',
      description: 'Consulte o histórico de atividades e logs de suas credenciais.',
      route: 'Logs' as const,
      path: Routes.Logs,
      icon: 'history-edu' as const,
      iconBg: '#E5E2E1',
      iconColor: '#434653',
      isMaterial: true,
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
              {module.isMaterial ? (
                <MaterialIcons name={module.icon as any} size={24} color={module.iconColor} />
              ) : (
                <MaterialCommunityIcons name={module.icon as any} size={24} color={module.iconColor} />
              )}
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
