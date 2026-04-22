import React from 'react';
import {Tabs} from 'expo-router';
import {MaterialCommunityIcons} from '@expo/vector-icons';
import {MaterialIcons} from '@expo/vector-icons';
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
          tabBarIcon: ({color, size}) => (
            <MaterialIcons name="note-add" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="titular"
        options={{
          title: 'Carteira',
          headerTitle: 'Minha Carteira Acadêmica',
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
          tabBarIcon: ({color, size}) => (
            <MaterialIcons name="menu-book" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
