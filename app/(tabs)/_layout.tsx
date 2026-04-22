import React from 'react';
import {Tabs} from 'expo-router';
import {MaterialIcons, MaterialCommunityIcons} from '@expo/vector-icons';
import {getTheme} from '../../src/utils/theme';

export default function TabsLayout(): React.JSX.Element {
  const theme = getTheme();

  return (
    <Tabs
      screenOptions={{
        headerStyle: {backgroundColor: theme.colors.primary},
        headerTintColor: theme.colors.onPrimary,
        headerTitleStyle: {fontWeight: 'bold', fontSize: 18},
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: theme.colors.divider,
          borderTopWidth: 1,
          paddingBottom: 8,
          paddingTop: 6,
          height: 72,
          elevation: 8,
          shadowColor: '#000',
          shadowOffset: {width: 0, height: -2},
          shadowOpacity: 0.05,
          shadowRadius: 8,
        },
        tabBarActiveTintColor: '#1351B4',
        tabBarInactiveTintColor: '#888888',
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
        animation: 'shift',
      }}>
      <Tabs.Screen
        name="home"
        options={{
          title: 'Carteira',
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
          title: 'Emitir',
          headerTitle: 'Nova Credencial Acadêmica',
          // eslint-disable-next-line react/no-unstable-nested-components
          tabBarIcon: ({color, size}) => (
            <MaterialCommunityIcons name="file-document-edit" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="titular"
        options={{
          title: 'Carteira',
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
          title: 'Validar',
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
          title: 'Eventos',
          headerTitle: 'Eventos',
          // eslint-disable-next-line react/no-unstable-nested-components
          tabBarIcon: ({color, size}) => (
            <MaterialIcons name="history" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="glossario"
        options={{
          title: 'Glossário',
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
