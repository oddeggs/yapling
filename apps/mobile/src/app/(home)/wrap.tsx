import { useLocalSearchParams } from 'expo-router';

import { WrapRoute } from '../../features/payoff';

/** The week's wrap on its last day: `/(home)/wrap?week=…`. */
export default function Wrap() {
  const { week } = useLocalSearchParams<{ week?: string }>();
  return <WrapRoute week={Math.max(1, Math.round(Number(week ?? 1)) || 1)} />;
}
