import type { BurrowObjectId } from '@yapling/art';
import {
  PHRASE_STATES,
  type CallRecord,
  type FirstLanguage,
  type PhraseState,
  type Progress,
} from '@yapling/contracts';
import type { Translate } from '@yapling/i18n';
import { findPhrase, glossFor, parsePipsMinuteSceneId } from '@yapling/story';

import { phraseArt, phraseTransitions, type PayoffLearner } from './model';

/*
 * Pip's minute, after the call, as data: a small card with the phrase Pip set up and the one Pip
 * said slightly wrong, each with its new state. The phrases come from the scene id (it names the
 * minute's choice), what happened to them from the call's phrase events. No wins, no fix, no count
 * of tries: a phrase not said this time simply waits for another day.
 */

export interface MinuteRow {
  readonly id: string;
  /** The phrase Pip set up (`due`), or the one Pip said slightly wrong for the learner to fix. */
  readonly role: 'due' | 'reuse';
  readonly phrase: string;
  /** Its meaning in the learner's language, when the story has one. */
  readonly gloss: string | null;
  /** "Giờ đã thành mầm", "Bạn đã sửa câu của Pip". */
  readonly line: string;
  readonly grew: boolean;
  readonly artFrom: BurrowObjectId | null;
  readonly artTo: BurrowObjectId;
  readonly a11y: string;
}

export interface MinuteCard {
  readonly state: 'minute';
  /** "Một phút với Pip". */
  readonly kicker: string;
  readonly title: string;
  /** "Đã vào sổ tay của Pip", over the rows. */
  readonly notebook: string;
  readonly rows: readonly MinuteRow[];
  /** Shown instead of rows when the minute wrote nothing: kind, never a miss. */
  readonly quiet: { readonly title: string; readonly sub: string } | null;
  readonly cta: string;
}

export interface MinuteInput {
  readonly call: CallRecord;
  readonly progress: Pick<Progress, 'phrases'> | null;
  readonly learner: PayoffLearner;
  readonly firstLanguage: FirstLanguage;
}

const NOW_KEYS = {
  seed: 'payoff.minute.now.seed',
  sprout: 'payoff.minute.now.sprout',
  leaf: 'payoff.minute.now.leaf',
  bloom: 'payoff.minute.now.bloom',
} as const satisfies Record<PhraseState, string>;

/** Pip's minute is a `daily` call. */
export const isMinuteCall = (call: Pick<CallRecord, 'kind'>): boolean => call.kind === 'daily';

/** The small card after Pip's minute. */
export function buildMinuteCard(input: MinuteInput, t: Translate): MinuteCard {
  const { call, progress, learner, firstLanguage } = input;
  const name = learner.roommateName;
  const spec = parsePipsMinuteSceneId(call.sceneId);
  const events = call.summary?.phraseEvents ?? [];
  const transitions = phraseTransitions(events, progress?.phrases ?? null);
  const order = spec
    ? [
        { id: spec.due, role: 'due' as const },
        ...(spec.reuse ? [{ id: spec.reuse, role: 'reuse' as const }] : []),
      ]
    : transitions.map((p) => ({ id: p.id, role: 'due' as const }));
  const rows = order.flatMap(({ id, role }): MinuteRow[] => {
    const moved = transitions.find((p) => p.id === id);
    const known = progress?.phrases.find((p) => p.id === id);
    const story = findPhrase(id);
    const phrase = story?.en ?? moved?.text ?? known?.text;
    // Pip's fix turn that wasn't fixed this time isn't worth a row: Pip simply tries another day.
    if (phrase === undefined || (role === 'reuse' && !moved)) return [];
    const state: PhraseState = moved?.to ?? known?.state ?? 'seed';
    const grew = moved?.grew ?? false;
    const line = !moved
      ? t('payoff.minute.later', { name })
      : role === 'reuse'
        ? t('payoff.minute.fixed', { name })
        : grew || moved.from === null
          ? t(NOW_KEYS[state])
          : t('payoff.minute.again');
    const gloss = story ? glossFor(story.glosses, firstLanguage) : null;
    return [
      {
        id,
        role,
        phrase,
        gloss,
        line,
        grew,
        artFrom: grew && moved?.from ? phraseArt(moved.from) : null,
        artTo: phraseArt(PHRASE_STATES.includes(state) ? state : 'seed'),
        a11y: [phrase, gloss, line].filter(Boolean).join('. '),
      },
    ];
  });
  const wrote = rows.some((r) => r.line !== t('payoff.minute.later', { name }));
  return {
    state: 'minute',
    kicker: t('payoff.afterCall.kind.daily'),
    title: t('payoff.afterCall.done'),
    notebook: t('payoff.minute.title', { name }),
    rows,
    quiet:
      rows.length === 0 || !wrote
        ? { title: t('payoff.afterCall.quiet', { name }), sub: t('payoff.afterCall.quietSub') }
        : null,
    cta: t('payoff.afterCall.cta'),
  };
}
