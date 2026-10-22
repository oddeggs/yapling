import * as Updates from 'expo-updates';
import { usePathname } from 'expo-router';
import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';

import { reportError } from '../../observability';
import { shouldApply, shouldCheck } from './policy';

/**
 * Fetches over-the-air updates on this build's channel and restarts into one when it's safe
 * (`policy.ts`). Does nothing in development, where Metro serves the code.
 */
export function OverTheAir() {
  const pathname = usePathname();
  const where = useRef(pathname);
  where.current = pathname;
  const pending = useRef(false);
  const lastCheck = useRef<number | null>(null);

  useEffect(() => {
    if (__DEV__ || !Updates.isEnabled) return;
    const fetchNew = async () => {
      const now = Date.now();
      if (pending.current || !shouldCheck(lastCheck.current, now)) return;
      lastCheck.current = now;
      try {
        const found = await Updates.checkForUpdateAsync();
        if (!found.isAvailable) return;
        const fetched = await Updates.fetchUpdateAsync();
        if (fetched.isNew) pending.current = true;
      } catch (error) {
        reportError(error);
      }
    };
    void fetchNew();
    let away = AppState.currentState === 'background';
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'background') {
        away = true;
        return;
      }
      if (state !== 'active' || !away) return;
      away = false;
      if (shouldApply(pending.current, true, where.current)) {
        void Updates.reloadAsync().catch(reportError);
        return;
      }
      void fetchNew();
    });
    return () => sub.remove();
  }, []);

  return null;
}
