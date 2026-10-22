import { translator } from '@yapling/i18n';
import { useRouter } from 'expo-router';
import { useCallback } from 'react';

import { BURROW_ROUTES } from '../burrow/routes';

/* What the listening routes share: their params, leaving, and the postmark's day. */

export type Params = Readonly<Record<string, string | string[] | undefined>>;

export const one = (params: Params, key: string): string | undefined => {
  const v = params[key];
  return Array.isArray(v) ? v[0] : v;
};

/** Back where the learner came from, or to the burrow. */
export function useLeave() {
  const router = useRouter();
  return useCallback(
    () => (router.canGoBack() ? router.back() : router.replace(BURROW_ROUTES.home)),
    [router],
  );
}

const en = translator('en');

/** A postmark's day in the town's own style: `SEP 23`. */
export function postmarkDay(now: number): string {
  const d = new Date(now);
  const month = en(`common.monthShort.${d.getMonth() + 1}` as 'common.monthShort.1');
  return `${month.toUpperCase()} ${d.getDate()}`;
}
