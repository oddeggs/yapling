import type { BurrowObjectId } from '@yapling/art';
import type {
  FirstLanguage,
  PhraseState,
  RingSlotKind,
  RingSlotStatus,
  Roommate,
} from '@yapling/contracts';
import { addDays, dateOfDay, firstDayOfWeek, slotOpensOnDay } from '@yapling/domain';
import { findPhrase, findScene, glossFor, SEASON_1, type Episode } from '@yapling/story';
import type { Language, Translate } from '@yapling/i18n';
import { colours, palette } from '@yapling/theme';
import type { Href } from 'expo-router';

import { copy, text, type Copy } from '../burrow/copy';
import {
  currentRing,
  LATER_WEEKS_FROM_DAY,
  storyWeekOfInput,
  type BurrowProgress,
  type FaceSpec,
} from '../burrow/model';
import {
  episodeOfScene,
  guestOf,
  isReplay,
  ringSceneFor,
  SEASON_WEEKS,
} from '../burrow/ring-scenes';
import { callRoute } from '../burrow/routes';

/*
 * The week view as data: the week's dates, its three calls (the episode, the real week and the
 * practice call) with who is in each, when it opens and whether it is done, and the week's
 * phrases as the objects they have grown into. A call whose day has passed stays open: nothing
 * in the week ever expires.
 */

export interface WeekInput {
  /** The story's day: week 1's day 1 is the day the story started. */
  readonly day: number;
  /** Week 1's day 1: the story's start (the letter's day), not the install day. */
  readonly startedOn: string;
  readonly roommate: Roommate;
  readonly firstLanguage: FirstLanguage;
  readonly progress: BurrowProgress;
}

export interface WeekRow {
  /** Stable per row (the slot's kind, or the waiting call's week and kind). */
  readonly key: string;
  readonly kind: RingSlotKind;
  /** A call still waiting from an earlier week: that week; null for this week's calls. */
  readonly fromWeek: number | null;
  readonly tag: Copy;
  readonly title: Copy;
  /** "Hôm nay", or the weekday it opens. */
  readonly when: Copy;
  readonly face: FaceSpec;
  /** Behind the face: the episode's apricot, Pip's lilac, Bea's sky. */
  readonly pictureFill: string;
  /** The call kind's colour, filling the status ring when done. */
  readonly accent: string;
  readonly status: RingSlotStatus;
  /** Where the row goes when tapped: an open call starts; from week 2, a done one plays again. */
  readonly target: Href | null;
}

export interface WeekPhrase {
  readonly id: string;
  readonly phrase: string;
  readonly gloss: string;
  readonly art: BurrowObjectId;
}

export interface WeekModel {
  readonly dates: WeekDates;
  readonly roommate: Roommate;
  readonly rows: readonly WeekRow[];
  /** The oldest call still open from an earlier week, waiting; null when none is. */
  readonly waiting: WeekRow | null;
  readonly phrases: readonly WeekPhrase[];
  readonly ring: { readonly done: number; readonly total: number };
  /** The button under the phrases: the first open call of the week, or none when all are done. */
  readonly cta: { readonly label: Copy; readonly target: Href } | null;
}

const WEEKDAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;

const weekdayOf = (date: string): (typeof WEEKDAYS)[number] => {
  const [y, m, d] = date.split('-').map(Number);
  return WEEKDAYS[new Date(Date.UTC(y ?? 1970, (m ?? 1) - 1, d ?? 1)).getUTCDay()] ?? 'mon';
};

const dayOfMonth = (date: string) => Number(date.slice(8, 10));
const monthOf = (date: string) => Number(date.slice(5, 7));

/** The week's first and last day; `fromMonth` is set when the week runs across two months. */
export interface WeekDates {
  readonly from: number;
  readonly to: number;
  readonly fromMonth: number | null;
  readonly month: number;
}

export function weekDates(startedOn: string, week: number): WeekDates {
  const from = dateOfDay(startedOn, firstDayOfWeek(week));
  const to = addDays(from, 6);
  return {
    from: dayOfMonth(from),
    to: dayOfMonth(to),
    fromMonth: monthOf(from) === monthOf(to) ? null : monthOf(from),
    month: monthOf(to),
  };
}

const monthKey = (m: number) => `common.month.${m}` as 'common.month.1';

/**
 * "21 – 27 tháng 9" ("Sep 21 – 27" in English, with the short month). A week across two months
 * names both: the first month folds into the first day ("28 tháng 9 – 4 tháng 10").
 */
export function formatWeekDates(t: Translate, language: Language, dates: WeekDates): string {
  const month = (m: number) =>
    language === 'en' ? t(`common.monthShort.${m}` as 'common.monthShort.1') : t(monthKey(m));
  if (dates.fromMonth === null) {
    return t('common.date.range', { from: dates.from, to: dates.to, month: month(dates.month) });
  }
  // English puts the month first ("Sep 28 – Oct 4"), Vietnamese after the day.
  const day = (d: number, m: number) =>
    language === 'en' ? `${month(m)} ${d}` : `${d} ${month(m)}`;
  return language === 'en'
    ? t('common.date.range', {
        from: day(dates.from, dates.fromMonth),
        to: day(dates.to, dates.month),
        month: '',
      }).trim()
    : t('common.date.range', {
        from: day(dates.from, dates.fromMonth),
        to: dates.to,
        month: month(dates.month),
      });
}

const PHRASE_ART: Readonly<Record<PhraseState, BurrowObjectId>> = {
  seed: 'seed',
  sprout: 'plant-0',
  leaf: 'plant-1',
  bloom: 'plant-2',
};

function episodeOf(week: number): Episode {
  const episode = SEASON_1.episodes[week - 1] ?? SEASON_1.episodes.at(-1);
  if (episode === undefined) throw new Error('season 1 has no episodes');
  return episode;
}

const SLOT_TAG: Readonly<Record<RingSlotKind, Copy>> = {
  episode: copy('week.slot.episode'),
  real_week: copy('week.slot.realWeek'),
  practice: copy('week.slot.practice'),
};

/** The week view for the week the learner is in. */
export function weekModel(input: WeekInput): WeekModel {
  return input.day >= LATER_WEEKS_FROM_DAY ? laterWeekModel(input) : firstWeekModel(input);
}

/** The first week, on the calendar. */
function firstWeekModel(input: WeekInput): WeekModel {
  const ring = currentRing(input);
  const episode = episodeOf(ring.week);
  const name = input.roommate.name;
  const guest = episode.cast.find((c) => c !== 'pip' && c !== 'mags' && c !== 'office') ?? 'pip';
  const sceneOf = (kind: RingSlotKind) => episode.scenes.find((s) => s.kind === kind);

  const titles: Readonly<Record<RingSlotKind, Copy>> = {
    episode: copy('week.slot.episodeTitle', {
      season: SEASON_1.number,
      episode: episode.number,
      title: episode.title,
    }),
    real_week:
      ring.week === 1
        ? copy('week.slot.teach', { name })
        : text(sceneOf('real_week')?.title ?? episode.realWeek),
    practice:
      ring.week === 1
        ? copy('week.slot.passItOn')
        : text(sceneOf('practice')?.title ?? episode.practice),
  };
  const looks: Readonly<Record<RingSlotKind, Pick<WeekRow, 'face' | 'pictureFill' | 'accent'>>> = {
    episode: {
      face: { character: guest, mood: ring.week === 1 ? 'worried' : 'happy' },
      pictureFill: palette.apricot,
      accent: colours.accent,
    },
    real_week: {
      face: { character: 'pip', mood: 'think' },
      pictureFill: colours.accentSoft,
      accent: colours.secondary,
    },
    practice: {
      face: { character: 'bea', mood: 'happy' },
      pictureFill: colours.secondarySoft,
      accent: colours.success,
    },
  };

  const rows: WeekRow[] = ring.slots.map((slot) => {
    const opens = dateOfDay(input.startedOn, slotOpensOnDay(ring.week, slot.kind));
    const opensToday = slotOpensOnDay(ring.week, slot.kind) === input.day;
    const scene = sceneOf(slot.kind);
    return {
      key: slot.kind,
      kind: slot.kind,
      fromWeek: null,
      tag: SLOT_TAG[slot.kind],
      title: titles[slot.kind],
      when: opensToday
        ? copy('week.slot.today')
        : copy(`common.weekdayShort.${weekdayOf(opens)}` as 'common.weekdayShort.mon'),
      ...looks[slot.kind],
      status: slot.status,
      target: slot.status === 'open' && scene !== undefined ? callRoute(scene.id) : null,
    };
  });

  const met = new Map(input.progress.phrases.map((p) => [p.id, p]));
  const phrases: WeekPhrase[] = episode.phrases.flatMap((id) => {
    const phrase = findPhrase(id);
    if (phrase === undefined) return [];
    return [
      {
        id,
        phrase: phrase.en,
        gloss: glossFor(phrase.glosses, input.firstLanguage) ?? '',
        art: PHRASE_ART[met.get(id)?.state ?? 'seed'],
      },
    ];
  });

  const firstOpen = rows.find((r) => r.status === 'open' && r.target !== null);
  return {
    dates: weekDates(input.startedOn, ring.week),
    roommate: input.roommate,
    rows,
    waiting: null,
    phrases,
    ring: { done: rows.filter((r) => r.status === 'done').length, total: rows.length },
    cta:
      firstOpen?.target != null
        ? {
            label:
              firstOpen.kind === 'episode' && ring.week === 1
                ? copy('week.cta', { name })
                : firstOpen.title,
            target: firstOpen.target,
          }
        : null,
  };
}

const LOOKS: Readonly<Record<RingSlotKind, Pick<WeekRow, 'pictureFill' | 'accent'>>> = {
  episode: { pictureFill: palette.apricot, accent: colours.accent },
  real_week: { pictureFill: colours.accentSoft, accent: colours.secondary },
  practice: { pictureFill: colours.secondarySoft, accent: colours.success },
};

/** A ring call's title: the episode's "S1 · E3 · Cheaper Beans", else the scene's own. */
const callTitle = (kind: RingSlotKind, sceneId: string): Copy => {
  const episode = kind === 'episode' ? episodeOfScene(sceneId) : undefined;
  return episode === undefined
    ? text(findScene(sceneId)?.title ?? '')
    : copy('week.slot.episodeTitle', {
        season: SEASON_1.number,
        episode: episode.number,
        title: episode.title,
      });
};

const faceFor = (kind: RingSlotKind, sceneId: string): FaceSpec => {
  const guest = guestOf(sceneId);
  return { character: guest, mood: kind === 'real_week' && guest === 'pip' ? 'think' : 'happy' };
};

const STATE_ORDER: readonly PhraseState[] = ['seed', 'sprout', 'leaf', 'bloom'];

/**
 * From week 2: the story week (the week of the next episode, never ahead of the calendar), its
 * three calls from their slots' scenes, the oldest call still waiting from an earlier week, and
 * the week's phrases. A week with no episode of its own (the festival and after) is a ring of
 * replays, and its phrases are the learner's own that have the most growing to do.
 */
function laterWeekModel(input: WeekInput): WeekModel {
  const week = storyWeekOfInput(input);
  const rows: WeekRow[] = week.ring.map((slot) => {
    const sceneId = ringSceneFor(week.week, slot.kind, slot.sceneId);
    const when: Copy =
      slot.opensOnDay === input.day
        ? copy('week.slot.today')
        : week.behind && slot.status === 'open'
          ? copy('week.waiting.when')
          : copy(`common.weekdayShort.${weekdayOf(slot.opensOn)}` as 'common.weekdayShort.mon');
    return {
      key: slot.kind,
      kind: slot.kind,
      fromWeek: null,
      tag: isReplay(week.week, slot.kind, slot.sceneId)
        ? copy('week.slot.replay')
        : SLOT_TAG[slot.kind],
      title: callTitle(slot.kind, sceneId),
      when,
      face: faceFor(slot.kind, sceneId),
      ...LOOKS[slot.kind],
      status: slot.status,
      target: slot.status === 'upcoming' ? null : callRoute(sceneId),
    };
  });

  const oldest = week.waiting[0];
  const waiting: WeekRow | null =
    oldest === undefined
      ? null
      : (() => {
          const sceneId = ringSceneFor(oldest.week, oldest.kind, oldest.sceneId);
          return {
            key: `waiting-${oldest.week}-${oldest.kind}`,
            kind: oldest.kind,
            fromWeek: oldest.week,
            tag: copy('week.waiting.tag', { week: oldest.week }),
            title: callTitle(oldest.kind, sceneId),
            when: copy('week.waiting.when'),
            face: faceFor(oldest.kind, sceneId),
            ...LOOKS[oldest.kind],
            status: 'open',
            target: callRoute(sceneId),
          };
        })();

  const shape = SEASON_WEEKS[week.week - 1];
  const own = shape !== undefined && 'phrases' in shape ? shape.phrases : null;
  const met = new Map(input.progress.phrases.map((p) => [p.id, p]));
  const ids =
    own ??
    [...input.progress.phrases]
      .sort(
        (a, b) =>
          STATE_ORDER.indexOf(a.state) - STATE_ORDER.indexOf(b.state) || b.seedAt - a.seedAt,
      )
      .slice(0, 4)
      .map((p) => p.id);
  const phrases: WeekPhrase[] = ids.flatMap((id) => {
    const phrase = findPhrase(id);
    const mine = met.get(id);
    if (phrase === undefined && mine === undefined) return [];
    return [
      {
        id,
        phrase: phrase?.en ?? mine?.text ?? id,
        gloss: phrase === undefined ? '' : (glossFor(phrase.glosses, input.firstLanguage) ?? ''),
        art: PHRASE_ART[mine?.state ?? 'seed'],
      },
    ];
  });

  const next = rows.find((r) => r.status === 'open') ?? waiting;
  return {
    dates: weekDates(input.startedOn, week.week),
    roommate: input.roommate,
    rows,
    waiting,
    phrases,
    ring: { done: rows.filter((r) => r.status === 'done').length, total: rows.length },
    cta: next?.target != null ? { label: next.title, target: next.target } : null,
  };
}
