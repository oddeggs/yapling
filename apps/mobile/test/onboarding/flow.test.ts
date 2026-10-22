import { describe, expect, it } from '@jest/globals';
import { ProfileInput, type Profile } from '@yapling/contracts';
import { findScene } from '@yapling/story';

import {
  INITIAL_ONBOARDING,
  canStepOff,
  chromeLanguageOf,
  launchTarget,
  nameIssue,
  notificationsUpdateOf,
  onboardingReducer,
  profileInputOf,
  type LaunchInputs,
  type OnboardingEvent,
  type OnboardingState,
} from '../../src/features/onboarding/flow';
import { PLACEMENT_SCENE_ID } from '../../src/features/onboarding/routes';
import { createOnboardingStore } from '../../src/features/onboarding/store';

const run = (events: readonly OnboardingEvent[], from: OnboardingState = INITIAL_ONBOARDING) =>
  events.reduce(onboardingReducer, from);

const throughTheFerry: OnboardingEvent[] = [
  { type: 'languageDone' },
  { type: 'setDisplayName', name: '  Lan ' },
  { type: 'setAgeConfirmed', confirmed: true },
  { type: 'guestStarted' },
];

const movedIn = run([...throughTheFerry, { type: 'aiUnderstood' }, { type: 'movedIn' }]);

describe('the age gate', () => {
  it('keeps the learner on the ferry until they confirm they are 18 or older', () => {
    const unchecked = run([
      { type: 'languageDone' },
      { type: 'setDisplayName', name: 'Lan' },
      { type: 'guestStarted' },
    ]);
    expect(canStepOff(unchecked)).toBe(false);
    expect(unchecked.step).toBe('age');
    // Nothing later moves past the gate either.
    expect(run([{ type: 'aiUnderstood' }, { type: 'movedIn' }], unchecked).step).toBe('age');
  });

  it('needs a name to call the learner by', () => {
    const nameless = run([{ type: 'languageDone' }, { type: 'setAgeConfirmed', confirmed: true }]);
    expect(canStepOff(nameless)).toBe(false);
    expect(run([{ type: 'guestStarted' }], nameless).step).toBe('age');
    expect(nameIssue('   ')).toBe('empty');
    expect(nameIssue('x'.repeat(25))).toBe('invalid');
    expect(nameIssue(' Lan ')).toBeNull();
  });

  it('lets them on once the box is ticked and the guest session exists', () => {
    const state = run(throughTheFerry);
    expect(canStepOff(state)).toBe(true);
    expect(state.step).toBe('ai');
  });

  it('closes again when the box is unticked', () => {
    const state = run([...throughTheFerry, { type: 'setAgeConfirmed', confirmed: false }]);
    expect(canStepOff(state)).toBe(false);
  });
});

describe('the first language', () => {
  it('starts in Vietnamese and keeps the learner’s choice', () => {
    expect(INITIAL_ONBOARDING.firstLanguage).toBe('vi');
    expect(run([{ type: 'chooseLanguage', language: 'th' }]).firstLanguage).toBe('th');
  });

  it('sets Vietnamese chrome for Vietnamese and English chrome for every other language', () => {
    expect(chromeLanguageOf('vi')).toBe('vi');
    for (const l of ['id', 'th', 'pt', 'es', 'ja', 'ko', 'tr', 'other'] as const)
      expect(chromeLanguageOf(l)).toBe('en');
  });
});

describe('moving in', () => {
  it('saves the whole profile the server expects', () => {
    const state = run([
      { type: 'chooseLanguage', language: 'id' },
      ...throughTheFerry,
      { type: 'aiUnderstood' },
      { type: 'chooseSpecies', species: 'capybara' },
      { type: 'setRoommateName', name: ' Bao ' },
    ]);
    const input = profileInputOf(state, 'Asia/Jakarta');
    expect(input).toEqual({
      displayName: 'Lan',
      firstLanguage: 'id',
      roommate: { species: 'capybara', name: 'Bao' },
      track: 'both',
      quietHours: { start: '22:00', end: '08:00' },
      timezone: 'Asia/Jakarta',
      notificationsAllowed: false,
      pace: null,
    });
    expect(ProfileInput.safeParse(input).success).toBe(true);
  });

  it('defaults to the red panda called Pip', () => {
    const input = profileInputOf(run(throughTheFerry), 'Asia/Ho_Chi_Minh');
    expect(input.roommate).toEqual({ species: 'redpanda', name: 'Pip' });
  });

  it('won’t move in a roommate without a name', () => {
    const state = run([
      ...throughTheFerry,
      { type: 'aiUnderstood' },
      { type: 'setRoommateName', name: '' },
      { type: 'movedIn' },
    ]);
    expect(state.step).toBe('pick');
  });

  it('runs the placement call as the prologue’s unpacking scene', () => {
    expect(findScene(PLACEMENT_SCENE_ID)?.kind).toBe('placement');
  });
});

describe('after the placement call', () => {
  it('remembers the call for the residency card, and the pace the learner asks for', () => {
    const state = run(
      [
        { type: 'placed', callId: 'call_1' },
        { type: 'adjustPace', pace: 'slower' },
      ],
      movedIn,
    );
    expect(state).toMatchObject({ step: 'card', placementCallId: 'call_1', pace: 'slower' });
  });

  it('goes on to the card even when the call ended without a record', () => {
    expect(run([{ type: 'placed', callId: null }], movedIn)).toMatchObject({
      step: 'card',
      placementCallId: null,
    });
  });
});

describe('notifications', () => {
  const atNotifications = run(
    [{ type: 'placed', callId: 'call_1' }, { type: 'cardDone' }],
    movedIn,
  );

  it('finishes onboarding when the learner allows them', () => {
    expect(notificationsUpdateOf(atNotifications, true)).toEqual({
      notificationsAllowed: true,
      quietHours: { start: '22:00', end: '08:00' },
    });
    expect(run([{ type: 'notificationsAnswered' }], atNotifications).step).toBe('done');
  });

  it('finishes onboarding just the same with “Not now”, keeping the quiet hours chosen', () => {
    const edited = run(
      [{ type: 'setQuietHours', hours: { start: '23:00', end: '07:00' } }],
      atNotifications,
    );
    expect(notificationsUpdateOf(edited, false)).toEqual({
      notificationsAllowed: false,
      quietHours: { start: '23:00', end: '07:00' },
    });
    expect(run([{ type: 'notificationsAnswered' }], edited).step).toBe('done');
  });

  it('sends no quiet hours when they are switched off, and ignores an empty range', () => {
    const off = run(
      [
        { type: 'setQuietOn', on: false },
        { type: 'setQuietHours', hours: { start: '22:00', end: '22:00' } },
      ],
      atNotifications,
    );
    expect(off.quietHours).toEqual({ start: '22:00', end: '08:00' });
    expect(notificationsUpdateOf(off, true).quietHours).toBeNull();
  });
});

describe('where an open of the app goes', () => {
  const profile = { revision: 1 } as unknown as Profile;
  const base: LaunchInputs = {
    sessionStatus: 'awaiting_age',
    hasSession: false,
    profile: null,
    profileSettled: false,
    step: 'language',
  };

  it('a fresh install starts on the ferry', () => {
    expect(launchTarget(base)).toEqual({ kind: 'onboarding', step: 'language' });
  });

  it('waits while the session is still being read', () => {
    expect(launchTarget({ ...base, sessionStatus: 'starting' })).toEqual({ kind: 'wait' });
  });

  it('a learner with a profile lands in the burrow, a reinstall included', () => {
    expect(
      launchTarget({ ...base, sessionStatus: 'ready', hasSession: true, profile, step: 'done' }),
    ).toEqual({ kind: 'home' });
    expect(
      launchTarget({
        ...base,
        sessionStatus: 'ready',
        hasSession: true,
        profile,
        step: 'language',
      }),
    ).toEqual({ kind: 'home' });
  });

  it('resumes the steps after moving in', () => {
    for (const step of ['unpack', 'card', 'notifications'] as const)
      expect(
        launchTarget({ ...base, sessionStatus: 'ready', hasSession: true, profile, step }),
      ).toEqual({ kind: 'onboarding', step });
  });

  it('with a session and no profile, goes back to where the profile is made', () => {
    const ready = { ...base, sessionStatus: 'ready', hasSession: true } as const;
    expect(launchTarget({ ...ready, step: 'pick' })).toEqual({ kind: 'wait' });
    expect(launchTarget({ ...ready, profileSettled: true, step: 'card' })).toEqual({
      kind: 'onboarding',
      step: 'pick',
    });
    expect(launchTarget({ ...ready, profileSettled: true, step: 'ai' })).toEqual({
      kind: 'onboarding',
      step: 'ai',
    });
  });

  it('without a session, the age check comes again', () => {
    expect(launchTarget({ ...base, step: 'pick' })).toEqual({ kind: 'onboarding', step: 'age' });
    expect(launchTarget({ ...base, sessionStatus: 'offline', step: 'age' })).toEqual({
      kind: 'onboarding',
      step: 'age',
    });
  });
});

describe('the onboarding store', () => {
  it('keeps the state on the phone, so a relaunch resumes', () => {
    let saved: string | null = null;
    const storage = { get: () => saved, set: (v: string | null) => void (saved = v) };
    const first = createOnboardingStore(storage);
    first.dispatch({ type: 'chooseLanguage', language: 'ko' });
    for (const e of throughTheFerry) first.dispatch(e);

    const relaunched = createOnboardingStore(storage);
    expect(relaunched.store.get()).toMatchObject({ firstLanguage: 'ko', step: 'ai' });
  });

  it('starts again from a value it can’t read', () => {
    const store = createOnboardingStore({ get: () => '{"step":"nowhere"}', set: () => undefined });
    expect(store.store.get()).toEqual(INITIAL_ONBOARDING);
  });
});
