import {
  RESIDENCY_STAGES,
  type CallRecord,
  type EpochMs,
  type Stage,
  type TimeZone,
} from '@yapling/contracts';
import { PLACEMENT_CAN_DOS, VISITOR_CARD_CAN_DOS, localDateOf } from '@yapling/domain';
import type { StringKey, Translate } from '@yapling/i18n';

import type { VisitorCardView, VisitorConfirmView } from './visitor-card-screen';

/*
 * The residency card after the placement call: the stage, the day's stamp, three things the
 * learner already does well and the first two can-dos. The strengths are the call summary's wins;
 * a summary with fewer than three is filled with the kind, general strengths Pip says to every
 * newcomer after unpacking (never invented specifics). While the summary is being written the
 * card shows Pip writing it down.
 */

/** The placement call's summary, as the card needs it. */
export type PlacementSummary =
  | { readonly kind: 'pending' }
  | { readonly kind: 'ready'; readonly wins: readonly string[] }
  /** No summary will come (no call, a call too short for one, or the wait ran out). */
  | { readonly kind: 'none' };

/**
 * The summary from the call's record. `waitedOut` turns a summary still pending (or a record not
 * read yet) into none, so the card never waits forever.
 */
export function placementSummaryOf(
  call: CallRecord | null,
  hasCall: boolean,
  waitedOut: boolean,
): PlacementSummary {
  if (!hasCall) return { kind: 'none' };
  if (call?.summary) return { kind: 'ready', wins: call.summary.wins };
  if (call !== null && !call.summaryPending) return { kind: 'none' };
  return waitedOut ? { kind: 'none' } : { kind: 'pending' };
}

/** The general strengths, in the order Pip says them after unpacking. */
const GENERAL_STRENGTHS = [
  'onboarding.card.strength.keepGoing',
  'onboarding.card.strength.askBack',
  'onboarding.card.strength.goodAtUnpacking',
] as const satisfies readonly StringKey[];

export const STRENGTH_COUNT = 3;

export interface Strength {
  readonly key: string;
  readonly text: string;
  /** From the call (the learner's own win) or one of the general ones. */
  readonly fromCall: boolean;
}

/**
 * Three strengths: the call's wins first, then general ones to fill. The last general ones are
 * used first, so a single gap is filled with the lightest ("very good at unpacking").
 */
export function strengthsOf(wins: readonly string[], t: Translate): readonly Strength[] {
  const own = wins
    .map((w) => w.trim())
    .filter((w) => w !== '')
    .slice(0, STRENGTH_COUNT)
    .map((text, i) => ({ key: `win-${i}`, text, fromCall: true }));
  const missing = STRENGTH_COUNT - own.length;
  const general = (
    missing > 0 ? GENERAL_STRENGTHS.slice(GENERAL_STRENGTHS.length - missing) : []
  ).map((key) => ({ key, text: t(key), fromCall: false }));
  return [...own, ...general];
}

export interface ResidencyView {
  /** The stage's English name, large ("Newcomer"). */
  readonly stageName: string;
  /** The stage in the chrome's language ("Người mới"). */
  readonly stageLocal: string;
  /** "Chặng 1/5". */
  readonly stageLine: string;
  /** The stamp: "NW" over "SEP 21". */
  readonly stampTown: string;
  readonly stampDate: string;
  /** Null while the summary is being written. */
  readonly strengths: readonly Strength[] | null;
  readonly aims: readonly { readonly id: string; readonly text: string }[];
}

export interface ResidencyInputs {
  readonly summary: PlacementSummary;
  readonly stage: Stage;
  readonly now: EpochMs;
  readonly timezone: TimeZone;
  /** The chrome's translator, and English's for the stage name and the stamp. */
  readonly t: Translate;
  readonly tEn: Translate;
}

type StageKey = Extract<StringKey, `me.stage.${string}`>;
type MonthKey = Extract<StringKey, `common.monthShort.${string}`>;
type CanDoKey = Extract<StringKey, `cando.${string}`>;

/** The stamp's day in English capitals: "SEP 21". */
export function stampDateOf(now: EpochMs, timezone: TimeZone, tEn: Translate): string {
  const [, month = '1', day = '1'] = localDateOf(now, timezone).split('-');
  const monthName = tEn(`common.monthShort.${Number(month)}` as MonthKey);
  return `${monthName.toUpperCase()} ${Number(day)}`;
}

export function residencyView(i: ResidencyInputs): ResidencyView {
  // A Visitor has a card of its own (`visitorCardView`); "Chặng N/5" counts from Newcomer.
  const stage = i.stage === 'visitor' ? 'newcomer' : i.stage;
  const stageKey = `me.stage.${stage}` as StageKey;
  return {
    stageName: i.tEn(stageKey),
    stageLocal: i.t(stageKey),
    stageLine: i.t('onboarding.card.stage', {
      stage: RESIDENCY_STAGES.indexOf(stage) + 1,
      stages: RESIDENCY_STAGES.length,
    }),
    stampTown: i.t('onboarding.card.stampTown'),
    stampDate: stampDateOf(i.now, i.timezone, i.tEn),
    strengths: i.summary.kind === 'pending' ? null : strengthsOf(summaryWins(i.summary), i.t),
    aims: PLACEMENT_CAN_DOS.map((c) => ({ id: c.id, text: i.t(c.titleKey as CanDoKey) })),
  };
}

const summaryWins = (s: PlacementSummary): readonly string[] => (s.kind === 'ready' ? s.wins : []);

// --- The Visitor's card ---

/** The two first can-dos the Visitor's card shows, by their domain ids. */
const VISITOR_AIM_KEYS: Readonly<
  Record<string, Extract<StringKey, `onboarding.visitor.aim.${string}`>>
> = {
  'say-hello-and-your-name': 'onboarding.visitor.aim.hello',
  'ask-again-or-slower': 'onboarding.visitor.aim.again',
};

export interface VisitorCardInputs {
  readonly learnerName: string;
  readonly now: EpochMs;
  readonly timezone: TimeZone;
  /** The chrome's translator and English's (the stage name, the stamp, the can-dos). */
  readonly t: Translate;
  readonly tEn: Translate;
  /** The learner's language's, for the meanings under English lines; null when none is written. */
  readonly tGloss: Translate | null;
}

/** The Visitor's residency card: the stage without a number, Linh's promise, two can-dos. */
export function visitorCardView(i: VisitorCardInputs): VisitorCardView {
  return {
    top: i.t('onboarding.card.top'),
    learnerName: i.learnerName,
    stageName: i.tEn('onboarding.visitor.stage'),
    stageSub: i.t('onboarding.visitor.stageSub'),
    welcome: i.t('onboarding.visitor.welcome'),
    stamp: [
      i.tEn('onboarding.visitor.stage').toUpperCase(),
      i.t('onboarding.visitor.stamp'),
      stampDateOf(i.now, i.timezone, i.tEn),
    ],
    aimsTitle: i.t('onboarding.visitor.aimsTitle'),
    aims: VISITOR_CARD_CAN_DOS.flatMap((c) => {
      const key = VISITOR_AIM_KEYS[c.id];
      return key === undefined
        ? []
        : [{ id: c.id, text: i.tEn(key), gloss: i.tGloss ? i.tGloss(key) : null }];
    }),
    chip: i.t('onboarding.visitor.chip'),
    how: i.t('onboarding.visitor.how'),
    start: i.t('onboarding.visitor.start'),
    skip: i.t('onboarding.visitor.skip'),
  };
}

/** "Go straight to the story?", its body cut where the call's two pills go in bold. */
export function visitorConfirmView(t: Translate): VisitorConfirmView {
  const again = t('onboarding.visitor.confirm.again');
  const slower = t('onboarding.visitor.confirm.slower');
  // The placeholders are kept, to cut the text where the pills go.
  const template = t('onboarding.visitor.confirm.body', { again: '{again}', slower: '{slower}' });
  const body = template
    .split(/(\{again\}|\{slower\})/)
    .filter((part) => part !== '')
    .map((part) =>
      part === '{again}'
        ? { text: again, bold: true }
        : part === '{slower}'
          ? { text: slower, bold: true }
          : { text: part, bold: false },
    );
  return {
    title: t('onboarding.visitor.confirm.title'),
    body,
    linh: t('onboarding.visitor.confirm.linh'),
    go: t('onboarding.visitor.confirm.go'),
    stay: t('onboarding.visitor.confirm.stay'),
  };
}
