import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { startCrashReports } from '../observability';
import { LocaleProvider } from '../ui/locale';
import { chromeLanguage } from '../world/device';
import { C } from '../world/theme';

startCrashReports();

/** The app is almost one screen: the scene, and the menu sheet that grows out of it. */
export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: C.bg }}>
      <SafeAreaProvider>
        <LocaleProvider language={chromeLanguage()}>
          <StatusBar style="light" />
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.bg } }}>
            <Stack.Screen name="index" />
            <Stack.Screen
              name="menu"
              options={{
                presentation: 'formSheet',
                sheetAllowedDetents: [0.64, 1],
                sheetGrabberVisible: true,
                sheetCornerRadius: 30,
                contentStyle: { backgroundColor: '#141217' },
              }}
            />
          </Stack>
        </LocaleProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
