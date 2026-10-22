import type { CallRecord } from '@yapling/contracts';
import type { Translate } from '@yapling/i18n';
import { EPISODES, findScene } from '@yapling/story';

/*
 * Then and now, as data: Flow in week 1's Pass it on next to a later pitch. Episode 5's petition is
 * the same task as week 1's practice by design, so the card follows its call; at the season's end
 * it compares week 1 with the latest of the season's last pitches. Only a Flow that grew is shown:
 * a number that didn't is simply not a card. Read from the call records, nothing else.
 */

/** Week 1's Pass it on with Bea. */
export const THEN_SCENE = 's1-e1-practice';
/** Episode 5: the petition on Bus 45. */
export const PETITION_SCENE = 's1-e5';
/** The season's last pitches, any of which can stand for "now" at the season's end. */
export const SEASON_END_SCENES: readonly string[] = ['s1-e5', 's1-e5-practice', 's1-e6'];

export type ThenAndNowMoment = 'petition' | 'season';

const flowOf = (call: CallRecord): number | null => {
  const flow = call.summary?.metrics.flowSeconds;
  return flow === undefined || !Number.isFinite(flow) || flow <= 0 ? null : Math.round(flow);
};

const byStart = (a: CallRecord, b: CallRecord) => a.startedAt - b.startedAt;

/** The week a scene belongs to: its episode's number; null for a scene outside the season. */
export function weekOfScene(sceneId: string): number | null {
  return EPISODES.find((e) => e.scenes.some((s) => s.id === sceneId))?.number ?? null;
}

export interface ThenAndNowCalls {
  readonly then: CallRecord;
  readonly now: CallRecord;
}

/**
 * The two calls to compare: week 1's first Pass it on with Flow, and the petition (the call just
 * finished, when it is one, else the latest) or, at the season's end, the latest of the season's
 * last pitches whose Flow grew. Null when either is missing or Flow didn't grow.
 */
export function thenAndNowCalls(
  calls: readonly CallRecord[],
  moment: ThenAndNowMoment,
  current: CallRecord | null = null,
): ThenAndNowCalls | null {
  const all =
    current === null ? [...calls] : [current, ...calls.filter((c) => c.id !== current.id)];
  const then = all.filter((c) => c.sceneId === THEN_SCENE && flowOf(c) !== null).sort(byStart)[0];
  if (!then) return null;
  const from = flowOf(then) ?? 0;
  const grew = (c: CallRecord) => (flowOf(c) ?? 0) > from && c.startedAt > then.startedAt;
  if (moment === 'petition') {
    const now =
      current?.sceneId === PETITION_SCENE
        ? current
        : all
            .filter((c) => c.sceneId === PETITION_SCENE && flowOf(c) !== null)
            .sort(byStart)
            .at(-1);
    return now && grew(now) ? { then, now } : null;
  }
  const now = all
    .filter((c) => SEASON_END_SCENES.includes(c.sceneId) && grew(c))
    .sort(byStart)
    .at(-1);
  return now ? { then, now } : null;
}

export interface ThenAndNowSide {
  /** "TUẦN 1". */
  readonly week: string;
  /** The scene's title ("Pass it on", "The Petition"). */
  readonly title: string;
  /** "20s". */
  readonly value: string;
}

export interface ThenAndNow {
  readonly kicker: string;
  readonly title: string;
  readonly then: ThenAndNowSide;
  readonly now: ThenAndNowSide;
  /** Under each number: "nói liền". */
  readonly unit: string;
  /** "Nói liền 48 giây không dừng. Tuần 1 là 20 giây." */
  readonly line: string;
  readonly a11y: string;
}

/** The then-and-now card's copy for the two calls. */
export function thenAndNowView(calls: ThenAndNowCalls, t: Translate): ThenAndNow {
  const thenFlow = flowOf(calls.then) ?? 0;
  const nowFlow = flowOf(calls.now) ?? 0;
  const thenWeek = weekOfScene(calls.then.sceneId) ?? 1;
  const nowWeek = weekOfScene(calls.now.sceneId) ?? thenWeek;
  const side = (call: CallRecord, week: number, flow: number): ThenAndNowSide => ({
    week: t('payoff.keepsake.week', { week }),
    title: findScene(call.sceneId)?.title ?? '',
    value: t('payoff.receipt.seconds', { value: flow }),
  });
  return {
    kicker: t('payoff.thenNow.kicker'),
    title: t('payoff.thenNow.title'),
    then: side(calls.then, thenWeek, thenFlow),
    now: side(calls.now, nowWeek, nowFlow),
    unit: t('payoff.thenNow.flow'),
    line: t('payoff.thenNow.line', { now: nowFlow, then: thenFlow }),
    a11y: t('payoff.thenNow.a11y', {
      then: thenWeek,
      thenSeconds: thenFlow,
      now: nowWeek,
      nowSeconds: nowFlow,
    }),
  };
}

/** The card for a moment, or null when there is nothing that grew to show. */
export function thenAndNow(
  calls: readonly CallRecord[],
  moment: ThenAndNowMoment,
  t: Translate,
  current: CallRecord | null = null,
): ThenAndNow | null {
  const pair = thenAndNowCalls(calls, moment, current);
  return pair ? thenAndNowView(pair, t) : null;
}
