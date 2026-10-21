import { colours } from '@yapling/theme';
import { Stack } from 'expo-router';

import { useReduceMotion } from '../../ui/motion/reduce-motion';

/** The burrow, the week and everything between calls: pushes slide in from the right. */
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
