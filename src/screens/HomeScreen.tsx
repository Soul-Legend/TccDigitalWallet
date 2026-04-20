import React, {useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import {useRouter} from 'expo-router';
import {useAppStore} from '../stores/useAppStore';
import {AppModule, AppModuleType} from '../utils/constants';
import {Routes} from '../utils/routes';

const HomeScreen: React.FC = () => {
  const router = useRouter();
  const setCurrentModule = useAppStore(state => state.setCurrentModule);

  useEffect(() => {
    setCurrentModule(AppModule.HOME);
  }, [setCurrentModule]);
  const modules = [
    {
      name: 'Emissor',
      description: 'Emitir credenciais acadêmicas verificáveis',
      route: 'Emissor' as const,
      path: Routes.Emissor,
      icon: '📝',
    },
    {
      name: 'Titular',
      description: 'Gerenciar e apresentar credenciais',
      route: 'Titular' as const,
      path: Routes.Titular,
      icon: '👤',
    },
    {
      name: 'Verificador',
      description: 'Validar apresentações verificáveis',
      route: 'Verificador' as const,
      path: Routes.Verificador,
      icon: '✓',
    },
    {
      name: 'Logs',
      description: 'Monitorar eventos criptográficos',
      route: 'Logs' as const,
      path: Routes.Logs,
      icon: '📊',
    },
    {
      name: 'Glossário',
      description: 'Termos e definições SSI',
      route: 'Glossario' as const,
      path: Routes.Glossario,
      icon: '📖',
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
            <Text style={styles.moduleIcon} accessible={false}>{module.icon}</Text>
            <Text style={styles.moduleName}>{module.name}</Text>
            <Text style={styles.moduleDescription}>{module.description}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#003366',
    padding: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#ccc',
    textAlign: 'center',
  },
  modulesContainer: {
    padding: 16,
  },
  moduleCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 20,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    minHeight: 44, // Minimum touch target
  },
  moduleIcon: {
    fontSize: 40,
    marginBottom: 12,
  },
  moduleName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#003366',
    marginBottom: 8,
  },
  moduleDescription: {
    fontSize: 14,
    color: '#666',
  },
});

export default HomeScreen;
