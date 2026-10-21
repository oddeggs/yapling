import { useEffect, useState } from 'react';

import { plusStore } from './setup';

/**
 * Whether the App Store says Plus is active on this phone, or null before it has said. A hint for
 * the screen only (to refresh the minutes when it changes): the plan that counts is the server's.
 */
export function usePlusEntitlement(): boolean | null {
  const [plus, setPlus] = useState<boolean | null>(null);
  useEffect(() => plusStore().onEntitlement(setPlus), []);
  return plus;
}
