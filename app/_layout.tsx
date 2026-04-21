import React from 'react';
import {Stack} from 'expo-router';
import {SafeAreaProvider} from 'react-native-safe-area-context';

/**
 * Root layout for the digital wallet app.
 *
 * Uses a Stack with two routes:
 * - `index` (initialization) shown without header
 * - `(tabs)` group with bottom tab navigation for all main screens
 */
export default function RootLayout(): React.JSX.Element {
  return (
    <SafeAreaProvider>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'fade',
        }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(tabs)" />
      </Stack>
    </SafeAreaProvider>
  );
}
