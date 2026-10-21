import { useMinutes, useSession } from '../../data';
import { useRoommate } from '../../features/me';
import { PaywallContainer } from '../../features/plus';

/** `yapling://plus`: the Yapling Plus paywall. */
export default function PlusRoute() {
  const roommate = useRoommate();
  const { session } = useSession();
  const { refresh } = useMinutes();
  return (
    <PaywallContainer
      roommateName={roommate.name}
      userId={session?.userId ?? null}
      // The plan changes on the server once RevenueCat's webhook lands; the minutes show it.
      onPlanMayHaveChanged={() => void refresh().catch(() => undefined)}
    />
  );
}
