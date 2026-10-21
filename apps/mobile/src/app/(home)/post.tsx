import { useLocalSearchParams } from 'expo-router';

import { AfterCallRoute } from '../../features/payoff';

/** After a call: `/(home)/post?callId=…`. */
export default function PostCall() {
  const { callId } = useLocalSearchParams<{ callId?: string }>();
  return <AfterCallRoute callId={callId ?? ''} />;
}
