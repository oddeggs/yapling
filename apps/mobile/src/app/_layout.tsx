import { colours } from '@yapling/theme';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { DataProvider } from '../data';
import { UiProvider } from '../ui/ui-provider';
import { useReduceMotion } from '../ui/motion/reduce-motion';

/**
 * The routes, one group per part of the app:
 * - `(onboarding)`: the first run, from the splash to notifications.
 * - `(home)`: the burrow, the week and everything between calls.
 * - `(call)`: a call, full screen over everything, left only by its own exit.
 * - `(sheet)`: glass sheets rising over the screen beneath (the paywall, Me, safety).
 * Pushes slide in from the right, sheets rise, calls fade up; under Reduce Motion all of them fade.
 */
function RootStack() {
  const reduce = useReduceMotion();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colours.background },
        animation: reduce ? 'fade' : 'default',
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="(onboarding)" />
      <Stack.Screen name="(home)" />
      <Stack.Screen
        name="(call)"
        options={{ presentation: 'fullScreenModal', animation: 'fade', gestureEnabled: false }}
      />
      <Stack.Screen
        name="(sheet)"
        options={{
          presentation: 'transparentModal',
          animation: reduce ? 'fade' : 'slide_from_bottom',
          contentStyle: { backgroundColor: 'transparent' },
        }}
      />
      {/* The component kit exists in development builds only. */}
      <Stack.Protected guard={__DEV__}>
        <Stack.Screen name="kit" />
      </Stack.Protected>
    </Stack>
  );
}

// Lexend and Kithfield Hand are embedded natively by the expo-font plugin (app.config.ts), so they
// are registered before the first frame and need no loading here.
export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colours.background }}>
      <SafeAreaProvider>
        <DataProvider>
          <UiProvider>
            <StatusBar style="dark" />
            <RootStack />
          </UiProvider>
        </DataProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
