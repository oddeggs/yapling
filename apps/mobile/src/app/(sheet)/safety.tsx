import { Stack } from 'expo-router';

import { useRoommate } from '../../features/me';
import { SafetyContainer } from '../../features/safety';

/** `yapling://safety`: the safety sheet. Calm: it fades in, and only its own button leaves it. */
export default function SafetyRoute() {
  const roommate = useRoommate();
  return (
    <>
      <Stack.Screen options={{ animation: 'fade', gestureEnabled: false }} />
      <SafetyContainer roommateName={roommate.name} />
    </>
  );
}
