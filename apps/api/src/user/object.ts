import type { Bindings } from '../env';

/** The learner's object, by user id. */
export function userObject(env: Pick<Bindings, 'USER'>, userId: string) {
  return env.USER.get(env.USER.idFromName(userId));
}
