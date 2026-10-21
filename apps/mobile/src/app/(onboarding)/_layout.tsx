import { colours } from '@yapling/theme';
import { Stack } from 'expo-router';

import { useReduceMotion } from '../../ui/motion/reduce-motion';

/** The first run: splash and first language, the AI disclosure, the roommate, the placement call, the residency card, notifications. */
export default function Layout() {
  const reduce = useReduceMotion();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colours.background },
        animation: reduce ? 'fade' : 'default',
      }}
    />
  );
}
