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
    welcomeBanner: {
      backgroundColor: '#2B69D1',
      borderRadius: 8,
      marginHorizontal: 16,
      marginTop: 16,
      marginBottom: 16,
      padding: 20,
    },
    welcomeTitle: {
      fontSize: scaleFontSize(20),
      fontWeight: '700',
      color: '#FFFFFF',
      marginBottom: 4,
    },
    welcomeSubtitle: {
      fontSize: scaleFontSize(14),
      color: '#FFFFFF',
      opacity: 0.8,
      lineHeight: 20,
    },
    modulesContainer: {
      paddingHorizontal: 16,
      gap: 16,
    },
    moduleCard: {
      backgroundColor: '#FFFFFF',
      borderRadius: 8,
      padding: 16,
      flexDirection: 'row',
      alignItems: 'center',
      ...theme.shadows.medium as object,
    },
    moduleIconContainer: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 16,
    },
    moduleTextContainer: {
      flex: 1,
    },
    moduleName: {
      fontSize: scaleFontSize(20),
      fontWeight: '700',
      color: '#333333',
      marginBottom: 2,
    },
    moduleDescription: {
      fontSize: scaleFontSize(14),
      color: '#888888',
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
      description: 'Credenciais digitais armazenadas com segurança.',
      route: 'Titular' as const,
      path: Routes.Titular,
      icon: 'account-balance-wallet' as const,
      iconBg: '#D4E5FF',
      iconColor: '#1351B4',
      isMaterial: true,
    },
    {
      name: 'Emitir Credencial',
      description: 'Emita novas credenciais verificáveis.',
      route: 'Emissor' as const,
      path: Routes.Emissor,
      icon: 'plus-box' as const,
      iconBg: '#FFF5C2',
      iconColor: '#FFCD07',
      isMaterial: false,
    },
    {
      name: 'Validar',
      description: 'Verifique a autenticidade de credenciais.',
      route: 'Verificador' as const,
      path: Routes.Verificador,
      icon: 'shield-check' as const,
      iconBg: '#E3F5E1',
      iconColor: '#168821',
      isMaterial: false,
    },
    {
      name: 'Eventos',
      description: 'Histórico de atividades e logs.',
      route: 'Logs' as const,
      path: Routes.Logs,
      icon: 'clipboard-list' as const,
      iconBg: '#EEEEEE',
      iconColor: '#888888',
      isMaterial: false,
    },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <View style={styles.welcomeBanner}>
        <Text style={styles.welcomeTitle}>Olá, Estudante</Text>
        <Text style={styles.welcomeSubtitle}>
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
                <MaterialIcons name={module.icon as any} size={22} color={module.iconColor} />
              ) : (
                <MaterialCommunityIcons name={module.icon as any} size={22} color={module.iconColor} />
              )}
            </View>
            <View style={styles.moduleTextContainer}>
              <Text style={styles.moduleName}>{module.name}</Text>
              <Text style={styles.moduleDescription}>{module.description}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
};

export default HomeScreen;
