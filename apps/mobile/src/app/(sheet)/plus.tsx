import { useEffect } from 'react';

import { useMinutes, useSeen, useSession } from '../../data';
import { useRoommate } from '../../features/me';
import { PaywallContainer } from '../../features/plus';

/** `yapling://plus`: the Yapling Plus paywall. */
export default function PlusRoute() {
  const roommate = useRoommate();
  const { session } = useSession();
  const { refresh } = useMinutes();
  // Seen once: the burrow's end-of-week card stops offering it as the day's one thing.
  const { markSeen } = useSeen();
  useEffect(() => void markSeen('plus_offer'), [markSeen]);
  return (
    <PaywallContainer
      roommateName={roommate.name}
      userId={session?.userId ?? null}
      // The plan changes on the server once RevenueCat's webhook lands; the minutes show it.
      onPlanMayHaveChanged={() => void refresh().catch(() => undefined)}
    />
  );
}
