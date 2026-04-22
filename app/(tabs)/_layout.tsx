import React from 'react';
import {Tabs} from 'expo-router';
import {MaterialIcons, MaterialCommunityIcons} from '@expo/vector-icons';
import {getTheme} from '../../src/utils/theme';

export default function TabsLayout(): React.JSX.Element {
  const theme = getTheme();

  return (
    <Tabs
      screenOptions={{
        headerStyle: {
          backgroundColor: theme.colors.primaryContainer,
          elevation: 0,
          shadowOpacity: 0,
        },
        headerTintColor: theme.colors.onPrimary,
        headerTitleStyle: {fontWeight: '700', fontSize: 18, letterSpacing: -0.3},
        tabBarStyle: {
          backgroundColor: theme.colors.background,
          borderTopColor: theme.colors.divider,
          borderTopWidth: 0,
          paddingBottom: 8,
          paddingTop: 6,
          height: 72,
          elevation: 0,
          shadowColor: '#1B1B1C',
          shadowOffset: {width: 0, height: -4},
          shadowOpacity: 0.05,
          shadowRadius: 20,
        },
        tabBarActiveTintColor: theme.colors.primaryContainer,
        tabBarInactiveTintColor: theme.colors.textDisabled,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
          textTransform: 'uppercase',
          letterSpacing: 0.8,
        },
        animation: 'shift',
      }}>
      <Tabs.Screen
        name="home"
        options={{
          title: 'Vault',
          headerTitle: 'Identidade Universitária',
          // eslint-disable-next-line react/no-unstable-nested-components
          headerLeft: () => (
            <MaterialIcons name="account-circle" size={32} color="#FFFFFF" style={{marginLeft: 16}} />
          ),
          // eslint-disable-next-line react/no-unstable-nested-components
          headerRight: () => (
            <MaterialIcons name="settings" size={24} color="#FFFFFF" style={{marginRight: 16}} />
          ),
          // eslint-disable-next-line react/no-unstable-nested-components
          tabBarIcon: ({color, size}) => (
            <MaterialIcons name="account-balance-wallet" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="emissor"
        options={{
          title: 'Issue',
          headerTitle: 'Nova Credencial Acadêmica',
          // eslint-disable-next-line react/no-unstable-nested-components
          tabBarIcon: ({color, size}) => (
            <MaterialIcons name="add-moderator" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="titular"
        options={{
          title: 'Vault',
          headerTitle: 'Minha Carteira Acadêmica',
          // eslint-disable-next-line react/no-unstable-nested-components
          tabBarIcon: ({color, size}) => (
            <MaterialIcons name="account-balance-wallet" size={size} color={color} />
          ),
          href: null,
        }}
      />
      <Tabs.Screen
        name="verificador"
        options={{
          title: 'Verify',
          headerTitle: 'Verificador de Credenciais',
          // eslint-disable-next-line react/no-unstable-nested-components
          tabBarIcon: ({color, size}) => (
            <MaterialIcons name="verified-user" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="logs"
        options={{
          title: 'Logs',
          headerTitle: 'Atividades de Segurança',
          // eslint-disable-next-line react/no-unstable-nested-components
          tabBarIcon: ({color, size}) => (
            <MaterialCommunityIcons name="history" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="glossario"
        options={{
          title: 'Glossary',
          headerTitle: 'Glossário SSI',
          // eslint-disable-next-line react/no-unstable-nested-components
          tabBarIcon: ({color, size}) => (
            <MaterialIcons name="menu-book" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
