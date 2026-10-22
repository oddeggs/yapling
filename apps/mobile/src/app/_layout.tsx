import { chromeLocale } from '@yapling/domain';
import { colours } from '@yapling/theme';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, type ReactNode } from 'react';
import { AppState } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import {
  DataProvider,
  useAccount,
  useData,
  useLastOpen,
  useProfile,
  useProgress,
  useSession,
} from '../data';
import { appClock, DevMenuHost, devToolsEnabled, now } from '../features/devmenu';
import { KnocksProvider, knockInputsOf } from '../features/knocks';
import { onboardingStore } from '../features/onboarding';
import { identifyPurchaser } from '../features/plus';
import { AppArtProvider } from '../ui/art-provider';
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

/**
 * Every open of the app on the app's clock: the launch, each return to the foreground, and in the
 * test builds each jump of the test menu's clock (a day later is a new open).
 */
function useOpens() {
  const data = useData();
  useEffect(() => {
    void data.opens.open(now());
    const app = AppState.addEventListener('change', (state) => {
      if (state === 'active') void data.opens.open(now());
    });
    const moved = devToolsEnabled ? appClock.subscribe(() => void data.opens.open(now())) : null;
    return () => {
      app.remove();
      moved?.();
    };
  }, [data]);
}

/** RevenueCat's customer becomes the Yapling user once there is a session, once per user. */
function usePurchaserIdentity() {
  const userId = useSession().session?.userId ?? null;
  const identified = useRef<string | null>(null);
  useEffect(() => {
    if (userId === null || identified.current === userId) return;
    identified.current = userId;
    identifyPurchaser(userId).catch((error: unknown) => {
      identified.current = null;
      if (__DEV__) console.warn('RevenueCat identify failed', error);
    });
  }, [userId]);
}

/** The knocks on the learner's data, with the open before this one from the data layer. */
function Knocks({ children }: { readonly children: ReactNode }) {
  const { profile } = useProfile();
  const { progress } = useProgress();
  const { previousAt } = useLastOpen();
  return (
    <KnocksProvider inputs={knockInputsOf(profile, progress, previousAt)}>
      {children}
    </KnocksProvider>
  );
}

function AppShell() {
  const { profile } = useProfile();
  const { resetLocal } = useAccount();
  // The test menu's reset: a fresh install, onboarding from the ferry.
  const reset = async () => {
    await resetLocal();
    onboardingStore().dispatch({ type: 'reset' });
  };
  useOpens();
  usePurchaserIdentity();
  return (
    <UiProvider language={profile ? chromeLocale(profile.firstLanguage) : undefined}>
      <AppArtProvider>
        <Knocks>
          <DevMenuHost onReset={reset}>
            <StatusBar style="dark" />
            <RootStack />
          </DevMenuHost>
        </Knocks>
      </AppArtProvider>
    </UiProvider>
  );
}

// Lexend and Kithfield Hand are embedded natively by the expo-font plugin (app.config.ts), so they
// are registered before the first frame and need no loading here; the art's Skia copy of Lexend
// loads in `AppArtProvider`.
export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colours.background }}>
      <SafeAreaProvider>
        <DataProvider {...(devToolsEnabled ? { clock: appClock } : {})}>
          <AppShell />
        </DataProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
