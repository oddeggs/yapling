import type { Character, TimeOfDay } from '@yapling/art';
import type { FirstLanguage, Roommate } from '@yapling/contracts';
import { translator } from '@yapling/i18n';
import { CAST, getLine, glossFor, recapLine, SEASON_1 } from '@yapling/story';

import type { BurrowInput, LineModel } from './model';
import { timeOfDayAt } from './time-of-day';

/*
 * The two burrow scenes played in the call frame: Linh knocking on the first evening, and the
 * welcome when the learner comes back (on day 8, or after a few days away). Pip is glad either
 * way: coming back is never met with a sad roommate or anything lost.
 */

/** Linh's welcome, the recorded line she says at the door. */
export const LINH_WELCOME_LINE = 's1-pro-03';

/** A recorded story line as a bubble, glossed in the learner's first language. */
export function storyLine(id: string, roommate: Roommate, language: FirstLanguage): LineModel {
  const line = getLine(id);
  return {
    speaker: line.character,
    name: line.character === 'pip' ? roommate.name : CAST[line.character].name,
    text: line.caption,
    gloss: glossFor(line.glosses, language),
    lineId: line.audio !== null ? line.id : null,
  };
}

export interface DoorModel {
  readonly scene: 'burrow-day1';
  readonly timeOfDay: TimeOfDay;
  readonly roommate: Roommate;
  /** Linh at the door, waving. */
  readonly guest: Character;
  readonly line: LineModel;
}

/** Linh knocks on the first evening and invites the learner to the café. */
export function doorModel(input: BurrowInput): DoorModel {
  return {
    scene: 'burrow-day1',
    timeOfDay: timeOfDayAt(input.hour),
    roommate: input.roommate,
    guest: 'linh',
    line: storyLine(LINH_WELCOME_LINE, input.roommate, input.firstLanguage),
  };
}

/** The next episode, waiting exactly where the learner left it. */
export interface EpisodePeek {
  readonly season: number;
  readonly episode: number;
  readonly title: string;
  readonly face: Character;
}

export interface BackModel {
  readonly kind: 'normal' | 'away';
  readonly scene: 'burrow';
  readonly timeOfDay: TimeOfDay;
  readonly roommate: Roommate;
  readonly line: LineModel;
  /** Shown at once after days away; after the learner's answer on a normal day 8. */
  readonly peek: EpisodePeek | null;
  readonly peekFirst: boolean;
}

const en = translator('en');

/** Episodes finished: week N's episode call is Episode N. */
export const finishedEpisodes = (input: Pick<BurrowInput, 'progress'>): number =>
  input.progress.weeks.filter((w) => w.slots[0]?.status === 'done').length;

/**
 * Coming back. On day 8 Pip asks how the week was; after days away Pip tells the story so far (the
 * recap of the last finished episode, recorded) and the next episode is right there. When there
 * is no story yet to recap, Pip just says it kept the learner's seat warm.
 */
export function backModel(input: BurrowInput): BackModel {
  const done = finishedEpisodes(input);
  const next = SEASON_1.episodes[done] ?? null;
  const guest = next?.cast.find((c) => c !== 'pip');
  const peek: EpisodePeek | null =
    next !== null
      ? {
          season: SEASON_1.number,
          episode: next.number,
          title: next.title,
          face: guest === undefined || guest === 'mags' || guest === 'office' ? 'pip' : guest,
        }
      : null;
  const pip = (key: 'knocks.day8' | 'knocks.day8_back'): LineModel => ({
    speaker: 'pip',
    name: input.roommate.name,
    text: en(key),
    gloss: null,
    lineId: null,
  });
  if (input.welcome.kind === 'back_after_away') {
    const recap = input.welcome.recapKey !== null ? recapLine(input.welcome.recapKey) : undefined;
    return {
      kind: 'away',
      scene: 'burrow',
      timeOfDay: timeOfDayAt(input.hour),
      roommate: input.roommate,
      line:
        recap !== undefined
          ? storyLine(recap, input.roommate, input.firstLanguage)
          : pip('knocks.day8_back'),
      peek,
      peekFirst: true,
    };
  }
  return {
    kind: 'normal',
    scene: 'burrow',
    timeOfDay: timeOfDayAt(input.hour),
    roommate: input.roommate,
    line: pip('knocks.day8'),
    peek,
    peekFirst: false,
  };
}
