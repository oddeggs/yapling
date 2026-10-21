import { colours } from '@yapling/theme';
import { Stack } from 'expo-router';

import { useReduceMotion } from '../../ui/motion/reduce-motion';

/** A call: full screen, no swipe back (the call bar's exit ends it), on the scene's own backdrop. */
export default function Layout() {
  const reduce = useReduceMotion();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colours.background },
        gestureEnabled: false,
        animation: reduce ? 'fade' : 'default',
      }}
    />
  );
}
