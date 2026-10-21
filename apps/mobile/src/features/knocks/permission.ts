import * as Notifications from 'expo-notifications';

import { isPermitted } from './scheduler';

const listeners = new Set<() => void>();

/** Calls back when the permission may have changed (asked in onboarding), to reschedule. */
export const onKnockPermissionChange = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

/** Whether the system lets knocks show. */
export const hasKnockPermission = async (): Promise<boolean> =>
  isPermitted(await Notifications.getPermissionsAsync());

/**
 * Asks for notifications, in context: called by the onboarding screen that explains the knocks,
 * after the learner taps yes. Alerts and sounds only, no badge (a red number is a nag). Resolves
 * true when knocks may show. Asks the system once; after a no it only reports the answer.
 */
export const requestKnockPermission = async (): Promise<boolean> => {
  const current = await Notifications.getPermissionsAsync();
  if (isPermitted(current)) return true;
  if (!current.canAskAgain) return false;
  const answer = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowSound: true, allowBadge: false },
  });
  for (const listener of listeners) listener();
  return isPermitted(answer);
};
