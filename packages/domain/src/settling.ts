import type { Id } from '@yapling/contracts';

/*
 * Settling in: the six short calls with Linh a Visitor plays before the story starts. Each chapter
 * gives one survival can-do (see `SETTLING_CAN_DOS`) and most give one phrase seed packet. The
 * chapters' lines live in `@yapling/story`; the English of each phrase is quoted in a comment.
 */

/** The Settling-in scenes, chapter 1 to 6 in order. */
export const SETTLING_SCENES = [
  's1-set1',
  's1-set2',
  's1-set3',
  's1-set4',
  's1-set5',
  's1-set6',
] as const satisfies readonly Id[];
export type SettlingSceneId = (typeof SETTLING_SCENES)[number];

/** A Settling-in chapter number, 1 to 6 (`SETTLING_CHAPTER_COUNT`). */
export type SettlingChapter = 1 | 2 | 3 | 4 | 5 | 6;

/** The scene of a chapter. */
export const settlingSceneId = (chapter: SettlingChapter): SettlingSceneId => {
  const scene = SETTLING_SCENES[chapter - 1];
  if (scene === undefined) throw new Error(`No Settling-in chapter ${chapter}`);
  return scene;
};

export interface SettlingPhrase {
  readonly id: Id;
  /** The chapter whose call seeds it. */
  readonly chapter: SettlingChapter;
}

/** The phrases Settling in seeds, in chapter order (Chapter 3 has two; Chapter 4 none). */
export const SETTLING_PHRASES: readonly SettlingPhrase[] = [
  // "Nice to meet you"
  { id: 'nice-to-meet-you', chapter: 1 },
  // "Yes, please"
  { id: 'yes-please', chapter: 2 },
  // "Sorry? Again, please."
  { id: 'sorry-again-please', chapter: 3 },
  // "Slowly, please."
  { id: 'slowly-please', chapter: 3 },
  // "How much?"
  { id: 'how-much', chapter: 5 },
  // "I'm from …"
  { id: 'im-from', chapter: 6 },
];

/** The phrases a chapter seeds. */
export const settlingPhrasesFor = (chapter: SettlingChapter): readonly SettlingPhrase[] =>
  SETTLING_PHRASES.filter((p) => p.chapter === chapter);
