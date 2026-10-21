import {
  CallRecord,
  Progress,
  type CallSummary,
  type PhraseEvent,
  type WeekRing,
} from '@yapling/contracts';

/*
 * A learner on day 2 of week one, right after the Episode 1 call with Mei, as the server records
 * it: the call, its feedback, and progress with the ring slot filled. Each test changes a part.
 */

export const T0 = Date.UTC(2026, 8, 22, 1, 0, 0); // 22 Sep 2026, 08:00 in Hanoi
export const CALL_ID = 'call_ep1';

export const learner = { name: 'Lan', roommateName: 'Pip' };

const E1_EVENTS: PhraseEvent[] = [
  { phraseId: 'whats-wrong', text: "What's wrong?", event: 'met' },
  { phraseId: 'i-need-a-plan', text: 'I need a plan', event: 'met' },
  { phraseId: 'can-i-help', text: 'Can I help?', event: 'met' },
  { phraseId: 'i-think-you-should', text: 'I think you should…', event: 'met' },
  { phraseId: 'whats-wrong', text: "What's wrong?", event: 'sprouted' },
  { phraseId: 'can-i-help', text: 'Can I help?', event: 'sprouted' },
  { phraseId: 'i-think-you-should', text: 'I think you should…', event: 'sprouted' },
];

export function summary(over: Partial<CallSummary> = {}): CallSummary {
  return {
    version: 1,
    wins: ['You asked Mei what was wrong', 'You introduced yourself to the office'],
    fix: { from: 'I calling', to: "I'm calling", targetId: 'be_verb', explanation: null },
    phraseEvents: E1_EVENTS,
    canDoEvidence: [],
    metrics: { flowSeconds: 20.4, paceWpm: 84.2, pausesPerMin: 6.3 },
    memoryItemIds: [],
    ...over,
  };
}

export function call(over: Partial<CallRecord> = {}): CallRecord {
  return CallRecord.parse({
    id: CALL_ID,
    kind: 'episode',
    sceneId: 's1-e1',
    character: 'mei',
    startedAt: T0,
    endedAt: T0 + 9 * 60_000,
    learnerSeconds: 260,
    characterSeconds: 230,
    endReason: 'scene_complete',
    summaryPending: false,
    summary: summary(),
    ...over,
  });
}

const open = (kind: WeekRing['slots'][number]['kind']) =>
  ({ kind, status: 'open', sceneId: null, callRecordId: null, doneAt: null }) as const;
const done = (kind: WeekRing['slots'][number]['kind'], callRecordId: string, doneAt: number) =>
  ({ kind, status: 'done', sceneId: null, callRecordId, doneAt }) as const;

export function weekOne(slots: WeekRing['slots']): WeekRing {
  return { week: 1, slots };
}

export const RING_ONE: WeekRing = weekOne([
  done('episode', CALL_ID, T0 + 9 * 60_000),
  open('real_week'),
  open('practice'),
]);

export const RING_FULL: WeekRing = weekOne([
  done('episode', 'call_a', T0 - 3 * 86_400_000),
  done('real_week', 'call_b', T0 - 86_400_000),
  done('practice', CALL_ID, T0 + 9 * 60_000),
]);

export function progress(over: Partial<Progress> = {}): Progress {
  const at = T0 + 9 * 60_000;
  return Progress.parse({
    revision: 4,
    installedOn: '2026-09-21',
    dayIndex: 2,
    phrases: [
      {
        id: 'whats-wrong',
        text: "What's wrong?",
        state: 'sprout',
        seedAt: at,
        sproutAt: at,
        leafAt: null,
        bloomAt: null,
        lastUsedAt: at,
        usedOn: ['2026-09-22'],
        contexts: ['s1-e1'],
      },
      {
        id: 'i-need-a-plan',
        text: 'I need a plan',
        state: 'seed',
        seedAt: at,
        sproutAt: null,
        leafAt: null,
        bloomAt: null,
        lastUsedAt: null,
        usedOn: [],
        contexts: [],
      },
      {
        id: 'can-i-help',
        text: 'Can I help?',
        state: 'sprout',
        seedAt: at,
        sproutAt: at,
        leafAt: null,
        bloomAt: null,
        lastUsedAt: at,
        usedOn: ['2026-09-22'],
        contexts: ['s1-e1'],
      },
      {
        id: 'i-think-you-should',
        text: 'I think you should…',
        state: 'sprout',
        seedAt: at,
        sproutAt: at,
        leafAt: null,
        bloomAt: null,
        lastUsedAt: at,
        usedOn: ['2026-09-22'],
        contexts: ['s1-e1'],
      },
    ],
    errorTargets: [],
    canDos: [],
    keepsakes: [],
    weeks: [RING_ONE],
    ...over,
  });
}
