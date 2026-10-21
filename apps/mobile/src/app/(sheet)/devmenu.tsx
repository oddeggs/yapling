import { Redirect } from 'expo-router';

import { DevMenu } from '../../features/devmenu/dev-menu';
import { devToolsEnabled } from '../../features/devmenu/dev-tools';

/** The test menu (`yapling-dev://devmenu`): test builds only; the store app sends it home. */
export default function DevMenuRoute() {
  return devToolsEnabled ? <DevMenu /> : <Redirect href="/" />;
}
