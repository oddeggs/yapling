import type { StageRequest } from '@yapling/contracts';
import { Storage } from 'expo-sqlite/kv-store';
import { useCallback } from 'react';
import { AppState } from 'react-native';

import { appData } from '../../data';
import { useStore } from '../../data/store';
import type { OnboardingEvent, OnboardingState, Pace } from './flow';
import { sendStageRequest } from './stage';
import { createOnboardingStore, type OnboardingStore } from './store';

const KEY = 'yapling.onboarding';

let shared: OnboardingStore | null = null;

/** The app's onboarding store, on the phone's key-value storage. */
export function onboardingStore(): OnboardingStore {
  if (shared === null) {
    shared = createOnboardingStore({
      get: () => Storage.getItemSync(KEY),
      set: (value) => {
        if (value === null) Storage.removeItemSync(KEY);
        else Storage.setItemSync(KEY, value);
      },
    });
    retryPendingStage();
  }
  return shared;
}

/** The onboarding state (or a slice of it) and its dispatch. */
export function useOnboarding<S = OnboardingState>(
  select?: (s: OnboardingState) => S,
): [S, (event: OnboardingEvent) => OnboardingState] {
  const o = onboardingStore();
  const value = useStore(o.store, select);
  const dispatch = useCallback((event: OnboardingEvent) => o.dispatch(event), [o]);
  return [value, dispatch];
}

/**
 * The pace the learner asked for on the residency card ("Too easy" / "Too hard"), or null, before
 * the profile has it.
 */
export const pacePreference = (): Pace | null => onboardingStore().store.get().pace;

/**
 * The learner chose a stage: shown at once, and sent to the server (again later if it can't take
 * it now). Resolves once this send is over, whatever became of it.
 */
export async function requestStage(request: StageRequest): Promise<void> {
  onboardingStore().dispatch({ type: 'stageRequested', request });
  await flushPendingStage();
}

let sending: Promise<void> | null = null;

/** Sends the pending stage request, if there is one and none is on its way. */
export function flushPendingStage(): Promise<void> {
  sending ??= (async () => {
    try {
      const o = onboardingStore();
      // Each pass sends the newest choice; a choice made during a send goes in the next pass.
      for (let pass = 0; pass < 3; pass += 1) {
        const pending = o.store.get().pendingStage;
        if (pending === null) return;
        const outcome = await sendStageRequest(appData(), pending);
        if (outcome === 'later') return;
        o.dispatch({ type: 'stageSettled', request: pending });
      }
    } catch {
      // Sent again on the next try.
    } finally {
      sending = null;
    }
  })();
  return sending;
}

let watching = false;

/**
 * A stage the server didn't take yet is sent again once the session and the profile are on the
 * phone after a launch, and each time the app comes back to the foreground.
 */
function retryPendingStage() {
  if (watching) return;
  watching = true;
  const data = appData();
  const tryNow = () => {
    if (shared?.store.get().pendingStage) void flushPendingStage();
  };
  let wasReady = false;
  const check = () => {
    const ready = data.session.state.session !== null && data.profile.resource.data !== null;
    if (ready && !wasReady) tryNow();
    wasReady = ready;
  };
  data.session.store.subscribe(check);
  data.profile.resource.store.subscribe(check);
  check();
  AppState.addEventListener('change', (state) => {
    if (state === 'active') tryNow();
  });
}
