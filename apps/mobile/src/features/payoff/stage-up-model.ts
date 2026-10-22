import {
  RESIDENCY_STAGES,
  type CallRecord,
  type FirstLanguage,
  type LocalDate,
  type Stage,
  type StageRequest,
  type WeekRing,
} from '@yapling/contracts';
import { newcomerCardAtRing, type TurnPass } from '@yapling/domain';
import { translator, type Translate } from '@yapling/i18n';

import { filledRing } from './keepsake-model';

/*
 * Linh's Newcomer card, as data. At the end of a week's ring a Visitor whose turns that week
 * passed on their own often enough (`earnsNewcomerCard`) is handed the card instead of the week's
 * keepsake: "Nhận thẻ" takes it, "Ở lại thêm" stays a Visitor, and Linh offers again at the end
 * of the next ring. Either way the choice goes to the server as a `StageRequest`.
 */

export interface StageUpInput {
  readonly call: Pick<CallRecord, 'id'>;
  /** The learner's stage now (a choice still waiting for the server counts). */
  readonly stage: Stage;
  readonly weeks: readonly WeekRing[];
  /** How each of the ring week's learner turns passed; null when the phone doesn't know. */
  readonly weekTurns: readonly TurnPass[] | null;
  /** Weeks whose card the learner already answered (took it, or stayed). */
  readonly answeredWeeks: readonly number[];
}

/**
 * Linh offers the card when this call filled a ring, any week's, and that week's turns meet the
 * rule (the learning model's `newcomerCardAtRing`); null otherwise, and while the phone can't tell
 * how the week's turns passed.
 */
export function stageUpOffer(input: StageUpInput): { readonly week: number } | null {
  const ring = filledRing(input.weeks, input.call.id);
  if (ring === null || input.weekTurns === null) return null;
  return newcomerCardAtRing({
    stage: input.stage,
    fullRingWeek: ring.week,
    ringTurns: input.weekTurns,
    answeredWeeks: input.answeredWeeks,
  });
}

/** The two answers, as the server takes them. */
export const STAGE_UP_REQUESTS = {
  take: { to: 'newcomer', reason: 'stage_up' },
  stay: { to: 'visitor', reason: 'stay' },
} as const satisfies Record<string, StageRequest>;

/** Where the moment is: Linh offering the card, the card taken and stamped, or staying. */
export type StageUpPhase = 'offer' | 'taken' | 'stay';

export interface ResidencyCardView {
  /** "THẺ CƯ TRÚ NATTERWICK". */
  readonly top: string;
  /** "Newcomer", large, always English. */
  readonly stageName: string;
  /** "Người mới", in the chrome's language; null when it's the same as the English. */
  readonly stageLocal: string | null;
  /** "Chặng 1/5"; null for a Visitor, whose card counts no stages. */
  readonly chip: string | null;
  readonly fill: 'accent' | 'secondarySoft';
  /** The round stamp once the card is taken: "NEWCOMER / NW / SEP 28". */
  readonly stamp: { readonly stage: string; readonly town: string; readonly date: string } | null;
  readonly a11y: string;
}

export interface StageUpView {
  readonly phase: StageUpPhase;
  /** Linh's words, in English, and their meaning in the learner's language (null in English). */
  readonly line: string;
  readonly gloss: string | null;
  readonly card: ResidencyCardView;
  readonly note: string;
  /** "Ở lại thêm" and "Nhận thẻ" while she offers; one button after. */
  readonly choice: { readonly stay: string; readonly take: string } | null;
  readonly cta: string | null;
  /** Evening light once the learner stays (Linh says see you tomorrow). */
  readonly evening: boolean;
}

const LINE_KEYS = {
  offer: 'payoff.stageUp.lineOffer',
  taken: 'payoff.stageUp.lineTaken',
  stay: 'payoff.stageUp.lineStay',
} as const;

const NOTE_KEYS = {
  offer: 'payoff.stageUp.noteOffer',
  taken: 'payoff.stageUp.noteTaken',
  stay: 'payoff.stageUp.noteStay',
} as const;

export interface StageUpCopyInput {
  readonly phase: StageUpPhase;
  readonly learnerName: string;
  readonly firstLanguage: FirstLanguage;
  /** The learner's local day, for the stamp. */
  readonly today: LocalDate;
  /** The local hour: after five the stay ends with "Chúc ngủ ngon". */
  readonly hour: number;
  /** The week whose ring Linh comes at the end of: from week 2 her note says another week. */
  readonly week?: number;
}

/** Everything the stage-up screen shows in a phase, in the chrome's language `t`. */
export function stageUpView(input: StageUpCopyInput, t: Translate): StageUpView {
  const en = translator('en');
  const { phase } = input;
  const local = input.firstLanguage === 'vi' ? translator('vi') : null;
  const line = en(LINE_KEYS[phase]);
  const gloss = local ? local(LINE_KEYS[phase]) : null;
  const newcomer = phase !== 'stay';
  const stageKey = newcomer ? 'me.stage.newcomer' : 'me.stage.visitor';
  const stageName = en(stageKey);
  const stageLocal = t(stageKey) === stageName ? null : t(stageKey);
  const [, month = '1', day = '1'] = input.today.split('-');
  const monthKey = `common.monthShort.${Number(month)}` as 'common.monthShort.1';
  const evening = input.hour >= 17 || input.hour < 5;
  return {
    phase,
    line,
    gloss,
    card: {
      top: t('onboarding.card.top'),
      stageName,
      stageLocal,
      chip: newcomer
        ? t('onboarding.card.stage', {
            stage: RESIDENCY_STAGES.indexOf('newcomer') + 1,
            stages: RESIDENCY_STAGES.length,
          })
        : null,
      fill: newcomer ? 'accent' : 'secondarySoft',
      stamp:
        phase === 'taken'
          ? {
              stage: stageName.toUpperCase(),
              town: t('onboarding.card.stampTown'),
              date: `${en(monthKey).toUpperCase()} ${Number(day)}`,
            }
          : null,
      a11y: t('payoff.stageUp.a11yCard', {
        name: input.learnerName,
        stage: stageLocal ? `${stageName}, ${stageLocal}` : stageName,
      }),
    },
    note:
      phase === 'offer' && (input.week ?? 1) > 1
        ? t('payoff.stageUp.noteOfferLater')
        : t(NOTE_KEYS[phase]),
    choice:
      phase === 'offer' ? { stay: t('payoff.stageUp.stay'), take: t('payoff.stageUp.take') } : null,
    cta:
      phase === 'taken'
        ? t('payoff.keepsake.cta')
        : phase === 'stay'
          ? evening
            ? t('payoff.stageUp.goodnight')
            : t('payoff.afterCall.cta')
          : null,
    evening: phase === 'stay' && evening,
  };
}
