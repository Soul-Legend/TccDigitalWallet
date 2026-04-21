import React from 'react';
import {Tabs} from 'expo-router';
import {MaterialCommunityIcons} from '@expo/vector-icons';
import {getTheme} from '../../src/utils/theme';

export default function TabsLayout(): React.JSX.Element {
  const theme = getTheme();

  return (
    <Tabs
      screenOptions={{
        headerStyle: {backgroundColor: theme.colors.primaryContainer},
        headerTintColor: theme.colors.onPrimary,
        headerTitleStyle: {fontWeight: 'bold', fontSize: 18},
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.divider,
          borderTopWidth: 1,
          paddingBottom: 8,
          paddingTop: 4,
          height: 64,
          elevation: 8,
          shadowColor: '#000',
          shadowOffset: {width: 0, height: -2},
          shadowOpacity: 0.05,
          shadowRadius: 8,
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textDisabled,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
          textTransform: 'uppercase',
          letterSpacing: 0.5,
        },
        animation: 'shift',
      }}>
      <Tabs.Screen
        name="home"
        options={{
          title: 'Início',
          headerTitle: 'Identidade Universitária',
          tabBarIcon: ({color, size}) => (
            <MaterialCommunityIcons name="home" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="titular"
        options={{
          title: 'Carteira',
          headerTitle: 'Minha Carteira',
          tabBarIcon: ({color, size}) => (
            <MaterialCommunityIcons name="wallet" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="emissor"
        options={{
          title: 'Emitir',
          headerTitle: 'Nova Credencial',
          tabBarIcon: ({color, size}) => (
            <MaterialCommunityIcons name="shield-plus" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="verificador"
        options={{
          title: 'Verificar',
          headerTitle: 'Verificador',
          tabBarIcon: ({color, size}) => (
            <MaterialCommunityIcons name="shield-check" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="logs"
        options={{
          title: 'Logs',
          headerTitle: 'Atividades',
          tabBarIcon: ({color, size}) => (
            <MaterialCommunityIcons name="history" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="glossario"
        options={{
          title: 'Glossário',
          headerTitle: 'Glossário SSI',
          tabBarIcon: ({color, size}) => (
            <MaterialCommunityIcons name="book-open-variant" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
