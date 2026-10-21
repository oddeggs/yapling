import type {
  AppleLinkRequest,
  CallRecord,
  MemoryCreate,
  MemoryItem,
  MemoryUpdate,
  MinutesSummary,
  Profile,
  ProfileInput,
  ProfileUpdate,
  Progress,
  Session,
} from '@yapling/contracts';
import { useEffect, useMemo, useState } from 'react';

import type { ConnectivityState } from './connectivity';
import type { ProgressSave } from './progress';
import { useData } from './provider';
import type { Resource, ResourceState } from './resource';
import type { SessionState } from './session';
import { useStore } from './store';
import { currentWeek, deviceTimeZone, msUntilNextDay, type CurrentWeek } from './week';

/*
 * What feature screens use. Each hook reads one store and hands back its actions; data shows from
 * the cache first and refreshes behind it.
 */

type Loaded<T> = ResourceState<T> & { readonly refresh: () => Promise<T | null> };

function useResource<T>(resource: Resource<T>, refreshOnMount = false): Loaded<T> {
  const state = useStore(resource.store);
  useEffect(() => {
    if (refreshOnMount) void resource.refresh().catch(() => undefined);
    else void resource.loadCache();
  }, [resource, refreshOnMount]);
  return useMemo(() => ({ ...state, refresh: () => resource.refresh() }), [state, resource]);
}

export function useSession(): SessionState & {
  readonly getSessionToken: () => Promise<string>;
  readonly linkApple: (body: AppleLinkRequest) => Promise<Session>;
} {
  const data = useData();
  const state = useStore(data.session.store);
  return useMemo(
    () => ({
      ...state,
      getSessionToken: () => data.getSessionToken(),
      linkApple: (body: AppleLinkRequest) => data.linkApple(body),
    }),
    [state, data],
  );
}

/** Whether the API answers, and how many writes wait for it. */
export function useConnectivity(): ConnectivityState & { readonly pendingWrites: number } {
  const data = useData();
  const { online } = useStore(data.connectivity.store);
  const pendingWrites = useStore(data.outbox.store, (s) => s.pending);
  return { online, pendingWrites };
}

export function useProfile(): Loaded<Profile> & {
  readonly profile: Profile | null;
  /** The whole profile, at the end of onboarding (needs the server). */
  readonly saveProfile: (input: ProfileInput) => Promise<Profile>;
  /** Some fields; shown at once, queued offline. */
  readonly updateProfile: (update: ProfileUpdate) => Promise<Profile | null>;
} {
  const data = useData();
  const loaded = useResource(data.profile.resource);
  return useMemo(
    () => ({
      ...loaded,
      profile: loaded.data,
      saveProfile: (input: ProfileInput) => data.profile.put(input),
      updateProfile: (update: ProfileUpdate) => data.profile.patch(update),
    }),
    [loaded, data],
  );
}

export function useProgress(): Loaded<Progress> & {
  readonly progress: Progress | null;
  /** Saves over the revision the phone has; the server's copy wins a conflict. */
  readonly updateProgress: (change: (current: Progress) => Progress) => Promise<ProgressSave>;
} {
  const data = useData();
  const loaded = useResource(data.progress.resource);
  return useMemo(
    () => ({
      ...loaded,
      progress: loaded.data,
      updateProgress: (change: (current: Progress) => Progress) => data.progress.update(change),
    }),
    [loaded, data],
  );
}

/** This week's ring from progress and the day clock; moves on at local midnight. */
export function useWeek(): CurrentWeek | null {
  const data = useData();
  const progress = useStore(data.progress.resource.store, (s) => s.data);
  const timezone =
    useStore(data.profile.resource.store, (s) => s.data?.timezone) ?? deviceTimeZone();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setTimeout(() => setNow(Date.now()), msUntilNextDay(now, timezone));
    return () => clearTimeout(timer);
  }, [now, timezone]);
  return useMemo(
    () => (progress === null ? null : currentWeek(progress, now, timezone)),
    [progress, now, timezone],
  );
}

export function useMinutes(): Loaded<MinutesSummary> & { readonly minutes: MinutesSummary | null } {
  const data = useData();
  const loaded = useResource(data.minutes);
  return useMemo(() => ({ ...loaded, minutes: loaded.data }), [loaded]);
}

export function useMemory(): Loaded<readonly MemoryItem[]> & {
  readonly items: readonly MemoryItem[];
  readonly addMemory: (body: MemoryCreate) => Promise<MemoryItem>;
  readonly editMemory: (id: string, update: MemoryUpdate) => Promise<void>;
  readonly removeMemory: (id: string) => Promise<void>;
} {
  const data = useData();
  const loaded = useResource(data.memory.resource);
  return useMemo(
    () => ({
      ...loaded,
      items: loaded.data ?? [],
      addMemory: (body: MemoryCreate) => data.memory.create(body),
      editMemory: (id: string, update: MemoryUpdate) => data.memory.edit(id, update),
      removeMemory: (id: string) => data.memory.remove(id),
    }),
    [loaded, data],
  );
}

/** Past calls, newest first; read from the server when the screen opens. */
export function useCalls(): Loaded<readonly CallRecord[]> & {
  readonly calls: readonly CallRecord[];
} {
  const data = useData();
  const loaded = useResource(data.calls.list, true);
  return useMemo(() => ({ ...loaded, calls: loaded.data ?? [] }), [loaded]);
}

/** One call's record; read from the server when the screen opens (`refresh` to poll a summary). */
export function useCall(id: string): Loaded<CallRecord> & { readonly call: CallRecord | null } {
  const data = useData();
  const resource = useMemo(() => data.calls.detail(id), [data, id]);
  const loaded = useResource(resource, true);
  return useMemo(() => ({ ...loaded, call: loaded.data }), [loaded]);
}

/** Push-token registration and account deletion (both need the server). */
export function useAccount(): Pick<
  ReturnType<typeof useData>,
  'registerPushToken' | 'unregisterPushToken' | 'deleteAccount'
> {
  const data = useData();
  return useMemo(
    () => ({
      registerPushToken: (body) => data.registerPushToken(body),
      unregisterPushToken: (body) => data.unregisterPushToken(body),
      deleteAccount: () => data.deleteAccount(),
    }),
    [data],
  );
}
