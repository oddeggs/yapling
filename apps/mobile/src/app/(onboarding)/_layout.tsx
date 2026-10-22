import { colours } from '@yapling/theme';
import { Stack } from 'expo-router';

import { useReduceMotion } from '../../ui/motion/reduce-motion';

/**
 * The first run: splash and first language, the AI disclosure, the level question, the roommate,
 * the placement call, the residency card, notifications, and a Visitor's first knock.
 */
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
