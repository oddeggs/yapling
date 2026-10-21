import { Stack } from 'expo-router';

import { useReduceMotion } from '../../ui/motion/reduce-motion';

/** Glass sheets over the screen beneath: each draws its own blurred backdrop, so the stack is transparent. */
export default function Layout() {
  const reduce = useReduceMotion();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: 'transparent' },
        animation: reduce ? 'fade' : 'default',
      }}
    />
  );
}
