import { Profile, type ProfileInput, type ProfileUpdate } from '@yapling/contracts';

import type { ApiClient } from './client';
import { isDataError } from './errors';
import type { Outbox } from './outbox';
import { Resource } from './resource';
import { CACHE_KEYS, type CacheStorage } from './storage';

/*
 * The learner's profile. Null until onboarding writes it (the server answers 404). A patch shows at
 * once; offline it waits in the queue and the cached copy carries it, so a relaunch still shows it.
 * The stage and the revision are the server's and never change on the phone.
 */

export class ProfileRepo {
  readonly resource: Resource<Profile>;

  constructor(
    private readonly api: ApiClient,
    cache: CacheStorage,
    private readonly outbox: Outbox,
  ) {
    this.resource = new Resource({
      cache,
      key: CACHE_KEYS.profile,
      schema: Profile,
      fetch: async () => {
        try {
          return await api.getProfile();
        } catch (error) {
          if (isDataError(error, 'not_found')) return null;
          throw error;
        }
      },
      hold: () => outbox.touches('profile'),
    });
  }

  refresh(): Promise<Profile | null> {
    return this.resource.refresh();
  }

  /** The whole profile, at the end of onboarding. Needs the server: it is never queued. */
  async put(input: ProfileInput): Promise<Profile> {
    const profile = await this.api.putProfile(input);
    await this.resource.setFromServer(profile);
    return profile;
  }

  /**
   * Some fields. Shown at once; sent now, or queued when the API can't be reached. A refusal puts
   * the server's copy back and throws.
   */
  async patch(update: ProfileUpdate): Promise<Profile | null> {
    const before = this.resource.data;
    if (before === null) {
      // Nothing to patch on the phone yet: the server decides (404 before onboarding).
      const profile = await this.api.patchProfile(update);
      await this.resource.setFromServer(profile);
      return profile;
    }
    await this.resource.setLocal((p) => (p === null ? p : applyPatch(p, update)));
    if (this.outbox.touches('profile')) {
      await this.outbox.add({ kind: 'profile.patch', body: update });
      void this.outbox.flush();
      return this.resource.data;
    }
    try {
      const profile = await this.api.patchProfile(update);
      await this.resource.setFromServer(profile);
      return profile;
    } catch (error) {
      if (isDataError(error, 'network')) {
        await this.outbox.add({ kind: 'profile.patch', body: update });
        return this.resource.data;
      }
      await this.resource.setLocal(() => before);
      void this.refresh().catch(() => undefined);
      throw error;
    }
  }

  /** Sends a queued patch. */
  async send(update: ProfileUpdate): Promise<void> {
    await this.resource.setFromServer(await this.api.patchProfile(update));
  }
}

/** A patch over a profile, the way the server applies it (fields given replace; the rest stay). */
export function applyPatch(profile: Profile, update: ProfileUpdate): Profile {
  const defined = Object.fromEntries(Object.entries(update).filter(([, v]) => v !== undefined));
  return { ...profile, ...defined };
}
