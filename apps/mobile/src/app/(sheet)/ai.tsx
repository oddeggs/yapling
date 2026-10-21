import { useRouter } from 'expo-router';

import { useRoommate } from '../../features/me';
import { AiExplainer } from '../../features/safety';

/** `yapling://ai`: "Pip and the neighbours are AI", from any AI tag or the Me sheet. */
export default function AiRoute() {
  const router = useRouter();
  const roommate = useRoommate();
  return (
    <AiExplainer
      look="sheet"
      roommate={roommate}
      onDone={() => (router.canGoBack() ? router.back() : router.replace('/'))}
    />
  );
}
