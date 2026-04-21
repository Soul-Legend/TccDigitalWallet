import React from 'react';
import {Stack} from 'expo-router';
import {SafeAreaProvider} from 'react-native-safe-area-context';

/**
 * Root layout for the digital wallet app.
 *
 * Replaces the legacy `<NavigationContainer><Stack.Navigator>...</></>` block
 * that lived in `src/App.tsx`. Each `<Stack.Screen>` here mirrors a file in
 * this `app/` directory; expo-router infers the route name from the file name.
 */
export default function RootLayout(): React.JSX.Element {
  return (
    <SafeAreaProvider>
      <Stack
        screenOptions={{
          headerStyle: {backgroundColor: '#003366'},
          headerTintColor: '#fff',
          headerTitleStyle: {fontWeight: 'bold'},
          animation: 'slide_from_right',
        }}>
        <Stack.Screen name="index" options={{headerShown: false, animation: 'fade'}} />
        <Stack.Screen
          name="home"
          options={{title: 'Carteira Identidade Acadêmica'}}
        />
        <Stack.Screen name="emissor" options={{title: 'Módulo Emissor'}} />
        <Stack.Screen name="titular" options={{title: 'Módulo Titular'}} />
        <Stack.Screen
          name="verificador"
          options={{title: 'Módulo Verificador'}}
        />
        <Stack.Screen name="logs" options={{title: 'Painel de Logs'}} />
        <Stack.Screen name="glossario" options={{title: 'Glossário SSI'}} />
      </Stack>
    </SafeAreaProvider>
  );
}
