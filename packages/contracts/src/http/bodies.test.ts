import { describe, expect, it } from 'vitest';

import { at, callRecordId, memoryId, token, userId } from '../samples.test-data';
import { describeSchemas } from '../schema-runner.test-data';
import * as account from './account';
import * as errors from './errors';
import * as memory from './memory';
import * as minutes from './minutes';
import * as profile from './profile';
import * as progress from './progress';
import * as push from './push';
import { API_ROUTES } from './routes';
import * as session from './session';

const day = 86_400_000;

describeSchemas('errors', errors, {
  ApiError: [
    [{ error: { code: 'not_found' } }, { error: { code: 'internal' } }],
    [{ error: 'not_found' }, { error: { code: 'Not Found' } }, {}],
  ],
});

const guest = {
  installId: '0192f1e2-3b4c-4d5e-8f60-123456789abc',
  clientVersion: '1.0.0',
  ageConfirmed: true,
};
const apple = {
  identityToken: 'eyJ'.padEnd(40, 'x'),
  nonce: 'n'.repeat(32),
  authorizationCode: 'c1',
};
const sessionBody = { userId, token, expiresAt: at + 30 * day, kind: 'guest' };

describeSchemas('session', session, {
  GuestSessionRequest: [
    [guest, { ...guest, timezone: 'Asia/Ho_Chi_Minh' }],
    [
      { ...guest, timezone: 'Ho Chi Minh City' },
      { ...guest, timezone: null },
      { ...guest, ageConfirmed: false },
      { ...guest, installId: 'install-1' },
      { ...guest, clientVersion: undefined },
    ],
  ],
  AppleLinkRequest: [
    [apple, { ...apple, authorizationCode: null }],
    [
      { ...apple, nonce: 'short' },
      { ...apple, identityToken: '' },
    ],
  ],
  SessionKind: [['guest', 'apple'], ['google']],
  Session: [
    [sessionBody, { ...sessionBody, kind: 'apple' }],
    [
      { ...sessionBody, token: 'x' },
      { ...sessionBody, expiresAt: -1 },
    ],
  ],
});

const profileInput = {
  displayName: 'Lan',
  firstLanguage: 'vi',
  roommate: { species: 'redpanda', name: 'Pip' },
  track: 'work',
  quietHours: { start: '22:00', end: '08:00' },
  timezone: 'Asia/Ho_Chi_Minh',
  notificationsAllowed: true,
};
const profileBody = {
  revision: 3,
  ...profileInput,
  pace: null,
  stage: 'newcomer',
  updatedAt: at,
  storyStartedOn: null,
  startPath: null,
};
const visitorProfile = {
  ...profileBody,
  stage: 'visitor',
  startPath: 'visitor',
  storyStartedOn: null,
};
const settledProfile = { ...visitorProfile, storyStartedOn: '2026-10-25' };
const placedProfile = { ...profileBody, startPath: 'placement', storyStartedOn: '2026-10-22' };

describeSchemas('profile', profile, {
  Name: [
    ['Lan', 'Nguyễn Thị Lan', 'Bánh Mì 2'],
    ['', ' Lan', 'Lan ', 'Lan\nNguyen', 'x'.repeat(25)],
  ],
  Roommate: [
    [profileInput.roommate, { species: 'capybara', name: 'Bơ' }, { species: 'cat', name: 'Pip' }],
    [
      { species: 'otter', name: 'Pip' },
      { species: 'cat', name: '' },
    ],
  ],
  QuietHours: [
    [profileInput.quietHours, { start: '13:00', end: '14:30' }],
    [
      { start: '22:00', end: '22:00' },
      { start: '22:00', end: '8:00' },
    ],
  ],
  StartPath: [
    ['visitor', 'placement'],
    ['newcomer', 'skip', null],
  ],
  Profile: [
    [
      profileBody,
      { ...profileBody, quietHours: null, firstLanguage: 'other', stage: 'voice' },
      { ...profileBody, pace: 'slower' },
      visitorProfile,
      settledProfile,
      placedProfile,
    ],
    [
      { ...profileBody, startPath: 'skip' },
      { ...profileBody, storyStartedOn: '25/10/2026' },
      { ...profileBody, stage: 'beginner' },
      { ...profileBody, pace: 'both' },
      { ...profileBody, revision: 0 },
      { ...profileBody, stage: 'b1' },
      { ...profileBody, firstLanguage: 'en' },
      { ...profileBody, timezone: '+07:00' },
      { ...profileBody, quietHours: undefined },
    ],
  ],
  ProfileInput: [
    [
      profileInput,
      { ...profileInput, notificationsAllowed: false, quietHours: null },
      { ...profileInput, pace: 'faster' },
      { ...profileInput, pace: null },
      { ...profileInput, startPath: 'visitor' },
      { ...profileInput, startPath: 'placement', storyStartedOn: '2026-10-22' },
      { ...profileInput, startPath: null, storyStartedOn: null },
    ],
    [
      { ...profileInput, track: undefined },
      { ...profileInput, pace: 'fast' },
      { ...profileInput, startPath: 'newcomer' },
      { ...profileInput, storyStartedOn: 'tomorrow' },
    ],
  ],
  ProfileUpdate: [
    [
      { displayName: 'Lan Anh' },
      { quietHours: null },
      { track: 'both', notificationsAllowed: false },
      { pace: 'slower' },
      { pace: null },
      { storyStartedOn: '2026-10-25' },
      { startPath: 'visitor' },
      { storyStartedOn: null, startPath: null },
    ],
    [
      {},
      { stage: 'regular', displayName: '' },
      { roommate: { species: 'cat' } },
      { startPath: 'skip' },
      { storyStartedOn: '2026-02-30' },
    ],
  ],
});

const seedPhrase = {
  id: 'push-to-friday',
  text: 'Could we push that to Friday?',
  state: 'seed',
  seedAt: at,
  sproutAt: null,
  leafAt: null,
  bloomAt: null,
  lastUsedAt: null,
  usedOn: [],
  contexts: [],
};
const bloomPhrase = {
  ...seedPhrase,
  id: 'could-i-get',
  text: 'Could I get…?',
  state: 'bloom',
  sproutAt: at + day,
  leafAt: at + 4 * day,
  bloomAt: at + 20 * day,
  lastUsedAt: at + 20 * day,
  usedOn: ['2026-10-23', '2026-10-26', '2026-11-11'],
  contexts: ['s1-e1', 's1-e3'],
};
const activeTarget = {
  id: 'past_ed',
  status: 'active',
  selfCorrections: 3,
  selfCorrectionDays: ['2026-10-23', '2026-10-24'],
  activatedAt: at,
  graduatedAt: null,
};
const graduatedTarget = {
  ...activeTarget,
  id: 'articles',
  status: 'graduated',
  selfCorrections: 5,
  selfCorrectionDays: ['2026-10-23', '2026-10-24', '2026-10-27'],
  graduatedAt: at + 9 * day,
};
const waitingTarget = {
  id: 'final_s',
  status: 'waiting',
  selfCorrections: 0,
  selfCorrectionDays: [],
  activatedAt: null,
  graduatedAt: null,
};
const evidence = { callRecordId, quote: 'Could I get a kaya toast, please?', at };
const tickedCanDo = {
  id: 'order-and-change',
  stage: 'newcomer',
  status: 'ticked',
  evidence: [evidence],
  witness: 'mei',
  tickedOn: '2026-10-23',
};
const openCanDo = {
  id: 'introduce-job',
  stage: 'newcomer',
  status: 'in_progress',
  evidence: [],
  witness: null,
  tickedOn: null,
};
const canDoKeepsake = {
  id: 'kp-order-and-change',
  kind: 'can_do',
  canDoId: 'order-and-change',
  signedBy: 'mei',
  earnedOn: '2026-10-23',
};
const seasonKeepsake = {
  id: 'kp-s1-cafe-sign',
  kind: 'season',
  canDoId: null,
  signedBy: null,
  earnedOn: '2026-12-01',
};
const doneSlot = {
  kind: 'episode',
  status: 'done',
  sceneId: 's1-e1',
  callRecordId,
  doneAt: at,
};
const openSlot = {
  kind: 'real_week',
  status: 'open',
  sceneId: null,
  callRecordId: null,
  doneAt: null,
};
const upcomingSlot = { ...openSlot, kind: 'practice', status: 'upcoming', sceneId: 'pass-it-on' };
const week1 = { week: 1, slots: [doneSlot, openSlot, upcomingSlot] };
const week2 = {
  week: 2,
  slots: [
    { ...doneSlot, status: 'open', sceneId: 's1-e2', callRecordId: null, doneAt: null },
    openSlot,
    { ...upcomingSlot, status: 'open' },
  ],
};
const progressBody = {
  revision: 12,
  installedOn: '2026-10-22',
  dayIndex: 8,
  phrases: [seedPhrase, bloomPhrase],
  errorTargets: [activeTarget, graduatedTarget, waitingTarget],
  canDos: [tickedCanDo, openCanDo],
  keepsakes: [canDoKeepsake, seasonKeepsake],
  weeks: [week1, week2],
  settlingChaptersDone: [],
};
const freshProgress = {
  revision: 1,
  installedOn: '2026-10-22',
  dayIndex: 1,
  phrases: [],
  errorTargets: [],
  canDos: [],
  keepsakes: [],
  weeks: [],
  settlingChaptersDone: [],
};
const chapter1 = { chapter: 1, doneOn: '2026-10-22', callRecordId };
const chapter2 = { chapter: 2, doneOn: '2026-10-23', callRecordId: 'call_01J9ZK6' };
const chapter3 = { chapter: 3, doneOn: '2026-10-23', callRecordId: null };
const settlingProgress = {
  ...freshProgress,
  revision: 4,
  settlingChaptersDone: [chapter1, chapter2],
};
const allSettled = Array.from({ length: 6 }, (_, i) => ({
  chapter: i + 1,
  doneOn: `2026-10-2${2 + Math.floor(i / 2)}`,
  callRecordId: null,
}));

describeSchemas('progress', progress, {
  PhraseProgress: [
    [
      seedPhrase,
      bloomPhrase,
      {
        ...seedPhrase,
        state: 'sprout',
        sproutAt: at + day,
        lastUsedAt: at + day,
        usedOn: ['2026-10-23'],
        contexts: ['s1-e1'],
      },
      // Pip's minute: when Pip last reused it slightly wrong, or never (null).
      { ...bloomPhrase, pipReusedAt: at + 10 * day },
      { ...seedPhrase, pipReusedAt: null },
    ],
    [
      { ...bloomPhrase, pipReusedAt: -1 },
      { ...bloomPhrase, pipReusedAt: '2026-10-23' },
      { ...bloomPhrase, usedOn: ['2026-10-26', '2026-10-23'] },
      { ...bloomPhrase, usedOn: ['2026-10-23', '2026-10-23'] },
      { ...bloomPhrase, usedOn: [] },
      { ...seedPhrase, usedOn: ['2026-10-23'] },
      { ...bloomPhrase, usedOn: ['23 Oct'] },
      { ...bloomPhrase, contexts: ['s1-e1', 's1-e1'] },
      { ...bloomPhrase, contexts: ['Scene One'] },
      { ...bloomPhrase, contexts: Array.from({ length: 21 }, (_, i) => `s1-e${i}`) },
      { ...seedPhrase, contexts: undefined },
      { ...seedPhrase, state: 'sprout' },
      { ...seedPhrase, leafAt: at },
      { ...bloomPhrase, bloomAt: null },
      { ...seedPhrase, state: 'met' },
    ],
  ],
  ErrorTargetStatus: [['waiting', 'active', 'graduated'], ['dropped']],
  ErrorTargetProgress: [
    [activeTarget, graduatedTarget, waitingTarget],
    [
      { ...activeTarget, graduatedAt: at },
      { ...graduatedTarget, graduatedAt: null },
      { ...activeTarget, activatedAt: null },
      {
        ...activeTarget,
        selfCorrectionDays: ['2026-10-23', '2026-10-24', '2026-10-25', '2026-10-26'],
      },
      { ...activeTarget, selfCorrectionDays: ['2026-10-24', '2026-10-23'] },
      { ...activeTarget, selfCorrectionDays: ['2026-10-23', '2026-10-23'] },
      { ...activeTarget, selfCorrectionDays: undefined, correctionDays: 2 },
      { ...activeTarget, selfCorrections: -1 },
    ],
  ],
  CanDoEvidence: [[evidence], [{ ...evidence, quote: '' }]],
  CanDoProgress: [
    [tickedCanDo, openCanDo, { ...openCanDo, evidence: [evidence] }],
    [
      { ...tickedCanDo, witness: null },
      { ...tickedCanDo, evidence: [] },
      { ...openCanDo, tickedOn: '2026-10-23' },
      { ...tickedCanDo, witness: 'sari' },
    ],
  ],
  KeepsakeKind: [['can_do', 'season', 'story'], ['badge']],
  Keepsake: [
    [canDoKeepsake, seasonKeepsake, { ...seasonKeepsake, kind: 'story', signedBy: 'linh' }],
    [
      { ...canDoKeepsake, canDoId: null },
      { ...seasonKeepsake, canDoId: 'order-and-change' },
    ],
  ],
  RingSlotStatus: [['upcoming', 'open', 'done'], ['missed']],
  RingSlot: [
    [doneSlot, openSlot, upcomingSlot],
    [
      { ...doneSlot, doneAt: null },
      { ...openSlot, callRecordId },
      { ...openSlot, status: 'missed' },
    ],
  ],
  WeekRing: [
    [week1, week2],
    [
      { week: 1, slots: [doneSlot, openSlot] },
      { week: 1, slots: [openSlot, doneSlot, upcomingSlot] },
      { ...week1, week: 0 },
    ],
  ],
  SettlingChapterDone: [
    [chapter1, chapter3, { ...chapter1, chapter: 6 }],
    [
      { ...chapter1, chapter: 0 },
      { ...chapter1, chapter: 7 },
      { ...chapter1, chapter: 1.5 },
      { ...chapter1, doneOn: at },
      { ...chapter1, callRecordId: undefined },
    ],
  ],
  SettlingProgress: [
    [
      [],
      [chapter1],
      [chapter1, chapter2, chapter3],
      [{ ...chapter3, chapter: 4, doneOn: '2026-10-22' }, chapter1],
      allSettled,
    ],
    [
      [chapter1, chapter1],
      [chapter2, { ...chapter1, doneOn: '2026-10-21' }],
      [...allSettled, chapter1],
    ],
  ],
  Progress: [
    [progressBody, freshProgress, settlingProgress],
    [
      { ...settlingProgress, settlingChaptersDone: [chapter1, chapter1] },
      { ...settlingProgress, settlingChaptersDone: null },
      { ...progressBody, dayIndex: 0 },
      {
        ...progressBody,
        errorTargets: [activeTarget, { ...activeTarget, id: 'final_s' }, activeTarget],
      },
      { ...progressBody, weeks: [week2] },
      { ...progressBody, weeks: [week1, week1] },
    ],
  ],
  ProgressPut: [[progressBody], [{ ...progressBody, dayIndex: 0 }]],
  SeasonKeepsakeRequest: [
    [{ season: 1 }, { season: 2 }],
    [{ season: 0 }, { season: 1.5 }, { season: '1' }, {}],
  ],
});

const memoryItem = {
  id: memoryId,
  text: 'Interview at a logistics company, Thursday 10:00',
  category: 'coming_up',
  createdAt: at,
  sourceCallId: callRecordId,
};
const ownMemory = {
  ...memoryItem,
  category: 'about_you',
  text: 'Works in logistics',
  sourceCallId: null,
};

describeSchemas('memory', memory, {
  MemoryCategory: [['about_you', 'coming_up', 'about_us'], ['about_your_english']],
  MemoryItem: [
    [memoryItem, ownMemory, { ...memoryItem, category: 'about_us', text: 'Pip hates seagulls' }],
    [
      { ...memoryItem, text: '' },
      { ...memoryItem, text: 'x'.repeat(501) },
      { ...memoryItem, sourceCallId: undefined },
    ],
  ],
  MemoryList: [
    [{ items: [memoryItem, ownMemory] }, { items: [] }],
    [{ items: [{}] }, {}],
  ],
  MemoryCreate: [
    [{ text: 'Has a cat called Mochi', category: 'about_you' }],
    [{ text: 'Mochi' }, { text: '', category: 'about_you' }],
  ],
  MemoryUpdate: [
    [{ text: 'Has two cats' }, { category: 'about_us' }, { text: 'x', category: 'coming_up' }],
    [{}, { text: '' }, { category: 'other' }],
  ],
});

const freeWeek = {
  plan: 'free',
  periodStart: at,
  periodEnd: at + 7 * day,
  allowanceSeconds: 600,
  usedSeconds: 240,
  leftSeconds: 360,
  firstWeek: false,
};
const plusMonth = {
  ...freeWeek,
  plan: 'plus',
  periodEnd: at + 30 * day,
  allowanceSeconds: 9_000,
  usedSeconds: 0,
  leftSeconds: 9_000,
};

describeSchemas('minutes', minutes, {
  MinutesSummary: [
    [
      freeWeek,
      plusMonth,
      { ...freeWeek, firstWeek: true, allowanceSeconds: 3_600, leftSeconds: 0 },
    ],
    [
      { ...freeWeek, periodEnd: at },
      { ...freeWeek, leftSeconds: 601 },
      { ...plusMonth, firstWeek: true },
      { ...freeWeek, plan: 'pro' },
      { ...freeWeek, usedSeconds: 1.5 },
    ],
  ],
});

const pushToken = { token: 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]', platform: 'ios' };

describeSchemas('push', push, {
  PushTokenRegistration: [
    [pushToken, { token: 'ExpoPushToken[abc123]', platform: 'android' }],
    [
      { ...pushToken, token: 'abc' },
      { ...pushToken, token: 'ExponentPushToken[]' },
      { ...pushToken, platform: 'web' },
    ],
  ],
});

describeSchemas('account', account, {
  DeleteAccountRequest: [[{ confirm: true }], [{ confirm: false }, {}]],
  DeleteAccountResponse: [[{ deletedBy: at + day }], [{ deletedBy: 'tomorrow' }]],
});

describe('bodies from before the beginner path', () => {
  it('parse a profile without the start path or story day as null', () => {
    const { storyStartedOn: _day, startPath: _path, ...older } = profileBody;
    expect(profile.Profile.parse(older)).toEqual(profileBody);
  });

  it('parse progress without Settling in as none done', () => {
    const { settlingChaptersDone: _done, ...older } = progressBody;
    expect(progress.Progress.parse(older)).toEqual(progressBody);
  });

  it('take a profile from an older app, which never sends the new fields', () => {
    expect(profile.ProfileInput.parse(profileInput)).toEqual(profileInput);
  });
});

describe('API routes', () => {
  it('live under /api and escape ids', () => {
    for (const route of Object.values(API_ROUTES)) {
      const path = typeof route === 'string' ? route : route('a/b');
      expect(path.startsWith('/api/')).toBe(true);
    }
    expect(API_ROUTES.memoryItem('a/b')).toBe('/api/me/memory/a%2Fb');
    expect(API_ROUTES.call(callRecordId)).toBe(`/api/calls/${callRecordId}`);
    expect(API_ROUTES.stage).toBe('/api/me/stage');
    expect(API_ROUTES.seasonKeepsake).toBe('/api/me/keepsakes/season');
  });
});
