import { useLocalSearchParams } from 'expo-router';

import { KeepsakeRoute } from '../../features/payoff';

/** The keepsake a call earned: `/(home)/keepsake?callId=…&step=0`. */
export default function Keepsake() {
  const { callId, step } = useLocalSearchParams<{ callId?: string; step?: string }>();
  return <KeepsakeRoute callId={callId ?? ''} step={Math.max(0, Number(step ?? 0) || 0)} />;
}
