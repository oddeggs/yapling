import { colours } from '@yapling/theme';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

// Lexend and Kithfield Hand are embedded natively by the expo-font plugin (app.config.ts), so they
// are registered before the first frame and need no loading here.
export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colours.background }}>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colours.background },
        }}
      />
    </GestureHandlerRootView>
  );
}
