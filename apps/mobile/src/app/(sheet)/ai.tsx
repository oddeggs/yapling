import { useRouter } from 'expo-router';

import { AiExplainer } from '../../features/safety';

/** `yapling://ai`: "Pip and the neighbours are AI", from any AI tag or the Me sheet. */
export default function AiRoute() {
  const router = useRouter();
  return (
    <AiExplainer
      look="sheet"
      roommateName="Pip"
      onDone={() => (router.canGoBack() ? router.back() : router.replace('/'))}
    />
  );
}
