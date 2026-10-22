import {
  PHRASE_STATES,
  type CharacterId,
  type LocalDate,
  type PhraseProgress,
  type PhraseState,
  type Progress,
  type TimeZone,
} from '@yapling/contracts';
import {
  addDays,
  canDoById,
  fullRingCount,
  isRingFull,
  localDateOf,
  nextEpisodeWeek,
  ringOpensOnDayOfWeek,
  type SeasonWeeks,
} from '@yapling/domain';
import { translator, type StringKey, type Translate } from '@yapling/i18n';
import { SEASON_1, seasonWeeks } from '@yapling/story';

import { characterName, handDate } from './format';
import type { Certificate, KeepsakeLearner } from './keepsake-model';
import { episodeKicker, phraseTile, type PhraseTile, type RingChange } from './model';

/*
 * The week's wrap, as data: on the last day of a week, the ring as it stands, the phrases that grew
 * that week, the can-dos ticked, and when the next episode opens. And at the season's end, the
 * season keepsake. Read from progress and the story week's dates; nothing here reads a clock, and
 * nothing counts what wasn't done (a ring not full says the rest will wait).
 */

/** The season's weeks, week 1 first, as the learning model reads them. */
export const SEASON: SeasonWeeks = seasonWeeks(SEASON_1);

/** How many phrase tiles the wrap shows (two rows of four). */
export const WRAP_TILES_MAX = 8;

export interface WrapInput {
  readonly week: number;
  readonly progress: Pick<Progress, 'phrases' | 'canDos' | 'weeks'>;
  /** Story day 1 (the letter's day, or the install day before it is recorded). */
  readonly startedOn: LocalDate;
  readonly timezone: TimeZone;
  /** The learner's local day, to tell an episode already open from one still to come. */
  readonly today: LocalDate;
}

export interface WeekWrap {
  readonly week: number;
  /** "Tập 4 · The Plan", or "Tuần Cờ Dây". */
  readonly kicker: string;
  readonly title: string;
  readonly ring: RingChange & { readonly full: boolean };
  /** "Vòng tuần đã đầy…", or how many calls this week and that the rest will wait. */
  readonly ringLine: string;
  /** "Đã đầy 4 vòng tuần", once at least one ring is full. */
  readonly rings: string | null;
  readonly phrases: { readonly title: string; readonly tiles: readonly PhraseTile[] } | null;
  readonly canDos: {
    readonly title: string;
    readonly items: readonly { readonly id: string; readonly title: string }[];
  } | null;
  /** Shown when nothing grew and no can-do was ticked: kind, never a miss. */
  readonly quiet: string | null;
  readonly next: { readonly tag: string; readonly text: string } | null;
  /** Every episode of the season is played: the season's end follows the wrap. */
  readonly seasonDone: boolean;
  readonly cta: string;
}

/** The first and last day of a story week. */
export function weekDates(startedOn: LocalDate, week: number): { from: LocalDate; to: LocalDate } {
  const from = addDays(startedOn, (week - 1) * 7);
  return { from, to: addDays(from, 6) };
}

const WEEKDAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;

/** A local day's weekday name ("Thứ Hai"). */
export function weekdayOf(date: LocalDate, t: Translate): string {
  const day = WEEKDAYS[new Date(`${date}T00:00:00Z`).getUTCDay()] ?? 'mon';
  return t(`common.weekday.${day}`);
}

const STAGE_AT: Record<Exclude<PhraseState, 'seed'>, keyof PhraseProgress> = {
  sprout: 'sproutAt',
  leaf: 'leafAt',
  bloom: 'bloomAt',
};

/**
 * The phrases that grew within the dates, in the order they last grew: from the state before the
 * first step that week to the highest reached that week.
 */
export function phrasesGrown(
  phrases: readonly PhraseProgress[],
  dates: { from: LocalDate; to: LocalDate },
  timezone: TimeZone,
) {
  const inWeek = (at: unknown) => {
    if (typeof at !== 'number') return false;
    const day = localDateOf(at, timezone);
    return day >= dates.from && day <= dates.to;
  };
  return phrases
    .flatMap((p) => {
      const reached = PHRASE_STATES.filter(
        (s): s is Exclude<PhraseState, 'seed'> => s !== 'seed' && inWeek(p[STAGE_AT[s]]),
      );
      const lowest = reached[0];
      const highest = reached.at(-1);
      if (lowest === undefined || highest === undefined) return [];
      const from = PHRASE_STATES[PHRASE_STATES.indexOf(lowest) - 1] ?? 'seed';
      const at = p[STAGE_AT[highest]] as number;
      return [{ id: p.id, text: p.text, from, to: highest, grew: true, at }];
    })
    .sort((a, b) => a.at - b.at)
    .map(({ at: _at, ...rest }) => rest);
}

/** What comes next, after this week: the next episode's day, or Bunting Week's. */
function nextOf(input: WrapInput, t: Translate): WeekWrap['next'] {
  const tag = t('payoff.graduation.nextTag');
  const waiting = nextEpisodeWeek(SEASON, input.progress.weeks);
  const dayOfWeek = (week: number) =>
    addDays(
      weekDates(input.startedOn, week).from,
      ringOpensOnDayOfWeek(SEASON[week - 1], week, 'episode') - 1,
    );
  if (waiting !== null) {
    const opens = dayOfWeek(waiting);
    const number = SEASON_1.episodes[waiting - 1]?.number ?? waiting;
    return {
      tag,
      text:
        opens <= input.today
          ? t('payoff.wrap.nextWaiting', { number })
          : t('payoff.wrap.next', { number, day: weekdayOf(opens, t) }),
    };
  }
  const festival = SEASON_1.festival?.number ?? null;
  if (festival === null || input.week >= festival) return null;
  const opens = weekDates(input.startedOn, festival).from;
  return opens <= input.today
    ? null
    : { tag, text: t('payoff.wrap.nextFestival', { day: weekdayOf(opens, t) }) };
}

/** Everything the week's wrap shows. */
export function weekWrap(input: WrapInput, t: Translate): WeekWrap {
  const { week, progress } = input;
  const ring = progress.weeks[week - 1];
  const done = ring?.slots.filter((s) => s.status === 'done').length ?? 0;
  const total = ring?.slots.length ?? 3;
  const full = ring ? isRingFull(ring) : false;
  const dates = weekDates(input.startedOn, week);
  const tiles = phrasesGrown(progress.phrases, dates, input.timezone)
    .slice(-WRAP_TILES_MAX)
    .map((p) => phraseTile(p, t));
  const canDos = progress.canDos
    .filter((c) => c.status === 'ticked' && c.tickedOn !== null)
    .filter((c) => (c.tickedOn ?? '') >= dates.from && (c.tickedOn ?? '') <= dates.to)
    .flatMap((c) => {
      const definition = canDoById(c.id);
      return definition
        ? [{ id: c.id, title: t(definition.titleKey as StringKey as 'cando.ask-whats-wrong') }]
        : [];
    });
  const episode = SEASON_1.episodes[week - 1];
  const count = fullRingCount(progress.weeks);
  const seasonDone = nextEpisodeWeek(SEASON, progress.weeks) === null;
  return {
    week,
    kicker:
      (episode ? episodeKicker(episode.id, t) : null) ??
      (week === SEASON_1.festival?.number ? t('payoff.wrap.festival') : ''),
    title: t('payoff.wrap.title', { week }),
    ring: { week, before: done, after: done, total, full },
    ringLine: full
      ? t('payoff.wrap.ringFull')
      : done === 0
        ? t('payoff.wrap.ringNone')
        : t('payoff.wrap.ringPart', { count: done }),
    rings: count > 0 ? t('payoff.wrap.rings', { count }) : null,
    phrases: tiles.length > 0 ? { title: t('payoff.wrap.phrases'), tiles } : null,
    canDos: canDos.length > 0 ? { title: t('payoff.wrap.canDos'), items: canDos } : null,
    quiet: tiles.length === 0 && canDos.length === 0 ? t('payoff.wrap.quiet') : null,
    next: nextOf(input, t),
    seasonDone,
    cta: seasonDone ? t('common.continue') : t('payoff.afterCall.cta'),
  };
}

// --- The season's end ---

/** Who signs the season keepsake: Mei, whose café the season saved. */
export const SEASON_WITNESS: CharacterId = 'mei';

/**
 * The day the season ended: when its last episode's slot was done. Null while any episode of the
 * season is still to play.
 */
export function seasonEndedOn(weeks: Progress['weeks'], timezone: TimeZone): LocalDate | null {
  if (nextEpisodeWeek(SEASON, weeks) !== null) return null;
  const last = SEASON_1.episodes.length;
  const slot = weeks[last - 1]?.slots.find((s) => s.kind === 'episode');
  return slot?.doneAt != null ? localDateOf(slot.doneAt, timezone) : null;
}

export interface SeasonKeepsake {
  readonly certificate: Certificate;
  /** "MÙA MỘT". */
  readonly tag: string;
  readonly title: string;
  /** "SEASON ONE", the stamp on the frame. */
  readonly stamp: string;
  readonly roommateSays: string;
  readonly cta: string;
  readonly hungToast: string;
}

/** The season keepsake, the café's little sign in the roommate's hand; null before the end. */
export function seasonKeepsake(
  weeks: Progress['weeks'],
  learner: KeepsakeLearner,
  timezone: TimeZone,
  t: Translate,
): SeasonKeepsake | null {
  const endedOn = seasonEndedOn(weeks, timezone);
  if (endedOn === null) return null;
  const en = translator('en');
  const witnessName = characterName(SEASON_WITNESS, learner.roommateName);
  return {
    certificate: {
      id: `season-${SEASON_1.number}`,
      heading: en('payoff.season.heading', { learner: learner.name }),
      canDo: en('payoff.season.canDo'),
      witnessed: en('payoff.season.signed', { witness: witnessName, date: handDate(endedOn) }),
      witness: SEASON_WITNESS,
      witnessName,
      earnedOn: endedOn,
      track: null,
    },
    tag: t('payoff.season.tag'),
    title: t('payoff.season.title'),
    stamp: en('payoff.season.stamp'),
    roommateSays: t('payoff.season.roommateSays'),
    cta: t('payoff.keepsake.cta'),
    hungToast: t('payoff.keepsake.hung'),
  };
}
