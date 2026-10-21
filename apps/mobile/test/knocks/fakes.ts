import type {
  NotificationPermissionsStatus,
  NotificationRequest,
  NotificationRequestInput,
} from 'expo-notifications';

import type { KnockNotifications } from '../../src/features/knocks/scheduler';

/** The phone's notification centre, in memory. */
export class FakePhone implements KnockNotifications {
  readonly pending = new Map<string, NotificationRequestInput>();
  granted = true;
  schedules = 0;
  cancels = 0;

  getPermissionsAsync = () =>
    Promise.resolve({
      granted: this.granted,
      canAskAgain: true,
      expires: 'never',
      status: this.granted ? 'granted' : 'denied',
    } as NotificationPermissionsStatus);

  getAllScheduledNotificationsAsync = () =>
    Promise.resolve(
      [...this.pending.entries()].map(
        ([identifier, r]) =>
          ({
            identifier,
            content: r.content,
            trigger: r.trigger,
          }) as unknown as NotificationRequest,
      ),
    );

  cancelScheduledNotificationAsync = (identifier: string) => {
    this.cancels += 1;
    this.pending.delete(identifier);
    return Promise.resolve();
  };

  scheduleNotificationAsync = (request: NotificationRequestInput) => {
    this.schedules += 1;
    const identifier = request.identifier ?? `auto-${this.schedules}`;
    this.pending.set(identifier, request);
    return Promise.resolve(identifier);
  };
}
