import type { Mood } from '@yapling/art';
import type { WeekRing } from '@yapling/contracts';
import { translator } from '@yapling/i18n';
import { SEASON_1, type Episode, type SceneKind } from '@yapling/story';
import type { Href } from 'expo-router';

import { copy, type Copy } from './copy';
import type { BurrowInput, DeltaCard, FaceSpec, LineModel, PrimaryAction } from './model';
import { BURROW_ROUTES, callRoute, listenRoute } from './routes';

/*
 * What each day of the first week puts in front of the learner: the card at the top (one new
 * thing every open, never the same card two days running), the roommate's line, and the one thing
 * to do. Everything a day opens stays open; when today's thing is done, the button offers the
 * oldest call still waiting in the ring, never a deadline.
 */

export interface DayPlan {
  readonly delta: DeltaCard;
  readonly line: LineModel | null;
  readonly action: PrimaryAction | null;
  readonly pipMood: Mood;
}

const en = translator('en');

/** The scene of an episode by kind (`story`, `practice`…): its id is the route's parameter. */
function sceneId(episode: Episode, kind: SceneKind): string {
  const scene = episode.scenes.find((s) => s.kind === kind);
  if (scene === undefined) throw new Error(`${episode.id} has no ${kind} scene`);
  return scene.id;
}

function episodeOf(week: number): Episode {
  const episode = SEASON_1.episodes[week - 1] ?? SEASON_1.episodes.at(-1);
  if (episode === undefined) throw new Error('season 1 has no episodes');
  return episode;
}

const EPISODE_1 = episodeOf(1);

/** The roommate's own line for a knock (a character's knock is English in every language). */
const knockLine = (input: BurrowInput, key: 'knocks.day2' | 'knocks.day4'): LineModel => ({
  speaker: 'pip',
  name: input.roommate.name,
  text: en(key),
  gloss: null,
  lineId: null,
});

const news = (
  id: string,
  kicker: Copy,
  title: Copy,
  sub: Copy | null,
  face: FaceSpec | null,
  target: Href | null,
): DeltaCard => ({ id, kicker, style: 'news', title, sub, face, target });

/** The ring's calls in order with where each one starts (null while its scene is not written). */
function ringCalls(
  week: number,
): readonly { kind: 'episode' | 'real_week' | 'practice'; to: Href | null }[] {
  const episode = episodeOf(week);
  const to = (kind: SceneKind) => {
    const scene = episode.scenes.find((s) => s.kind === kind);
    return scene === undefined ? null : callRoute(scene.id);
  };
  return [
    { kind: 'episode', to: to('episode') },
    { kind: 'real_week', to: to('real_week') },
    { kind: 'practice', to: to('practice') },
  ];
}

/** The label of a ring call's button, as the week view names it. */
function callLabel(kind: 'episode' | 'real_week' | 'practice', name: string, week: number): Copy {
  if (kind === 'episode') {
    if (week === 1) return copy('week.cta', { name });
    const episode = episodeOf(week);
    return copy('week.slot.episodeTitle', {
      season: SEASON_1.number,
      episode: episode.number,
      title: episode.title,
    });
  }
  if (kind === 'real_week') return copy('week.slot.teach', { name });
  return copy('burrow.action.practice');
}

/** The oldest open call of the ring, or the week view when none is waiting. */
function catchUp(input: BurrowInput, ring: WeekRing): PrimaryAction {
  const calls = ringCalls(ring.week);
  const open = calls.find((c, i) => ring.slots[i]?.status === 'open' && c.to !== null);
  return open?.to
    ? { label: callLabel(open.kind, input.roommate.name, ring.week), target: open.to }
    : { label: copy('burrow.action.week'), target: BURROW_ROUTES.week };
}

const isDone = (ring: WeekRing, index: number) => ring.slots[index]?.status === 'done';

/** The day's plan for the burrow home. */
export function planFor(input: BurrowInput, ring: WeekRing): DayPlan {
  const name = input.roommate.name;
  const { day, seen } = input;
  const away = input.welcome.daysAway >= 1;
  const kicker = away ? copy('burrow.delta.sinceAway') : copy('burrow.delta.today');
  const happy: Mood = 'happy';

  if (day <= 1) {
    return {
      delta: {
        id: 'first-words',
        kicker: copy('burrow.delta.day', { day: 1 }),
        style: 'day-tag',
        title: copy('burrow.delta.firstWords'),
        sub: null,
        face: null,
        target: null,
      },
      line: null,
      action: null,
      pipMood: 'surprised',
    };
  }

  if (day >= 8) {
    const done = input.progress.weeks.filter((w) => w.slots[0]?.status === 'done').length;
    const next = SEASON_1.episodes[done] ?? null;
    const guest = next?.cast.find((c) => c !== 'pip') ?? 'pip';
    return {
      delta: news(
        `next-episode-${next?.number ?? 'season-end'}`,
        kicker,
        copy('burrow.delta.nextEpisode', { episode: next?.number ?? done }),
        copy('burrow.delta.nextEpisodeSub'),
        guest === 'mags' || guest === 'office' ? null : { character: guest, mood: happy },
        BURROW_ROUTES.week,
      ),
      line: null,
      action: catchUp(input, ring),
      pipMood: happy,
    };
  }

  if (day === 7) {
    return {
      delta: news(
        'first-week',
        kicker,
        copy('burrow.delta.firstWeek'),
        copy('burrow.delta.firstWeekSub'),
        { character: 'pip', mood: 'warm' },
        BURROW_ROUTES.plus,
      ),
      line: null,
      action: seen.has('plus_offer')
        ? catchUp(input, ring)
        : { label: copy('burrow.action.firstWeek'), target: BURROW_ROUTES.plus },
      pipMood: happy,
    };
  }

  if (day === 6) {
    const voicemail = listenRoute(sceneId(EPISODE_1, 'voicemail'));
    return {
      delta: news(
        'voicemail',
        kicker,
        copy('burrow.delta.voicemail', { name }),
        copy('burrow.delta.voicemailSub'),
        { character: 'pip', mood: 'excited' },
        voicemail,
      ),
      line: null,
      action: seen.has('voicemail')
        ? catchUp(input, ring)
        : { label: copy('burrow.action.voicemail'), target: voicemail },
      pipMood: 'excited',
    };
  }

  if (day === 5) {
    if (isDone(ring, 2)) {
      return {
        delta: news(
          'keepsake',
          copy('burrow.delta.today'),
          copy('burrow.delta.keepsake'),
          copy('burrow.delta.keepsakeSub', { name }),
          { character: 'linh', mood: happy },
          null,
        ),
        line: null,
        action: catchUp(input, ring),
        pipMood: 'proud',
      };
    }
    const practice = callRoute(sceneId(EPISODE_1, 'practice'));
    return {
      delta: news(
        'bus',
        kicker,
        copy('burrow.delta.bus'),
        copy('burrow.delta.busSub'),
        { character: 'bea', mood: happy },
        practice,
      ),
      line: null,
      action: { label: copy('burrow.action.practice'), target: practice },
      pipMood: happy,
    };
  }

  if (day === 4) {
    const realWeek = callRoute(sceneId(EPISODE_1, 'real_week'));
    return {
      delta: news(
        'favour',
        kicker,
        copy('burrow.delta.favour', { name }),
        copy('burrow.delta.favourSub'),
        { character: 'pip', mood: 'think' },
        realWeek,
      ),
      line: isDone(ring, 1) ? null : knockLine(input, 'knocks.day4'),
      action: isDone(ring, 1)
        ? catchUp(input, ring)
        : { label: copy('week.slot.teach', { name }), target: realWeek },
      pipMood: happy,
    };
  }

  if (day === 3) {
    const story = listenRoute(sceneId(EPISODE_1, 'story'));
    if (seen.has('pip_story')) {
      return {
        delta: news(
          'seagull-feather',
          copy('burrow.delta.today'),
          copy('burrow.delta.feather', { name }),
          copy('burrow.delta.featherSub'),
          { character: 'pip', mood: 'proud' },
          null,
        ),
        line: null,
        action: catchUp(input, ring),
        pipMood: 'proud',
      };
    }
    return {
      delta: news(
        'story',
        kicker,
        copy('burrow.delta.story', { name }),
        copy('burrow.delta.storySub'),
        { character: 'pip', mood: 'excited' },
        story,
      ),
      line: null,
      action: { label: copy('burrow.action.story', { name }), target: story },
      pipMood: happy,
    };
  }

  // Day 2: the letter, then the first call.
  if (isDone(ring, 0)) {
    return {
      delta: news(
        'box-unpacked',
        copy('burrow.delta.today'),
        copy('burrow.delta.boxUnpacked'),
        copy('burrow.delta.boxUnpackedSub'),
        { character: 'pip', mood: 'excited' },
        BURROW_ROUTES.week,
      ),
      line: null,
      action: catchUp(input, ring),
      pipMood: 'excited',
    };
  }
  return {
    delta: news(
      'letter',
      kicker,
      copy('burrow.delta.letter'),
      copy('burrow.delta.letterSub'),
      { character: 'mei', mood: 'worried' },
      BURROW_ROUTES.week,
    ),
    line: knockLine(input, 'knocks.day2'),
    action: { label: copy('week.cta', { name }), target: callRoute(sceneId(EPISODE_1, 'episode')) },
    pipMood: happy,
  };
}
