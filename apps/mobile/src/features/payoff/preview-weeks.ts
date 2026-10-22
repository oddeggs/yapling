import {
  CallRecord,
  Progress,
  type CallSummary,
  type ErrorTargetProgress,
  type PhraseEvent,
  type PhraseProgress,
  type RingSlotKind,
  type WeekRing,
} from '@yapling/contracts';
import { addDays } from '@yapling/domain';

/*
 * Development builds only: sample learners later in the season, for looking at the payoffs before
 * a real learner gets there. A Newcomer right after Episode 3 (a bloom and a graduation in it),
 * after a Pip's minute, after Episode 5's petition, and on the last day of week N with the season's
 * calls behind them (`yapling-dev://post?callId=preview&preview=episode-3`, `…=daily`, `…=bloom`,
 * `…=graduation`, `…=petition`; `yapling-dev://wrap?week=4&preview=1`). Nothing is sent from a
 * preview.
 */

export const PREVIEW_ID = 'preview';
const DAY = 86_400_000;
/** Story day 1 of the sample learner: Monday 7 Sep 2026. */
export const PREVIEW_STARTED_ON = '2026-09-07';
const START = Date.UTC(2026, 8, 7, 5, 0, 0);
/** Noon (Hanoi) on a story day. */
const dayAt = (day: number) => START + (day - 1) * DAY;
export const PREVIEW_TIMEZONE = 'Asia/Ho_Chi_Minh';

const SCENES: Record<number, Record<RingSlotKind, string>> = {
  1: { episode: 's1-e1', real_week: 's1-e1-real-week', practice: 's1-e1-practice' },
  2: { episode: 's1-e2', real_week: 's1-e2-real-week', practice: 's1-e2-practice' },
  3: { episode: 's1-e3', real_week: 's1-e3-real-week', practice: 's1-e3-practice' },
  4: { episode: 's1-e4', real_week: 's1-e4-real-week', practice: 's1-e4-practice' },
  5: { episode: 's1-e5', real_week: 's1-e5-real-week', practice: 's1-e5-practice' },
  6: { episode: 's1-e6', real_week: 's1-e6-real-week', practice: 's1-e6-practice' },
};
const SLOT_DAY: Record<RingSlotKind, number> = { episode: 1, real_week: 3, practice: 4 };
const KINDS: readonly RingSlotKind[] = ['episode', 'real_week', 'practice'];

const callId = (week: number, kind: RingSlotKind) => `preview-w${week}-${kind}`;

/** Rings 1…`full` done, then `partial` of week `full + 1`'s slots, then open slots up to `upTo`. */
function rings(full: number, partial: readonly RingSlotKind[], upTo: number): WeekRing[] {
  return Array.from({ length: upTo }, (_, i) => {
    const week = i + 1;
    return {
      week,
      slots: KINDS.map((kind) => {
        const sceneId = SCENES[week]?.[kind] ?? null;
        const done = week <= full || (week === full + 1 && partial.includes(kind));
        return done
          ? {
              kind,
              status: 'done' as const,
              sceneId,
              callRecordId: callId(week, kind),
              doneAt: dayAt((week - 1) * 7 + SLOT_DAY[kind]) + 2 * 3_600_000,
            }
          : { kind, status: 'open' as const, sceneId, callRecordId: null, doneAt: null };
      }),
    };
  });
}

const metrics = (flowSeconds: number) => ({ flowSeconds, paceWpm: 96, pausesPerMin: 4.1 });

function summary(over: Partial<CallSummary> = {}): CallSummary {
  return {
    version: 1,
    wins: [],
    fix: null,
    phraseEvents: [],
    canDoEvidence: [],
    metrics: metrics(24),
    memoryItemIds: [],
    ...over,
  };
}

function record(
  id: string,
  sceneId: string,
  kind: CallRecord['kind'],
  at: number,
  over: Partial<CallRecord> = {},
): CallRecord {
  return CallRecord.parse({
    id,
    kind,
    sceneId,
    character: 'pip',
    startedAt: at - 8 * 60_000,
    endedAt: at,
    learnerSeconds: 200,
    characterSeconds: 180,
    endReason: 'scene_complete',
    summaryPending: false,
    summary: summary(),
    ...over,
  });
}

/** The season's calls so far, Flow growing from 20 s in week 1's Pass it on. */
function seasonCalls(weeks: readonly WeekRing[]): CallRecord[] {
  return weeks
    .flatMap((w) =>
      w.slots.flatMap((s) =>
        s.status === 'done' && s.callRecordId !== null && s.sceneId !== null
          ? [
              record(s.callRecordId, s.sceneId, s.kind, s.doneAt ?? START, {
                summary: summary({ metrics: metrics(20 + (w.week - 1) * 6) }),
              }),
            ]
          : [],
      ),
    )
    .sort((a, b) => b.startedAt - a.startedAt);
}

function phrase(
  id: string,
  text: string,
  state: PhraseProgress['state'],
  times: { seed: number; sprout?: number; leaf?: number; bloom?: number },
): PhraseProgress {
  const last = times.bloom ?? times.leaf ?? times.sprout ?? null;
  const days = [times.sprout, times.leaf, times.bloom]
    .filter((t): t is number => t !== undefined)
    .map((t) => new Date(t + 7 * 3_600_000).toISOString().slice(0, 10));
  return {
    id,
    text,
    state,
    seedAt: times.seed,
    sproutAt: times.sprout ?? null,
    leafAt: times.leaf ?? null,
    bloomAt: times.bloom ?? null,
    lastUsedAt: last,
    usedOn: [...new Set(days)],
    contexts: [],
  };
}

const ticked = (id: string, day: number, witness: 'mei' | 'sol' | 'hank' | 'nell') => ({
  id,
  stage: 'newcomer' as const,
  status: 'ticked' as const,
  evidence: [{ callRecordId: 'preview-evidence', quote: 'Sample line', at: dayAt(day) }],
  witness,
  tickedOn: addDays(PREVIEW_STARTED_ON, day - 1),
});

const weekKeepsakes = (full: number) =>
  Array.from({ length: full }, (_, i) => ({
    id: `week-${i + 1}`,
    kind: 'week' as const,
    canDoId: null,
    signedBy: 'pip' as const,
    earnedOn: addDays(PREVIEW_STARTED_ON, i * 7 + 3),
  }));

/** The learner's phrases on story day `day`: each season phrase grows over the weeks after. */
function phrasesBy(day: number): PhraseProgress[] {
  const all: [string, string, number][] = [
    ['whats-wrong', "What's wrong?", 2],
    ['can-i-help', 'Can I help?', 2],
    ['im-good-at', "I'm good at…", 8],
    ['for-example', 'For example,…', 8],
    ['sorry-we-cant', "Sorry, we can't…", 15],
    ['how-about', 'How about…?', 15],
    ['what-do-you-think', 'What do you think?', 22],
    ['good-idea-and', 'Good idea, and…', 22],
    ['to-sum-up', 'To sum up,…', 23],
    ['heres-the-thing', "Here's the thing:", 29],
    ['a-few-words', "I'd like to say a few words.", 36],
    ['first-second', 'First,… Second,…', 36],
  ];
  return all.flatMap(([id, text, met]) => {
    if (met > day) return [];
    const at = (d: number) => (d <= day ? dayAt(d) : undefined);
    const sprout = at(met + 1);
    const leaf = at(met + 4);
    const bloom = met <= 8 ? at(met + 20) : undefined;
    const state = bloom ? 'bloom' : leaf ? 'leaf' : sprout ? 'sprout' : 'seed';
    return [
      phrase(id, text, state, {
        seed: dayAt(met),
        ...(sprout ? { sprout } : {}),
        ...(leaf ? { leaf } : {}),
        ...(bloom ? { bloom } : {}),
      }),
    ];
  });
}

export interface PreviewWeek {
  readonly progress: Progress;
  readonly calls: readonly CallRecord[];
  readonly startedOn: string;
  readonly today: string;
}

/** The last day of week `week`: rings full up to it (the season done once week 6's is). */
export function previewWeek(week: number): PreviewWeek {
  const lastDay = week * 7;
  const full = Math.min(week, 6);
  const weeks = rings(full, [], Math.max(full, week));
  const canDos = [
    ticked('ask-whats-wrong', 2, 'mei'),
    ticked('introduce-yourself-30s', 4, 'mei'),
    ticked('tell-me-about-yourself', 8, 'sol'),
    ticked('say-no-politely', 15, 'hank'),
    ticked('agree-disagree-kindly', 22, 'nell'),
    ticked('keep-a-meeting-moving', 24, 'nell'),
  ].filter((c) => c.tickedOn <= addDays(PREVIEW_STARTED_ON, lastDay - 1));
  const progress = Progress.parse({
    revision: 40,
    installedOn: PREVIEW_STARTED_ON,
    dayIndex: lastDay,
    phrases: phrasesBy(lastDay),
    errorTargets: [],
    canDos,
    keepsakes: weekKeepsakes(full),
    weeks,
  });
  return {
    progress,
    calls: seasonCalls(weeks),
    startedOn: PREVIEW_STARTED_ON,
    today: addDays(PREVIEW_STARTED_ON, lastDay - 1),
  };
}

// --- After a call later in the season ---

export interface PreviewAfterCall {
  readonly call: CallRecord;
  readonly progress: Progress;
  readonly calls: readonly CallRecord[];
}

const E3_EVENTS: PhraseEvent[] = [
  { phraseId: 'sorry-we-cant', text: "Sorry, we can't…", event: 'met' },
  { phraseId: 'how-about', text: 'How about…?', event: 'met' },
  { phraseId: 'how-about', text: 'How about…?', event: 'sprouted' },
  { phraseId: 'fair-point-but', text: "That's a fair point, but…", event: 'met' },
  { phraseId: 'whats-wrong', text: "What's wrong?", event: 'bloomed' },
];

/** Right after Episode 3 on day 15: two wins, one fix, a bloom and the -ed graduating. */
export function previewEpisodeThree(): PreviewAfterCall {
  const base = previewWeek(2);
  const at = dayAt(15) + 3 * 3_600_000;
  const call = record(PREVIEW_ID, 's1-e3', 'episode', at, {
    character: 'mei',
    summary: summary({
      wins: ['You said no to Hank, kindly', 'You offered Hank another way'],
      fix: {
        from: 'Yesterday I walk to the café',
        to: 'Yesterday I walked to the café',
        targetId: 'past_ed',
        explanation: null,
      },
      phraseEvents: E3_EVENTS,
      metrics: metrics(31),
    }),
  });
  const weeks = rings(2, ['episode'], 3).map((w) =>
    w.week === 3
      ? {
          ...w,
          slots: w.slots.map((s) =>
            s.kind === 'episode' ? { ...s, callRecordId: PREVIEW_ID, doneAt: at } : s,
          ),
        }
      : w,
  );
  const targets: ErrorTargetProgress[] = [
    {
      id: 'past_ed',
      status: 'graduated',
      selfCorrections: 5,
      selfCorrectionDays: ['2026-09-12', '2026-09-16', '2026-09-21'],
      activatedAt: dayAt(2),
      graduatedAt: at - 60_000,
    },
    {
      id: 'articles',
      status: 'active',
      selfCorrections: 0,
      selfCorrectionDays: [],
      activatedAt: at - 60_000,
      graduatedAt: null,
    },
  ];
  const phrases = [
    ...phrasesBy(14).map((p) =>
      p.id === 'whats-wrong'
        ? { ...p, state: 'bloom' as const, bloomAt: at - 120_000, lastUsedAt: at - 120_000 }
        : p,
    ),
    phrase('sorry-we-cant', "Sorry, we can't…", 'seed', { seed: at - 300_000 }),
    phrase('how-about', 'How about…?', 'sprout', { seed: at - 300_000, sprout: at - 200_000 }),
    phrase('fair-point-but', "That's a fair point, but…", 'seed', { seed: at - 250_000 }),
  ];
  const progress = Progress.parse({
    ...base.progress,
    dayIndex: 15,
    phrases,
    errorTargets: targets,
    weeks,
  });
  return { call, progress, calls: [call, ...base.calls] };
}

/** Right after a Pip's minute on day 18: "How about…?" leafs, Pip's "What's wrong" fixed. */
export function previewMinute(): PreviewAfterCall {
  const base = previewEpisodeThree();
  const at = dayAt(18) + 2 * 3_600_000;
  const call = record(PREVIEW_ID, 's1-pm.2.how-about.whats-wrong', 'daily', at, {
    summary: summary({
      phraseEvents: [
        { phraseId: 'how-about', text: 'How about…?', event: 'used' },
        { phraseId: 'how-about', text: 'How about…?', event: 'leafed' },
        { phraseId: 'whats-wrong', text: "What's wrong?", event: 'used' },
      ],
    }),
  });
  const progress = Progress.parse({
    ...base.progress,
    phrases: base.progress.phrases.map((p) =>
      p.id === 'how-about'
        ? {
            ...p,
            state: 'leaf' as const,
            leafAt: at,
            lastUsedAt: at,
            usedOn: [...p.usedOn, '2026-09-24'],
          }
        : p,
    ),
  });
  return { call, progress, calls: base.calls };
}

/** Right after Episode 5's petition on day 29: Flow 48 s, against 20 s in week 1's Pass it on. */
export function previewPetition(): PreviewAfterCall {
  const base = previewWeek(4);
  const at = dayAt(29) + 3 * 3_600_000;
  const call = record(PREVIEW_ID, 's1-e5', 'episode', at, {
    character: 'bea',
    summary: summary({
      wins: ['Every passenger signed', 'You said why the café matters'],
      metrics: metrics(48),
    }),
  });
  const weeks = rings(4, ['episode'], 5).map((w) =>
    w.week === 5
      ? {
          ...w,
          slots: w.slots.map((s) =>
            s.kind === 'episode' ? { ...s, callRecordId: PREVIEW_ID, doneAt: at } : s,
          ),
        }
      : w,
  );
  const progress = Progress.parse({ ...base.progress, dayIndex: 29, weeks });
  return { call, progress, calls: [call, ...base.calls] };
}
