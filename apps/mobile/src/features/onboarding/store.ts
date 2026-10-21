import { createStore, type Store } from '../../data/store';
import {
  INITIAL_ONBOARDING,
  OnboardingState,
  onboardingReducer,
  type OnboardingEvent,
} from './flow';

/*
 * The onboarding's state on this phone: what the learner chose before the profile exists, where
 * they are, and the pace they asked for. Kept as one JSON value, so a relaunch resumes the flow.
 */

/** Where the state is kept: synchronous, so the first frame already knows where to go. */
export interface OnboardingStorage {
  get(): string | null;
  set(value: string | null): void;
}

export interface OnboardingStore {
  readonly store: Store<OnboardingState>;
  dispatch(event: OnboardingEvent): OnboardingState;
}

function read(storage: OnboardingStorage): OnboardingState {
  let raw: string | null;
  try {
    raw = storage.get();
  } catch {
    return INITIAL_ONBOARDING;
  }
  if (raw === null) return INITIAL_ONBOARDING;
  try {
    const parsed = OnboardingState.safeParse(JSON.parse(raw));
    if (parsed.success) return parsed.data;
  } catch {
    // Unreadable: the flow starts again.
  }
  return INITIAL_ONBOARDING;
}

export function createOnboardingStore(storage: OnboardingStorage): OnboardingStore {
  const store = createStore(read(storage));
  return {
    store,
    dispatch(event) {
      const next = onboardingReducer(store.get(), event);
      if (next !== store.get()) {
        store.set(next);
        try {
          storage.set(JSON.stringify(next));
        } catch {
          // The flow still works this session; a relaunch may repeat a step.
        }
      }
      return next;
    },
  };
}
