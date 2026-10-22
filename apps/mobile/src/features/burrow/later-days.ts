import type { Mood } from '@yapling/art';
import type { Id, RingSlotKind } from '@yapling/contracts';
import type { StoryWeek, WeekOpening } from '@yapling/domain';
import { CAST, findScene, SEASON_1 } from '@yapling/story';
import type { Href } from 'expo-router';

import { copy, text, type Copy } from './copy';
import type { DayPlan } from './day-plan';
import type { DeltaCard, FaceSpec, PrimaryAction } from './model';
import { drawable, episodeOfScene, guestOf, isReplay, ringSceneFor, senderOf } from './ring-scenes';
import { BURROW_ROUTES, callRoute, listenRoute, wrapRoute } from './routes';

/*
 * The days after the first week, from the story week's plan. Each day of a week has its thing:
 * the new episode (day 1), Pip's story and the post (day 2), the real-week call (day 3), the
 * practice call (day 4), the voicemail (day 5), Pip's minute (day 6) and the week's wrap (day 7).
 *
 * The card at the top is one new thing a day, and never the card of the day before: on a day with
 * nothing new (a week the learner is still catching up on, a day the week has nothing for) it
 * offers the oldest thing still waiting, Pip's minute, the shelf or a quiet day, whichever wasn't
 * yesterday's. The button does the day's thing, then the oldest call still waiting. Nothing
 * expires, and nothing here counts or names a day the learner didn't come.
 */

export interface LaterDayInput {
  /** The learner's story week (the week of the next episode, never ahead of the calendar). */
  readonly week: StoryWeek;
  readonly roommateName: string;
  /** Back after a few days away: the card says what is new since. */
  readonly away: boolean;
  /** The listening scenes heard (stories, postcards, voicemails), by scene id. */
  readonly scenesSeen: ReadonlySet<Id>;
  /** Today's Pip's minute; null when no phrase is due (then it isn't offered). */
  readonly pipsMinute: Id | null;
  /** The card shown at the top on the last day the burrow was opened before today. */
  readonly previousCard: string | null;
}

/** The small Pip's-minute chip on the burrow, on a day it isn't the card or the button. */
export interface PipsMinuteChip {
  readonly label: Copy;
  readonly target: Href;
}

export interface LaterDayPlan extends DayPlan {
  readonly chip: PipsMinuteChip | null;
}

type ThingKind = RingSlotKind | 'story' | 'postcard' | 'voicemail' | 'pips_minute' | 'wrap';

/** Something a week offers: a call, a scene to hear, Pip's minute or the wrap. */
interface Thing {
  readonly id: string;
  readonly kind: ThingKind;
  readonly sceneId: Id | null;
  readonly week: number;
  /** A replay of an earlier week's call (a week with no call of its own). */
  readonly replay: boolean;
  /** Played, heard, or (the wrap) nothing to do. */
  readonly done: boolean;
}

const RING_KINDS: readonly string[] = ['episode', 'real_week', 'practice'];
const LISTEN_KINDS: readonly string[] = ['story', 'postcard', 'voicemail'];

/** Ids of the cards with no scene of their own. */
export const CARD_IDS = {
  pipsMinute: 'pips-minute',
  phrases: 'shelf',
  quiet: 'quiet-day',
} as const;

const ringThing = (week: number, kind: RingSlotKind, own: Id | null, done: boolean): Thing => {
  const sceneId = ringSceneFor(week, kind, own);
  const replay = isReplay(own);
  return {
    id: replay ? `replay-${week}-${sceneId}` : sceneId,
    kind,
    sceneId,
    week,
    replay,
    done,
  };
};

/** A week's opening as a thing, with whether it's done; null for a kind the burrow doesn't offer. */
function thingOf(opening: WeekOpening, input: LaterDayInput): Thing | null {
  const { week } = input;
  if (opening.ring !== null) {
    const slot = week.ring.find((s) => s.kind === opening.ring);
    return ringThing(
      week.week,
      opening.ring,
      slot?.sceneId ?? opening.scene,
      slot?.status === 'done',
    );
  }
  if (opening.scene === null || !LISTEN_KINDS.includes(opening.kind)) return null;
  return {
    id: opening.scene,
    kind: opening.kind as ThingKind,
    sceneId: opening.scene,
    week: week.week,
    replay: false,
    done: input.scenesSeen.has(opening.scene),
  };
}

const pipsThing = (sceneId: Id, week: number): Thing => ({
  id: CARD_IDS.pipsMinute,
  kind: 'pips_minute',
  sceneId,
  week,
  replay: false,
  done: false,
});

/** What today brings: the week's openings for today, Pip's minute on day 6, the wrap on day 7. */
function todaysThings(input: LaterDayInput): readonly Thing[] {
  const { week } = input;
  if (week.behind) return [];
  const things = week.today.flatMap((o) => thingOf(o, input) ?? []);
  if (week.dayOfWeek === 6 && input.pipsMinute !== null) {
    things.push(pipsThing(input.pipsMinute, week.week));
  }
  if (week.dayOfWeek === 7) {
    things.push({
      id: `wrap-${week.week}`,
      kind: 'wrap',
      sceneId: null,
      week: week.week,
      replay: false,
      done: true,
    });
  }
  return things;
}

/**
 * Everything still waiting, oldest first: calls open from earlier weeks, the story week's open
 * calls, then what it has opened and the learner hasn't heard yet.
 */
function waitingThings(input: LaterDayInput): readonly Thing[] {
  const { week } = input;
  const earlier = week.waiting.map((w) => ringThing(w.week, w.kind, w.sceneId, false));
  const calls = [...week.ring]
    .filter((s) => s.status === 'open')
    .sort((a, b) => a.opensOnDay - b.opensOnDay)
    .map((s) => ringThing(week.week, s.kind, s.sceneId, false));
  const unheard = week.opened
    .filter((o) => o.ring === null)
    .flatMap((o) => thingOf(o, input) ?? [])
    .filter((t) => !t.done);
  return [...earlier, ...calls, ...unheard];
}

const nameOf = (input: LaterDayInput, id: Id | null): string => {
  const who = id === null ? 'pip' : (findScene(id)?.cast[0] ?? 'pip');
  return who === 'pip' ? input.roommateName : CAST[who].name;
};

/** Who a call is with, by name (the roommate's name for Pip). */
const withName = (input: LaterDayInput, sceneId: Id): string => {
  const guest = guestOf(sceneId);
  return guest === 'pip' ? input.roommateName : CAST[guest].name;
};

const episodeTitle = (sceneId: Id): Copy => {
  const episode = episodeOfScene(sceneId);
  return episode === undefined
    ? text(findScene(sceneId)?.title ?? '')
    : copy('week.slot.episodeTitle', {
        season: SEASON_1.number,
        episode: episode.number,
        title: episode.title,
      });
};

const sceneTitle = (sceneId: Id | null): Copy =>
  text(sceneId === null ? '' : (findScene(sceneId)?.title ?? ''));

/** Where a thing starts. */
function targetOf(thing: Thing): Href {
  if (thing.kind === 'wrap') return wrapRoute(thing.week);
  if (thing.sceneId === null) return BURROW_ROUTES.week;
  return RING_KINDS.includes(thing.kind) || thing.kind === 'pips_minute'
    ? callRoute(thing.sceneId)
    : listenRoute(thing.sceneId);
}

/** The button for a thing. */
function actionOf(thing: Thing, input: LaterDayInput): PrimaryAction {
  const target = targetOf(thing);
  const id = thing.sceneId;
  switch (thing.kind) {
    case 'episode':
      return { label: episodeTitle(id ?? ''), target };
    case 'real_week':
    case 'practice':
      return { label: sceneTitle(id), target };
    case 'story':
      return { label: copy('burrow.action.story', { name: input.roommateName }), target };
    case 'postcard':
      return { label: copy('burrow.later.action.postcard'), target };
    case 'voicemail':
      return { label: copy('burrow.action.voicemail'), target };
    case 'pips_minute':
      return { label: copy('burrow.later.action.pipsMinute'), target };
    case 'wrap':
      return { label: copy('burrow.later.action.wrap'), target };
  }
}

/** The face on a thing's card. */
function faceOf(thing: Thing): FaceSpec {
  const id = thing.sceneId;
  switch (thing.kind) {
    case 'episode':
      return { character: id === null ? 'pip' : guestOf(id), mood: 'happy' };
    case 'real_week':
    case 'practice': {
      const guest = id === null ? 'pip' : guestOf(id);
      return { character: guest, mood: guest === 'pip' ? 'think' : 'happy' };
    }
    case 'story':
      return { character: 'pip', mood: 'excited' };
    case 'postcard':
    case 'voicemail':
      return { character: drawable(id === null ? 'pip' : senderOf(id)), mood: 'happy' };
    case 'pips_minute':
      return { character: 'pip', mood: 'happy' };
    case 'wrap':
      return { character: 'pip', mood: 'proud' };
  }
}

/** A thing's title and line on its card. */
function wordsOf(thing: Thing, input: LaterDayInput): { title: Copy; sub: Copy } {
  const id = thing.sceneId ?? '';
  switch (thing.kind) {
    case 'episode': {
      const episode = episodeOfScene(id);
      const n = episode?.number ?? 0;
      return {
        title: thing.replay
          ? copy('burrow.later.replay', { episode: n })
          : copy('burrow.delta.nextEpisode', { episode: n }),
        sub: text(episode?.title ?? ''),
      };
    }
    case 'real_week':
      return {
        title: copy('burrow.later.realWeek', { who: withName(input, id) }),
        sub: sceneTitle(id),
      };
    case 'practice':
      return {
        title: copy('burrow.later.practice', { who: withName(input, id) }),
        sub: sceneTitle(id),
      };
    case 'story': {
      const post = input.week.days[input.week.dayOfWeek - 1]?.opens.some(
        (o) => o.kind === 'postcard',
      );
      return {
        title: copy('burrow.later.story', { name: input.roommateName }),
        sub: copy(post === true ? 'burrow.later.storyPost' : 'burrow.later.storySub'),
      };
    }
    case 'postcard':
      return { title: copy('burrow.later.postcard'), sub: sceneTitle(id) };
    case 'voicemail':
      return {
        title: copy('burrow.later.voicemail', { from: nameOf(input, id) }),
        sub: copy('burrow.later.voicemailSub'),
      };
    case 'pips_minute':
      return {
        title: copy('burrow.later.pipsMinute', { name: input.roommateName }),
        sub: copy('burrow.later.pipsMinuteSub'),
      };
    case 'wrap':
      return {
        title: copy('burrow.later.wrap', { week: thing.week }),
        sub: copy(input.week.full ? 'burrow.later.wrapFull' : 'burrow.later.wrapSub'),
      };
  }
}

const card = (
  id: string,
  kicker: Copy,
  words: { title: Copy; sub: Copy | null },
  face: FaceSpec | null,
  target: Href | null,
): DeltaCard => ({ id, kicker, style: 'news', ...words, face, target });

/** The day's thing on the card. Done, it stays the day's card and leads to the week. */
function dayCard(thing: Thing, input: LaterDayInput, kicker: Copy): DeltaCard {
  const done = thing.done && thing.kind !== 'wrap';
  return card(
    thing.id,
    kicker,
    wordsOf(thing, input),
    faceOf(thing),
    done ? BURROW_ROUTES.week : targetOf(thing),
  );
}

/** Something still waiting, on the card: it waits as long as it takes. */
function waitingCard(thing: Thing, input: LaterDayInput): DeltaCard {
  const title =
    thing.kind === 'episode'
      ? episodeTitle(thing.sceneId ?? '')
      : RING_KINDS.includes(thing.kind)
        ? sceneTitle(thing.sceneId)
        : wordsOf(thing, input).title;
  return card(
    `waiting-${thing.id}`,
    copy('burrow.later.kicker.waiting'),
    { title, sub: copy('burrow.later.waitingSub') },
    faceOf(thing),
    targetOf(thing),
  );
}

/** The day's plan for the burrow home, from week 2 on. */
export function laterDayPlan(input: LaterDayInput): LaterDayPlan {
  const kicker = input.away ? copy('burrow.delta.sinceAway') : copy('burrow.delta.today');
  const today = todaysThings(input);
  const dayThing = today.find((t) => !t.done) ?? today[0] ?? null;
  const waiting = waitingThings(input).filter((t) => t.id !== dayThing?.id);
  const pips = input.pipsMinute === null ? null : pipsThing(input.pipsMinute, input.week.week);

  const first = waiting[0];
  const candidates: DeltaCard[] = [
    ...(dayThing === null ? [] : [dayCard(dayThing, input, kicker)]),
    ...(first === undefined ? [] : [waitingCard(first, input)]),
    ...(pips === null || dayThing?.kind === 'pips_minute' ? [] : [dayCard(pips, input, kicker)]),
    card(
      CARD_IDS.phrases,
      kicker,
      { title: copy('burrow.later.phrases'), sub: copy('burrow.later.phrasesSub') },
      { character: 'pip', mood: 'proud' },
      BURROW_ROUTES.week,
    ),
    card(
      CARD_IDS.quiet,
      kicker,
      {
        title: copy('burrow.later.quiet', { name: input.roommateName }),
        sub: copy('burrow.later.quietSub'),
      },
      { character: 'pip', mood: 'happy' },
      null,
    ),
  ];
  const delta = candidates.find((c) => c.id !== input.previousCard) ?? candidates[0];
  if (delta === undefined) throw new Error('the burrow has no card for today');

  // Day 7's wrap has nothing to finish: it is the button once nothing else is waiting.
  const wrap = dayThing?.kind === 'wrap' ? dayThing : null;
  const todo = dayThing !== null && !dayThing.done ? dayThing : (first ?? pips ?? wrap);
  const action: PrimaryAction =
    todo === null || todo === undefined
      ? { label: copy('burrow.action.week'), target: BURROW_ROUTES.week }
      : actionOf(todo, input);

  const pipsTarget = pips === null ? null : targetOf(pips);
  const chip =
    pipsTarget !== null && delta.target !== pipsTarget && action.target !== pipsTarget
      ? { label: copy('burrow.chip.pipsMinute', { name: input.roommateName }), target: pipsTarget }
      : null;

  const mood: Mood =
    delta.id === dayThing?.id && dayThing.kind === 'episode'
      ? 'excited'
      : input.week.full
        ? 'proud'
        : 'happy';
  return { delta, line: null, action, pipMood: mood, chip };
}
