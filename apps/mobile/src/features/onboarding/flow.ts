import {
  FirstLanguage,
  Name,
  QuietHours,
  RoommateSpecies,
  type Profile,
  type ProfileInput,
  type ProfileUpdate,
  type TimeZone,
  type Track,
} from '@yapling/contracts';
import { chromeLocale, type ChromeLocale } from '@yapling/domain';
import { CAST } from '@yapling/story';
import { z } from 'zod';

/*
 * The first run as a small state machine: the ferry (first language, then the learner's name and
 * the age check, which makes the guest session), the AI disclosure, the roommate, the placement
 * call, the residency card and notifications. Screens dispatch events; the state is kept on the
 * phone so a relaunch resumes where the learner left off.
 */

export const ONBOARDING_STEPS = [
  'language',
  'age',
  'ai',
  'pick',
  'unpack',
  'card',
  'notifications',
  'done',
] as const;
export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];

/** Quiet hours until the learner changes them: no knocks from 22:00 to 08:00. */
export const DEFAULT_QUIET_HOURS: QuietHours = { start: '22:00', end: '08:00' };

/** Onboarding doesn't ask for a track; both alternates Life and Work until the learner picks one. */
export const DEFAULT_TRACK: Track = 'both';

/** The roommate's name until the learner renames it. */
export const DEFAULT_ROOMMATE_NAME = CAST.pip.name;

/**
 * "Too easy" / "Too hard" on the residency card. The profile has no field for it yet: it stays on
 * the phone for the call's `hello` to carry once the protocol has a place for it.
 */
export const Pace = z.enum(['faster', 'slower']);
export type Pace = z.infer<typeof Pace>;

export const OnboardingState = z.object({
  /** The furthest step reached: where a relaunch picks up. */
  step: z.enum(ONBOARDING_STEPS),
  firstLanguage: FirstLanguage,
  ageConfirmed: z.boolean(),
  /** As typed; trimmed when saved. */
  displayName: z.string(),
  species: RoommateSpecies,
  roommateName: z.string(),
  quietOn: z.boolean(),
  quietHours: QuietHours,
  pace: Pace.nullable(),
  /** The placement call, once it ended with one (its summary fills the residency card). */
  placementCallId: z.string().nullable(),
});
export type OnboardingState = z.infer<typeof OnboardingState>;

export const INITIAL_ONBOARDING: OnboardingState = {
  step: 'language',
  firstLanguage: 'vi',
  ageConfirmed: false,
  displayName: '',
  species: 'redpanda',
  roommateName: DEFAULT_ROOMMATE_NAME,
  quietOn: true,
  quietHours: DEFAULT_QUIET_HOURS,
  pace: null,
  placementCallId: null,
};

export type OnboardingEvent =
  | { readonly type: 'chooseLanguage'; readonly language: FirstLanguage }
  | { readonly type: 'languageDone' }
  | { readonly type: 'setAgeConfirmed'; readonly confirmed: boolean }
  | { readonly type: 'setDisplayName'; readonly name: string }
  /** The guest session exists: only after the age check. */
  | { readonly type: 'guestStarted' }
  | { readonly type: 'aiUnderstood' }
  | { readonly type: 'chooseSpecies'; readonly species: RoommateSpecies }
  | { readonly type: 'setRoommateName'; readonly name: string }
  /** The profile was saved. */
  | { readonly type: 'movedIn' }
  | { readonly type: 'placed'; readonly callId: string | null }
  | { readonly type: 'adjustPace'; readonly pace: Pace }
  | { readonly type: 'cardDone' }
  | { readonly type: 'setQuietOn'; readonly on: boolean }
  | { readonly type: 'setQuietHours'; readonly hours: QuietHours }
  | { readonly type: 'notificationsAnswered' }
  /** Back to the start (a fresh install, or after the account was deleted). */
  | { readonly type: 'reset' };

const stepIndex = (step: OnboardingStep) => ONBOARDING_STEPS.indexOf(step);

/** Moves the resume point forward to `step`, never back. */
const reach = (state: OnboardingState, step: OnboardingStep): OnboardingState =>
  stepIndex(step) > stepIndex(state.step) ? { ...state, step } : state;

/** Why a name can't be saved yet, or null when it can (1–24 characters, one line). */
export type NameIssue = 'empty' | 'invalid';
export function nameIssue(text: string): NameIssue | null {
  const trimmed = text.trim();
  if (trimmed === '') return 'empty';
  return Name.safeParse(trimmed).success ? null : 'invalid';
}

/** "Step off the ferry" is open once the learner is 18+ and has said what to call them. */
export const canStepOff = (s: OnboardingState): boolean =>
  s.ageConfirmed && nameIssue(s.displayName) === null;

/** "Move in" is open once the roommate has a name (and the ferry was passed). */
export const canMoveIn = (s: OnboardingState): boolean =>
  canStepOff(s) && nameIssue(s.roommateName) === null;

export function onboardingReducer(state: OnboardingState, event: OnboardingEvent): OnboardingState {
  switch (event.type) {
    case 'chooseLanguage':
      return { ...state, firstLanguage: event.language };
    case 'languageDone':
      return reach(state, 'age');
    case 'setAgeConfirmed':
      return { ...state, ageConfirmed: event.confirmed };
    case 'setDisplayName':
      return { ...state, displayName: event.name };
    case 'guestStarted':
      // The age gate: no way past the ferry without the check and a name.
      return canStepOff(state) ? reach(state, 'ai') : state;
    case 'aiUnderstood':
      return stepIndex(state.step) >= stepIndex('ai') ? reach(state, 'pick') : state;
    case 'chooseSpecies':
      return { ...state, species: event.species };
    case 'setRoommateName':
      return { ...state, roommateName: event.name };
    case 'movedIn':
      return canMoveIn(state) ? reach(state, 'unpack') : state;
    case 'placed':
      return stepIndex(state.step) >= stepIndex('unpack')
        ? { ...reach(state, 'card'), placementCallId: event.callId ?? state.placementCallId }
        : state;
    case 'adjustPace':
      return { ...state, pace: event.pace };
    case 'cardDone':
      return stepIndex(state.step) >= stepIndex('card') ? reach(state, 'notifications') : state;
    case 'setQuietOn':
      return { ...state, quietOn: event.on };
    case 'setQuietHours':
      return event.hours.start === event.hours.end ? state : { ...state, quietHours: event.hours };
    case 'notificationsAnswered':
      return stepIndex(state.step) >= stepIndex('notifications') ? reach(state, 'done') : state;
    case 'reset':
      return INITIAL_ONBOARDING;
  }
}

/** The chrome's language for the learner's first language (English chrome for the others). */
export const chromeLanguageOf = (firstLanguage: FirstLanguage): ChromeLocale =>
  chromeLocale(firstLanguage);

/** The whole profile, saved when the learner moves in. */
export function profileInputOf(s: OnboardingState, timezone: TimeZone): ProfileInput {
  return {
    displayName: s.displayName.trim(),
    firstLanguage: s.firstLanguage,
    roommate: { species: s.species, name: s.roommateName.trim() },
    track: DEFAULT_TRACK,
    quietHours: s.quietOn ? s.quietHours : null,
    timezone,
    // Asked in context later, after the residency card.
    notificationsAllowed: false,
  };
}

/** What the notifications step changes on the profile, whichever button was pressed. */
export function notificationsUpdateOf(s: OnboardingState, allowed: boolean): ProfileUpdate {
  return { notificationsAllowed: allowed, quietHours: s.quietOn ? s.quietHours : null };
}

/** Where an open of the app goes: an onboarding step, the burrow, or nowhere yet (still reading). */
export type LaunchTarget =
  | { readonly kind: 'wait' }
  | { readonly kind: 'home' }
  | { readonly kind: 'onboarding'; readonly step: Exclude<OnboardingStep, 'done'> };

export interface LaunchInputs {
  /** The session store's status, and whether there is a session. */
  readonly sessionStatus:
    'idle' | 'starting' | 'awaiting_age' | 'ready' | 'offline' | 'signed_out' | 'error';
  readonly hasSession: boolean;
  /** The profile, from the cache or the server. */
  readonly profile: Profile | null;
  /** Whether the server has answered for the profile (or failed to), so `null` means none. */
  readonly profileSettled: boolean;
  readonly step: OnboardingStep;
}

const WAIT: LaunchTarget = { kind: 'wait' };
const HOME: LaunchTarget = { kind: 'home' };
const at = (step: Exclude<OnboardingStep, 'done'>): LaunchTarget => ({ kind: 'onboarding', step });

/** The steps after the profile is saved, which a relaunch resumes. */
const AFTER_MOVE_IN = new Set<OnboardingStep>(['unpack', 'card', 'notifications']);

export function launchTarget(i: LaunchInputs): LaunchTarget {
  // A learner with a profile lives in the burrow, unless they were partway through the steps after
  // moving in. A reinstall keeps the Keychain session but not this phone's onboarding state, and
  // lands in the burrow too.
  if (i.profile !== null) return AFTER_MOVE_IN.has(i.step) ? at(i.step as 'unpack') : HOME;
  if (i.sessionStatus === 'idle' || i.sessionStatus === 'starting') return WAIT;
  if (!i.hasSession) {
    // No session: the ferry again (the age check makes one). A learner who had chosen a language
    // keeps it and starts at the age check.
    return at(i.step === 'language' ? 'language' : 'age');
  }
  if (!i.profileSettled) return WAIT;
  // A session and no profile: up to the roommate, where the profile is saved.
  if (i.step === 'language' || i.step === 'age') return at('ai');
  return at(i.step === 'ai' ? 'ai' : 'pick');
}
