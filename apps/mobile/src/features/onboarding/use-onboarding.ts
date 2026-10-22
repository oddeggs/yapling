import { Storage } from 'expo-sqlite/kv-store';
import { useCallback } from 'react';

import { useStore } from '../../data/store';
import type { OnboardingEvent, OnboardingState, Pace } from './flow';
import { createOnboardingStore, type OnboardingStore } from './store';

const KEY = 'yapling.onboarding';

let shared: OnboardingStore | null = null;

/** The app's onboarding store, on the phone's key-value storage. */
export function onboardingStore(): OnboardingStore {
  shared ??= createOnboardingStore({
    get: () => Storage.getItemSync(KEY),
    set: (value) => {
      if (value === null) Storage.removeItemSync(KEY);
      else Storage.setItemSync(KEY, value);
    },
  });
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
