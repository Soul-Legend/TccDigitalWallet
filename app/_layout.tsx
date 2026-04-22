import React from 'react';
import {Stack} from 'expo-router';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {useFonts} from 'expo-font';
import {
  MaterialIcons,
  MaterialCommunityIcons,
} from '@expo/vector-icons';
import {ActivityIndicator, View} from 'react-native';

/**
 * Root layout for the digital wallet app.
 * Loads icon fonts before rendering.
 */
export default function RootLayout(): React.JSX.Element | null {
  const [fontsLoaded] = useFonts({
    ...MaterialIcons.font,
    ...MaterialCommunityIcons.font,
  });

  if (!fontsLoaded) {
    return (
      <View style={{flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FCF9F8'}}>
        <ActivityIndicator size="large" color="#003A8C" />
      </View>
    );
  }

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
