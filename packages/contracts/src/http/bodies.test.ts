import { describe, expect, it } from 'vitest';

import { at, callRecordId, memoryId, token, userId } from '../samples.test-data';
import { describeSchemas } from '../schema-runner.test-data';
import * as account from './account';
import * as calls from './calls';
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
    [guest],
    [
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
const profileBody = { revision: 3, ...profileInput, stage: 'newcomer', updatedAt: at };

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
  Profile: [
    [profileBody, { ...profileBody, quietHours: null, firstLanguage: 'other', stage: 'voice' }],
    [
      { ...profileBody, revision: 0 },
      { ...profileBody, stage: 'b1' },
      { ...profileBody, firstLanguage: 'en' },
      { ...profileBody, timezone: '+07:00' },
      { ...profileBody, quietHours: undefined },
    ],
  ],
  ProfileInput: [
    [profileInput, { ...profileInput, notificationsAllowed: false, quietHours: null }],
    [{ ...profileInput, track: undefined }],
  ],
  ProfileUpdate: [
    [
      { displayName: 'Lan Anh' },
      { quietHours: null },
      { track: 'both', notificationsAllowed: false },
    ],
    [{}, { stage: 'regular', displayName: '' }, { roommate: { species: 'cat' } }],
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
};

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
    ],
    [
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
  Progress: [
    [progressBody, freshProgress],
    [
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

const fix = {
  from: 'Yesterday I fix the sink',
  to: 'Yesterday I fixed the sink',
  targetId: 'past_ed',
  explanation: 'Việc đã xong hôm qua: thêm -ed.',
};
const metrics = { flowSeconds: 48, paceWpm: 112, pausesPerMin: 3.2 };
const summary = {
  version: calls.CALL_SUMMARY_VERSION,
  wins: ['You ordered and changed your order.', 'You asked Mei to slow down.'],
  fix,
  phraseEvents: [
    { phraseId: 'could-i-get', text: 'Could I get…?', event: 'sprouted' },
    { phraseId: 'push-to-friday', text: 'Could we push that to Friday?', event: 'met' },
  ],
  canDoEvidence: [
    { canDoId: 'order-and-change', quote: 'Could I get a kaya toast?', witness: 'mei' },
  ],
  metrics,
  memoryItemIds: [memoryId],
};
const record = {
  id: callRecordId,
  kind: 'episode',
  sceneId: 's1-e1',
  character: 'mei',
  startedAt: at,
  endedAt: at + 9 * 60_000,
  learnerSeconds: 290,
  characterSeconds: 170,
  endReason: 'scene_complete',
  summaryPending: false,
  summary,
};
const pendingRecord = {
  ...record,
  kind: 'placement',
  character: 'pip',
  summaryPending: true,
  summary: null,
};

describeSchemas('calls', calls, {
  CallFix: [[fix, { ...fix, targetId: null, explanation: null }], [{ ...fix, to: '' }]],
  PhraseEventKind: [[...calls.PHRASE_EVENT_KINDS], ['wilted']],
  PhraseEvent: [[summary.phraseEvents[0]], [{ phraseId: 'x', text: 'x', event: 'wilted' }]],
  CallCanDoEvidence: [[summary.canDoEvidence[0]], [{ canDoId: 'x', quote: 'x', witness: 'me' }]],
  CallMetrics: [
    [metrics, { flowSeconds: 0, paceWpm: 0, pausesPerMin: 0 }],
    [
      { ...metrics, paceWpm: -1 },
      { ...metrics, flowSeconds: undefined },
    ],
  ],
  CallSummary: [
    [
      summary,
      { ...summary, wins: [], fix: null, phraseEvents: [], canDoEvidence: [], memoryItemIds: [] },
    ],
    [
      { ...summary, wins: ['a', 'b', 'c'] },
      { ...summary, version: 0 },
      { ...summary, metrics: undefined },
    ],
  ],
  CallRecord: [
    [record, pendingRecord, { ...record, kind: 'voicemail_reply', endReason: 'hangup' }],
    [
      { ...record, endedAt: at - 1 },
      { ...record, summaryPending: true },
      { ...record, endReason: 'crashed' },
      { ...record, character: 'sari' },
    ],
  ],
  CallRecordList: [
    [{ calls: [record, pendingRecord] }, { calls: [] }],
    [{ calls: [{ ...record, id: '' }] }],
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

describe('API routes', () => {
  it('live under /api and escape ids', () => {
    for (const route of Object.values(API_ROUTES)) {
      const path = typeof route === 'string' ? route : route('a/b');
      expect(path.startsWith('/api/')).toBe(true);
    }
    expect(API_ROUTES.memoryItem('a/b')).toBe('/api/me/memory/a%2Fb');
    expect(API_ROUTES.call(callRecordId)).toBe(`/api/calls/${callRecordId}`);
  });
});
