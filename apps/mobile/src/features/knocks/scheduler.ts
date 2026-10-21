import * as Notifications from 'expo-notifications';

import { KNOCK_ID_PREFIX, type KnockContent, type KnockRequest } from './plan';

/** The part of expo-notifications the scheduler uses, so tests can stand in for the phone. */
export interface KnockNotifications {
  readonly getPermissionsAsync: () => Promise<Notifications.NotificationPermissionsStatus>;
  readonly getAllScheduledNotificationsAsync: () => Promise<Notifications.NotificationRequest[]>;
  readonly cancelScheduledNotificationAsync: (identifier: string) => Promise<void>;
  readonly scheduleNotificationAsync: (
    request: Notifications.NotificationRequestInput,
  ) => Promise<string>;
}

const phone: KnockNotifications = Notifications;

/** Granted, or iOS's quiet trial ("deliver quietly"). */
export const isPermitted = (status: Notifications.NotificationPermissionsStatus): boolean =>
  status.granted || status.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;

/** The notification content of a knock: never time-sensitive, it waits for focus modes. */
const contentOf = (knock: KnockContent): Notifications.NotificationContentInput => ({
  title: knock.title,
  body: knock.body,
  data: { ...knock.data },
  sound: 'default',
  threadIdentifier: 'knocks',
  interruptionLevel: 'active',
});

export const toNotificationRequest = (
  knock: KnockRequest,
): Notifications.NotificationRequestInput => ({
  identifier: knock.identifier,
  // The ring time rides along: iOS reports a date trigger back as calendar components.
  content: contentOf({ ...knock, data: { ...knock.data, fireAt: knock.fireAt } }),
  trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: knock.fireAt },
});

export interface SyncResult {
  readonly cancelled: number;
  readonly scheduled: readonly string[];
}

// One sync at a time: two opens in a row must not interleave their cancels and schedules.
let queue: Promise<unknown> = Promise.resolve();
const serial = <T>(task: () => Promise<T>): Promise<T> => {
  const run = queue.then(task, task);
  queue = run.catch(() => undefined);
  return run;
};

/**
 * Makes the phone's schedule exactly `knocks`: every knock scheduled before is cancelled and the
 * plan is scheduled again, so running it on every open is idempotent. Without the system
 * permission nothing is scheduled (and nothing of ours is left behind). Other notifications are
 * left alone.
 */
export const syncKnocks = (
  knocks: readonly KnockRequest[],
  api: KnockNotifications = phone,
): Promise<SyncResult> =>
  serial(async () => {
    const ours = (await api.getAllScheduledNotificationsAsync()).filter((n) =>
      n.identifier.startsWith(KNOCK_ID_PREFIX),
    );
    for (const n of ours) await api.cancelScheduledNotificationAsync(n.identifier);
    if (knocks.length === 0 || !isPermitted(await api.getPermissionsAsync())) {
      return { cancelled: ours.length, scheduled: [] };
    }
    const scheduled: string[] = [];
    for (const knock of knocks) {
      scheduled.push(await api.scheduleNotificationAsync(toNotificationRequest(knock)));
    }
    return { cancelled: ours.length, scheduled };
  });

/** Cancels every knock (notifications turned off, a reset). */
export const cancelKnocks = (api: KnockNotifications = phone): Promise<SyncResult> =>
  syncKnocks([], api);

/** Seconds a test knock waits, enough to lock the phone or leave the app. */
export const TEST_KNOCK_DELAY_S = 5;

/** Rings a knock shortly, for the test menu; shown even with the app open. */
export const fireTestKnock = (
  knock: KnockContent,
  api: KnockNotifications = phone,
  seconds: number = TEST_KNOCK_DELAY_S,
): Promise<string> =>
  api.scheduleNotificationAsync({
    identifier: `test-${KNOCK_ID_PREFIX}day-${knock.data.day}`,
    content: contentOf({ ...knock, data: { ...knock.data, test: true } }),
    trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds },
  });

/** The knocks the phone has scheduled, for the test menu. */
export const scheduledKnocks = async (
  api: KnockNotifications = phone,
): Promise<readonly Notifications.NotificationRequest[]> =>
  (await api.getAllScheduledNotificationsAsync()).filter((n) =>
    n.identifier.startsWith(KNOCK_ID_PREFIX),
  );
