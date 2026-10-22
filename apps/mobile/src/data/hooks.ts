import type {
  AppleLinkRequest,
  CallRecord,
  EpochMs,
  MemoryCreate,
  MemoryItem,
  MemoryUpdate,
  MinutesSummary,
  Profile,
  ProfileInput,
  ProfileUpdate,
  Progress,
  Session,
  TurnMode,
} from '@yapling/contracts';
import { useCallback, useEffect, useMemo, useState } from 'react';

import type { ConnectivityState } from './connectivity';
import type { OpenState, SeenMoment, SeenState } from './moments';
import type { ProgressSave } from './progress';
import { useData } from './provider';
import type { TurnModeState } from './turn-mode';
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
  /** Onboarding, once the learner confirms they are 18+: makes the guest session. */
  readonly startGuest: () => Promise<Session>;
  readonly linkApple: (body: AppleLinkRequest) => Promise<Session>;
} {
  const data = useData();
  const state = useStore(data.session.store);
  return useMemo(
    () => ({
      ...state,
      getSessionToken: () => data.getSessionToken(),
      startGuest: () => data.startGuest(),
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
  /** A phrase the learner opened, met as a seed packet (needs the server; skipped if known). */
  readonly meetPhrase: (phrase: { readonly id: string; readonly text: string }) => Promise<void>;
  /** Opens on the server the ring's calls whose day has come on the app's clock. */
  readonly openRing: (dayIndex: number) => Promise<void>;
} {
  const data = useData();
  const loaded = useResource(data.progress.resource);
  return useMemo(
    () => ({
      ...loaded,
      progress: loaded.data,
      updateProgress: (change: (current: Progress) => Progress) => data.progress.update(change),
      meetPhrase: async (phrase: { readonly id: string; readonly text: string }) => {
        await data.progress.meetPhrase(phrase, data.clock.now());
      },
      openRing: async (dayIndex: number) => {
        await data.progress.openRing(dayIndex);
      },
    }),
    [loaded, data],
  );
}

/**
 * The app's time, read again whenever the app's clock moves (the test menu's day jumps) and at
 * every local midnight in `timezone`.
 */
export function useAppNow(timezone: string = deviceTimeZone()): EpochMs {
  const data = useData();
  const moves = useStore(data.clockMoves);
  const [midnights, setMidnights] = useState(0);
  const now = useMemo(() => data.clock.now(), [data, moves, midnights]);
  useEffect(() => {
    const timer = setTimeout(() => setMidnights((n) => n + 1), msUntilNextDay(now, timezone));
    return () => clearTimeout(timer);
  }, [now, timezone]);
  return now;
}

/** This week's ring from progress and the day clock; moves on at local midnight. */
export function useWeek(): CurrentWeek | null {
  const data = useData();
  const progress = useStore(data.progress.resource.store, (s) => s.data);
  const timezone =
    useStore(data.profile.resource.store, (s) => s.data?.timezone) ?? deviceTimeZone();
  const now = useAppNow(timezone);
  return useMemo(
    () => (progress === null ? null : currentWeek(progress, now, timezone)),
    [progress, now, timezone],
  );
}

/** The between-call moments seen on this phone, and the mark for one just finished. */
export function useSeen(): SeenState & {
  readonly markSeen: (...moments: SeenMoment[]) => Promise<void>;
} {
  const data = useData();
  const state = useStore(data.seen.store);
  const markSeen = useCallback((...moments: SeenMoment[]) => data.seen.mark(moments), [data]);
  return useMemo(() => ({ ...state, markSeen }), [state, markSeen]);
}

/**
 * How the learner takes turns in calls (holding the mic, or hands-free), and the switch: for the
 * call and for a settings row. Kept on this phone.
 */
export function useTurnMode(): TurnModeState & {
  readonly setTurnMode: (turnMode: TurnMode) => Promise<void>;
} {
  const data = useData();
  const state = useStore(data.turnMode.store);
  const setTurnMode = useCallback((m: TurnMode) => data.turnMode.set(m), [data]);
  return useMemo(() => ({ ...state, setTurnMode }), [state, setTurnMode]);
}

/** When the app was opened before this open (for the welcome back and day 8's knock). */
export function useLastOpen(): OpenState {
  return useStore(useData().opens.store);
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

/** Push-token registration, account deletion (both need the server) and the test menu's reset. */
export function useAccount(): Pick<
  ReturnType<typeof useData>,
  'registerPushToken' | 'unregisterPushToken' | 'deleteAccount' | 'resetLocal'
> {
  const data = useData();
  return useMemo(
    () => ({
      registerPushToken: (body) => data.registerPushToken(body),
      unregisterPushToken: (body) => data.unregisterPushToken(body),
      deleteAccount: () => data.deleteAccount(),
      resetLocal: () => data.resetLocal(),
    }),
    [data],
  );
}
