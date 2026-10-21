import { Stack } from 'expo-router';

import { SafetyContainer } from '../../features/safety';

/** `yapling://safety`: the safety sheet. Calm: it fades in, and only its own button leaves it. */
export default function SafetyRoute() {
  return (
    <>
      <Stack.Screen options={{ animation: 'fade', gestureEnabled: false }} />
      <SafetyContainer roommateName="Pip" />
    </>
  );
}
