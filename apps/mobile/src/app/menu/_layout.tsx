import { Stack } from 'expo-router';

/** The menu sheet's own pages slide in inside it, the way iOS navigation does. */
export default function MenuLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#141217' } }} />
  );
}
