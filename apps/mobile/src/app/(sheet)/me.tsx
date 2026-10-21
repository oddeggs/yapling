import { useLocalSearchParams } from 'expo-router';

import { MeContainer, useMeData } from '../../features/me';
import { useMePreview } from '../../features/me/preview';

/** `yapling://me`: the Me sheet, from the roommate's face. `?preview=1` shows a sample, in dev only. */
export default function MeRoute() {
  const { preview } = useLocalSearchParams<{ preview?: string }>();
  const sample = useMePreview(__DEV__ && preview !== undefined);
  const live = useMeData();
  const shown = sample ?? live;
  return <MeContainer inputs={shown.inputs} actions={shown.actions} />;
}
