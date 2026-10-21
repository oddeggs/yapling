import type { Bindings } from '../env';

export type { ChargeResult, TalkKind } from './ledger';
export { ScheduledPushJob, type ScheduledPushKind, type PushPayload } from './jobs';

/** The learner's object, by user id. */
export function userObject(env: Pick<Bindings, 'USER'>, userId: string) {
  return env.USER.get(env.USER.idFromName(userId));
}
