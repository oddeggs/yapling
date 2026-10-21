import { useLocalSearchParams } from 'expo-router';

import { MeContainer, type MeActions } from '../../features/me';
import { useMePreview } from '../../features/me/preview';

/** Until the app's data layer is wired in, the sheet's actions answer that they didn't happen. */
const notWired = () => Promise.reject(new Error('the Me sheet is not wired to the app data yet'));
const unwired: MeActions = {
  updateMemory: notWired,
  deleteMemory: notWired,
  deleteAccount: notWired,
};

/** `yapling://me`: the Me sheet, from the roommate's face. */
export default function MeRoute() {
  const { preview } = useLocalSearchParams<{ preview?: string }>();
  const sample = useMePreview(__DEV__ && preview !== undefined);
  return <MeContainer inputs={sample?.inputs ?? null} actions={sample?.actions ?? unwired} />;
}
