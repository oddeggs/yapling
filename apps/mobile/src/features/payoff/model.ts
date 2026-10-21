import type { BurrowObjectId } from '@yapling/art';
import {
  PHRASE_STATES,
  type CallRecord,
  type ErrorTargetProgress,
  type PhraseEvent,
  type PhraseProgress,
  type PhraseState,
  type Progress,
} from '@yapling/contracts';
import type { StringKey, Translate } from '@yapling/i18n';

import { receiptNumber } from './format';
import {
  earnedKeepsakes,
  ringOfCall,
  type EarnedKeepsakes,
  type KeepsakeLearner,
} from './keepsake-model';

/*
 * After the call, as data. The post-call record (two wins, one fix, phrase and can-do events,
 * fluency) and the learner's progress after the call are turned into what the screen shows. The
 * builders read no clock and no network, so every state is testable; nothing here invents a win.
 */

/** What the screen needs to know about the learner. */
export type PayoffLearner = KeepsakeLearner;

export interface AfterCallInput {
  readonly call: CallRecord;
  /** Progress after the call (it lands with the summary); null while it loads. */
  readonly progress: Pick<
    Progress,
    'phrases' | 'canDos' | 'keepsakes' | 'weeks' | 'errorTargets'
  > | null;
  readonly learner: PayoffLearner;
  /** Earlier calls, for the fluency trend (the first one with feedback is the baseline). */
  readonly earlierCalls: readonly CallRecord[];
}

/** A phrase's move in this call: from the stage before to the stage now. */
export interface PhraseTransition {
  readonly id: string;
  readonly text: string;
  /** Null when the phrase was first met in this call. */
  readonly from: PhraseState | null;
  readonly to: PhraseState;
  /** It moved up a stage (a seed sprouting, a sprout leafing, a leaf blooming). */
  readonly grew: boolean;
}

export interface PhraseTile extends PhraseTransition {
  /** "Mầm", "Gói hạt". */
  readonly stage: string;
  /** The object it was before (null for a new seed packet) and the one it is now. */
  readonly artFrom: BurrowObjectId | null;
  readonly artTo: BurrowObjectId;
}

/** The weekly ring before and after this call. */
export interface RingChange {
  readonly week: number;
  readonly before: number;
  readonly after: number;
  readonly total: number;
}

export interface ReceiptRow {
  readonly label: string;
  readonly value: string;
  /** The "up from" line, printed in green. */
  readonly trend?: boolean;
}

export interface Graduation {
  readonly targetId: string;
  readonly badge: string;
  readonly title: string;
  readonly sub: string;
  readonly next: { readonly tag: string; readonly text: string } | null;
  readonly cta: string;
}

export interface BloomCard {
  readonly id: string;
  readonly label: string;
  readonly phrase: string;
  readonly sub: string;
}

/** What follows the after-call screen, in order, before the burrow. */
export type Celebration = 'graduation' | 'keepsake';

export interface AfterCallReady {
  readonly state: 'ready';
  /** "Cuộc gọi đầu tiên", or the call's kind. */
  readonly kicker: string;
  readonly title: string;
  readonly wins: { readonly title: string; readonly items: readonly string[] } | null;
  /** Shown instead of the wins when there are none: kind, never a miss. */
  readonly quiet: { readonly title: string; readonly sub: string } | null;
  readonly fix: {
    readonly title: string;
    readonly from: string;
    readonly to: string;
    readonly a11y: string;
  } | null;
  readonly phrases: { readonly title: string; readonly tiles: readonly PhraseTile[] } | null;
  readonly blooms: readonly BloomCard[];
  readonly ring: RingChange | null;
  /** "Vòng tuần · 1/3". */
  readonly ringTag: string | null;
  readonly burrow: { readonly kind: 'box' | 'things'; readonly text: string } | null;
  readonly receipt: readonly ReceiptRow[] | null;
  readonly graduation: Graduation | null;
  readonly keepsakes: EarnedKeepsakes | null;
  readonly next: readonly Celebration[];
  readonly cta: string;
}

export type AfterCallModel =
  { readonly state: 'writing'; readonly title: string; readonly sub: string } | AfterCallReady;

const STAGE_OF_EVENT: Partial<Record<PhraseEvent['event'], PhraseState>> = {
  met: 'seed',
  sprouted: 'sprout',
  leafed: 'leaf',
  bloomed: 'bloom',
};

const rank = (s: PhraseState) => PHRASE_STATES.indexOf(s);
const below = (s: PhraseState): PhraseState | null => PHRASE_STATES[rank(s) - 1] ?? null;

/**
 * Each phrase the call touched, in the order it came up: where it was before and where it is now.
 * A phrase only used (no new stage) stays where progress has it.
 */
export function phraseTransitions(
  events: readonly PhraseEvent[],
  phrases: readonly PhraseProgress[] | null,
): PhraseTransition[] {
  const order: string[] = [];
  const byId = new Map<string, { text: string; met: boolean; stages: PhraseState[] }>();
  for (const e of events) {
    let entry = byId.get(e.phraseId);
    if (!entry) {
      entry = { text: e.text, met: false, stages: [] };
      byId.set(e.phraseId, entry);
      order.push(e.phraseId);
    }
    if (e.event === 'met') entry.met = true;
    const stage = STAGE_OF_EVENT[e.event];
    if (stage && stage !== 'seed') entry.stages.push(stage);
  }
  return order.flatMap((id): PhraseTransition[] => {
    const entry = byId.get(id);
    if (!entry) return [];
    const now = phrases?.find((p) => p.id === id)?.state ?? null;
    if (entry.stages.length > 0) {
      const sorted = [...entry.stages].sort((a, b) => rank(a) - rank(b));
      const lowest = sorted[0] ?? 'sprout';
      const highest = sorted.at(-1) ?? 'sprout';
      const from = entry.met && lowest === 'sprout' ? 'seed' : below(lowest);
      return [{ id, text: entry.text, from, to: highest, grew: true }];
    }
    if (entry.met) return [{ id, text: entry.text, from: null, to: 'seed', grew: false }];
    const stay = now ?? 'sprout';
    return [{ id, text: entry.text, from: stay, to: stay, grew: false }];
  });
}

/** The burrow object for a phrase at a stage: the seed packet, then the plant as it grows. */
export function phraseArt(stage: PhraseState): BurrowObjectId {
  switch (stage) {
    case 'seed':
      return 'seed';
    case 'sprout':
      return 'plant-0';
    case 'leaf':
      return 'plant-1';
    case 'bloom':
      return 'plant-2';
  }
}

/** The ring before and after: the call filled one slot of its week; null for an extra call. */
export function ringChange(
  weeks: Progress['weeks'] | undefined,
  callId: string,
): RingChange | null {
  if (!weeks) return null;
  const ring = ringOfCall(weeks, callId);
  if (!ring) return null;
  const after = ring.slots.filter((s) => s.status === 'done').length;
  return { week: ring.week, before: Math.max(0, after - 1), after, total: ring.slots.length };
}

/** The learner's first ring call ever: no other done slot in any week. */
export function isFirstRingCall(weeks: Progress['weeks'] | undefined, callId: string): boolean {
  if (!weeks) return false;
  const done = weeks.flatMap((w) => w.slots.filter((s) => s.status === 'done'));
  return done.length === 1 && done[0]?.callRecordId === callId;
}

/**
 * The fluency receipt, once there is an earlier call to compare with: Flow (and how far it has come
 * from the first call, only when it has grown), Pace and Pauses. Trends only, never a level.
 */
export function fluencyReceipt(
  call: CallRecord,
  earlierCalls: readonly CallRecord[],
  t: Translate,
): ReceiptRow[] | null {
  const metrics = call.summary?.metrics;
  if (!metrics) return null;
  const baseline = earlierCalls
    .filter((c) => c.id !== call.id && c.startedAt < call.startedAt && c.summary !== null)
    .sort((a, b) => a.startedAt - b.startedAt)[0]?.summary?.metrics;
  if (!baseline) return null;
  const flow = Math.round(metrics.flowSeconds);
  const from = Math.round(baseline.flowSeconds);
  const rows: ReceiptRow[] = [
    { label: t('payoff.receipt.flow'), value: t('payoff.receipt.seconds', { value: flow }) },
  ];
  if (flow > from)
    rows.push({
      label: t('payoff.receipt.upFrom'),
      value: t('payoff.receipt.seconds', { value: from }),
      trend: true,
    });
  rows.push(
    {
      label: t('payoff.receipt.pace'),
      value: t('payoff.receipt.wordsPerMinute', { value: Math.round(metrics.paceWpm) }),
    },
    {
      label: t('payoff.receipt.pauses'),
      value: t('payoff.receipt.perMinute', { value: receiptNumber(metrics.pausesPerMin) }),
    },
  );
  return rows;
}

const TARGETS = [
  'past_ed',
  'final_s',
  'articles',
  'final_consonants',
  'prepositions',
  'be_verb',
  'word_order',
] as const;
type KnownTarget = (typeof TARGETS)[number];
const isKnown = (id: string): id is KnownTarget => (TARGETS as readonly string[]).includes(id);

/** An error target that graduated during this call, and the one that took its place. */
export function graduationIn(
  call: Pick<CallRecord, 'startedAt' | 'endedAt'>,
  targets: readonly ErrorTargetProgress[],
  roommateName: string,
  t: Translate,
): Graduation | null {
  const graduated = targets.find(
    (g) =>
      g.status === 'graduated' &&
      g.graduatedAt !== null &&
      g.graduatedAt >= call.startedAt &&
      g.graduatedAt <= call.endedAt &&
      isKnown(g.id),
  );
  if (!graduated || !isKnown(graduated.id)) return null;
  const next = targets.find(
    (n) => n.status === 'active' && n.activatedAt === graduated.graduatedAt && isKnown(n.id),
  );
  return {
    targetId: graduated.id,
    badge: t(`payoff.badge.${graduated.id}`),
    title: t('payoff.graduation.title', {
      name: roommateName,
      target: t(`payoff.target.${graduated.id}`),
    }),
    sub: t('payoff.graduation.sub', {
      count: graduated.selfCorrections,
      days: graduated.selfCorrectionDays.length,
    }),
    next:
      next && isKnown(next.id)
        ? {
            tag: t('payoff.graduation.nextTag'),
            text: t('payoff.graduation.next', {
              name: roommateName,
              target: t(`payoff.target.${next.id}`),
            }),
          }
        : null,
    cta: t('payoff.graduation.cta'),
  };
}

type TitleKey =
  | 'payoff.afterCall.bloomsTitle'
  | 'payoff.afterCall.leavesTitle'
  | 'payoff.afterCall.sproutsTitle'
  | 'payoff.afterCall.seedsTitle';

function phrasesTitle(tiles: readonly PhraseTransition[]): TitleKey {
  const top = tiles
    .filter((p) => p.grew)
    .reduce<PhraseState | null>((m, p) => (m === null || rank(p.to) > rank(m) ? p.to : m), null);
  switch (top) {
    case 'bloom':
      return 'payoff.afterCall.bloomsTitle';
    case 'leaf':
      return 'payoff.afterCall.leavesTitle';
    case 'sprout':
      return 'payoff.afterCall.sproutsTitle';
    case 'seed':
    case null:
      return 'payoff.afterCall.seedsTitle';
  }
}

const STAGE_LABEL: Record<PhraseState, StringKey> = {
  seed: 'burrow.stage.seed',
  sprout: 'burrow.stage.sprout',
  leaf: 'burrow.stage.leaf',
  bloom: 'burrow.stage.bloom',
};

/** Everything the after-call screen shows, or the short "writing it down" state. */
export function buildAfterCall(input: AfterCallInput, t: Translate): AfterCallModel {
  const { call, progress, learner, earlierCalls } = input;
  const name = learner.roommateName;
  if (call.summaryPending) {
    return {
      state: 'writing',
      title: t('payoff.afterCall.writing', { name }),
      sub: t('payoff.afterCall.writingSub'),
    };
  }
  const summary = call.summary;
  const wins = summary?.wins ?? [];
  const transitions = phraseTransitions(summary?.phraseEvents ?? [], progress?.phrases ?? null);
  const tiles: PhraseTile[] = transitions.map((p) => ({
    ...p,
    stage: t(STAGE_LABEL[p.to] as 'burrow.stage.seed'),
    artFrom: p.grew && p.from !== null ? phraseArt(p.from) : null,
    artTo: phraseArt(p.to),
  }));
  const ring = ringChange(progress?.weeks, call.id);
  const sprouted = transitions.filter((p) => p.grew && p.to === 'sprout').length;
  const burrow =
    ring !== null && ring.week === 1
      ? { kind: 'box' as const, text: t('payoff.afterCall.boxUnpacked') }
      : sprouted > 0
        ? { kind: 'things' as const, text: t('payoff.afterCall.newThings', { count: sprouted }) }
        : null;
  const graduation = progress ? graduationIn(call, progress.errorTargets, name, t) : null;
  const keepsakes = progress ? earnedKeepsakes(call, progress, learner) : null;
  const next: Celebration[] = [
    ...(graduation ? (['graduation'] as const) : []),
    ...(keepsakes ? (['keepsake'] as const) : []),
  ];
  return {
    state: 'ready',
    kicker: isFirstRingCall(progress?.weeks, call.id)
      ? t('payoff.afterCall.firstCall')
      : t(`payoff.afterCall.kind.${call.kind}`),
    title: t('payoff.afterCall.done'),
    wins:
      wins.length > 0
        ? {
            title: t(
              wins.length === 1 ? 'payoff.afterCall.winTitle' : 'payoff.afterCall.winsTitle',
            ),
            items: wins,
          }
        : null,
    quiet:
      wins.length === 0
        ? { title: t('payoff.afterCall.quiet', { name }), sub: t('payoff.afterCall.quietSub') }
        : null,
    fix: summary?.fix
      ? {
          title: t('payoff.afterCall.fixTitle'),
          from: summary.fix.from,
          to: summary.fix.to,
          a11y: t('payoff.afterCall.a11yFix', { from: summary.fix.from, to: summary.fix.to }),
        }
      : null,
    phrases: tiles.length > 0 ? { title: t(phrasesTitle(tiles)), tiles } : null,
    blooms: tiles
      .filter((p) => p.grew && p.to === 'bloom')
      .map((p) => ({
        id: p.id,
        label: t('payoff.bloom.label'),
        phrase: p.text,
        sub: t('payoff.bloom.sub'),
      })),
    ring,
    ringTag: ring ? t('payoff.afterCall.ring', { done: ring.after, total: ring.total }) : null,
    burrow,
    receipt: fluencyReceipt(call, earlierCalls, t),
    graduation,
    keepsakes,
    next,
    cta: next.length > 0 ? t('common.continue') : t('payoff.afterCall.cta'),
  };
}
