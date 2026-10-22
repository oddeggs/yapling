import type { Character, Mood, TimeOfDay } from '@yapling/art';
import { SETTLING_CHAPTER_COUNT, type FirstLanguage, type Roommate } from '@yapling/contracts';
import type { SettlingChapter } from '@yapling/domain';
import type { StringKey } from '@yapling/i18n';
import { SEASON_1 } from '@yapling/story';
import { palette } from '@yapling/theme';

import { copy, text, type Copy } from './copy';
import type { LineModel } from './model';
import { storyLine } from './scenes';
import {
  CHAPTER_MINUTES,
  chapterStatuses,
  isChapterDone,
  nextChapter,
  settlingPlan,
  type ChapterStatus,
  type SettlingDay,
  type SettlingPlan,
} from './settling';
import { timeOfDayAt } from './time-of-day';

/*
 * The burrow while settling in, as data: the room still in boxes, one box unpacked onto a shelf
 * per finished chapter, Pip on the rug, and the card at the bottom with Linh's sticker, the
 * chapter and the day's button. On the letter's day the room is at dusk and the café window shows
 * the letter going under Mei's door.
 */

export interface SettlingInput {
  readonly roommate: Roommate;
  readonly firstLanguage: FirstLanguage;
  /** The learner's local hour, for the room's light. */
  readonly hour: number;
  /** Days since install (the top pill's "Day N"): settling in counts from the first day. */
  readonly installDay: number;
  readonly day: SettlingDay;
}

/** A chapter as the burrow and the list show it. */
export interface ChapterInfo {
  readonly chapter: SettlingChapter;
  /** The scene's English title ("Boxes"), as the story names it. */
  readonly title: string;
  /** The box's label: the title up to its first comma ("Again"). */
  readonly boxLabel: string;
  /** What it's about, in the reader's language ("Dỡ thùng"). */
  readonly about: Copy;
  /** The face on the list: Linh, or the chapter's guest (Bea at the bus stop, Mei at her café). */
  readonly face: Character;
  readonly faceFill: string;
  /** Who the card's button meets. */
  readonly host: 'linh' | 'mei';
  readonly minutes: number;
}

const FACE_FILL: Readonly<Record<'linh' | 'bea' | 'mei', string>> = {
  linh: palette.cyanTint,
  bea: palette.mintTint,
  mei: palette.apricot,
};

export function chapterInfo(chapter: SettlingChapter): ChapterInfo {
  const scene = SEASON_1.settling[chapter - 1];
  if (scene === undefined) throw new Error(`No Settling-in chapter ${chapter}`);
  const face = scene.cast.includes('bea') ? 'bea' : scene.cast.includes('mei') ? 'mei' : 'linh';
  return {
    chapter,
    title: scene.title,
    boxLabel: scene.title.split(',')[0] ?? scene.title,
    about: copy(`burrow.settling.chapter.${chapter}` as 'burrow.settling.chapter.1'),
    face,
    faceFill: FACE_FILL[face],
    host: scene.cast.includes('linh') ? 'linh' : 'mei',
    minutes: CHAPTER_MINUTES[chapter],
  };
}

/** A box by the door still to unpack, where the board stacks it (390-point units). */
export interface SettlingBox {
  readonly chapter: SettlingChapter;
  readonly label: string;
  readonly left: number;
  readonly top: number;
  /** Degrees. */
  readonly rotate: number;
}

/** What came out of an unpacked box, standing on a shelf. */
export interface SettlingItem {
  readonly id: string;
  /** The burrow object's generator options (`s_obj`). */
  readonly art: { readonly fam: string; readonly stage: number; readonly extra?: object };
  readonly left: number;
  readonly top: number;
  /** Unpacked today, the newest: it pops onto the shelf with sparkles. */
  readonly fresh: boolean;
}

/** The stack by the door, bottom right first, in the order the boxes are unpacked. */
const BOX_SPOTS: readonly { left: number; top: number; rotate: number }[] = [
  { left: 292, top: 438, rotate: 4 },
  { left: 214, top: 438, rotate: -3 },
  { left: 282, top: 492, rotate: -2 },
  { left: 204, top: 492, rotate: 3 },
  { left: 274, top: 546, rotate: 2 },
  { left: 196, top: 546, rotate: -2 },
];

/** Where each unpacked thing stands: four on the low shelf, two on the high one. */
const ITEM_SPOTS: readonly { left: number; top: number }[] = [
  { left: 22, top: 342 },
  { left: 68, top: 342 },
  { left: 114, top: 342 },
  { left: 160, top: 342 },
  { left: 268, top: 138 },
  { left: 320, top: 138 },
];

/** What each box holds, in the order they are unpacked: a plant, a jar, a mug, the mailbox… */
const ITEMS: readonly SettlingItem['art'][] = [
  { fam: 'plant', stage: 1 },
  { fam: 'jar', stage: 1, extra: { fill: palette.butter } },
  { fam: 'desk', stage: 1, extra: { kind: 'mug' } },
  { fam: 'mail', stage: 1 },
  { fam: 'desk', stage: 1, extra: { kind: 'notes' } },
  { fam: 'plant', stage: 2, extra: { lid: palette.lilac } },
];

export type SegmentState = 'done' | 'next' | 'todo';

export type SettlingActions =
  /** One button: the next chapter. */
  | { readonly kind: 'chapter'; readonly label: Copy; readonly chapter: SettlingChapter }
  /** "Tomorrow" and "Keep going", after two chapters today. */
  | { readonly kind: 'rest'; readonly chapter: SettlingChapter }
  /** The learner chose tomorrow: only "Keep going" stays. */
  | { readonly kind: 'rested'; readonly chapter: SettlingChapter }
  /** The letter: "Good night". */
  | { readonly kind: 'goodnight' }
  | { readonly kind: 'none' };

export interface SettlingCard {
  readonly kicker: Copy;
  readonly title: Copy;
  readonly sub: Copy;
  /** One per chapter: done, the next one, still to come. */
  readonly segments: readonly SegmentState[];
  readonly done: number;
  readonly actions: SettlingActions;
}

export interface SettlingHomeModel {
  readonly plan: SettlingPlan;
  readonly timeOfDay: TimeOfDay;
  /** The letter's evening: the room washed in dusk, the café window over it. */
  readonly dusk: boolean;
  readonly roommate: Roommate;
  readonly pipMood: Mood;
  /** The top pill: "Day 2 · evening". */
  readonly when: { readonly day: number; readonly time: SettlingTime };
  readonly boxes: readonly SettlingBox[];
  readonly items: readonly SettlingItem[];
  readonly card: SettlingCard;
  /** Pip at the window, on the letter's day. */
  readonly line: LineModel | null;
}

export type SettlingTime = 'morning' | 'afternoon' | 'evening' | 'dusk';

export const settlingTimeKey = (time: SettlingTime) =>
  `burrow.settling.time.${time}` as const satisfies StringKey;

/** Pip's line when the letter goes under Mei's door (Chapter 6's last line, recorded). */
export const LETTER_LINE = 's1-set6-06';

const total = SETTLING_CHAPTER_COUNT;

function segmentsFor(done: number): SegmentState[] {
  return Array.from({ length: total }, (_, i) =>
    i < done ? 'done' : i === done ? 'next' : 'todo',
  );
}

function cardFor(plan: SettlingPlan, roommate: Roommate): SettlingCard {
  const segments = segmentsFor(plan.done);
  if (plan.kind === 'letter') {
    return {
      kicker: copy('burrow.settling.kickerDone', { done: plan.done, total }),
      title: copy('burrow.settling.settled'),
      sub: copy('burrow.settling.settledSub'),
      segments,
      done: plan.done,
      actions: plan.goodnight ? { kind: 'none' } : { kind: 'goodnight' },
    };
  }
  const info = chapterInfo(plan.chapter);
  if (plan.kind === 'rest') {
    return {
      kicker: copy('burrow.settling.kickerRest', { chapter: plan.chapter, total }),
      title: text(info.title),
      sub: plan.rested ? copy('burrow.settling.restedSub') : copy('burrow.settling.restSub'),
      segments,
      done: plan.done,
      actions: { kind: plan.rested ? 'rested' : 'rest', chapter: plan.chapter },
    };
  }
  const sub =
    plan.chapter === 6
      ? copy('burrow.settling.sub.6', { name: roommate.name })
      : copy(`burrow.settling.sub.${plan.chapter}` as 'burrow.settling.sub.1');
  return {
    kicker: copy('burrow.settling.kicker', { chapter: plan.chapter, total }),
    title: text(info.title),
    sub,
    segments,
    done: plan.done,
    actions: {
      kind: 'chapter',
      chapter: plan.chapter,
      label:
        info.host === 'mei'
          ? copy('burrow.settling.go.mei', { minutes: info.minutes })
          : copy('burrow.settling.go.linh', { minutes: info.minutes }),
    },
  };
}

const timeFor = (hour: number): SettlingTime => {
  const tod = timeOfDayAt(hour);
  return tod === 'night' ? 'evening' : tod;
};

/** The burrow while settling in, and on the letter's day. */
export function settlingHomeModel(input: SettlingInput): SettlingHomeModel {
  const { day } = input;
  const plan = settlingPlan(day);
  const done = day.chapters.length;
  const newest = day.chapters.at(-1);
  const freshToday = newest !== undefined && newest.doneOn === day.today;
  const waiting = ([1, 2, 3, 4, 5, 6] as const).filter((c) => !isChapterDone(day.chapters, c));
  const boxes = waiting.flatMap((chapter, j): SettlingBox[] => {
    const spot = BOX_SPOTS[done + j];
    return spot ? [{ chapter, label: chapterInfo(chapter).boxLabel, ...spot }] : [];
  });
  const items = ITEMS.slice(0, done).flatMap((art, i): SettlingItem[] => {
    const spot = ITEM_SPOTS[i];
    return spot
      ? [{ id: `unpacked-${i + 1}`, art, ...spot, fresh: freshToday && i === done - 1 }]
      : [];
  });
  const letter = plan.kind === 'letter';
  return {
    plan,
    timeOfDay: letter ? 'evening' : timeOfDayAt(input.hour),
    dusk: letter,
    roommate: input.roommate,
    pipMood: letter ? 'surprised' : plan.kind === 'rest' ? 'sleepy' : 'happy',
    when: { day: input.installDay, time: letter ? 'dusk' : timeFor(input.hour) },
    boxes,
    items,
    card: cardFor(plan, input.roommate),
    line: letter ? storyLine(LETTER_LINE, input.roommate, input.firstLanguage) : null,
  };
}

/** A row of the Settling-in list. */
export interface SettlingRow extends ChapterInfo {
  readonly status: ChapterStatus;
}

export interface SettlingListModel {
  readonly rows: readonly SettlingRow[];
  readonly done: number;
  readonly total: number;
  /** "Start the story" is there until the letter has come. */
  readonly canSkip: boolean;
}

/** The Settling-in list: every chapter, done ones to replay, the next one, the rest after it. */
export function settlingListModel(
  day: Pick<SettlingDay, 'chapters' | 'letterOn'>,
): SettlingListModel {
  return {
    rows: chapterStatuses(day.chapters).map(({ chapter, status }) => ({
      ...chapterInfo(chapter),
      status,
    })),
    done: day.chapters.length,
    total,
    canSkip: day.letterOn === null && nextChapter(day.chapters) !== null,
  };
}
