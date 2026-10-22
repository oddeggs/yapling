import type { CharacterId, Id } from '@yapling/contracts';

import { glossed, viDraft } from '../gloss';
import type { GlossedText } from '../types';

/*
 * The shared lines of Settling in and the week-1 Visitor turns (`docs/season-1-script.md`,
 * "Shared lines"): praise after a pass, "Okay!" after a free choice, "Again?" after an English
 * miss, the words before a slow replay, Linh's two Vietnamese helps and her "That's okay!" for a
 * skipped turn. Who has no recording of one says its text with the live voice.
 */

export interface SharedLines {
  /** Praise after a pass, by listener. */
  readonly praise: Readonly<Partial<Record<CharacterId, readonly Id[]>>>;
  /** "Okay!" after a choice where any card is right, by listener. */
  readonly okay: Readonly<Partial<Record<CharacterId, readonly Id[]>>>;
  /** "Again?" after an English miss; the live voice says `againText` for anyone else. */
  readonly again: Readonly<Partial<Record<CharacterId, Id>>>;
  readonly againText: GlossedText;
  /** Before a slow replay, by the speaker of the line replayed. */
  readonly slowly: Readonly<Partial<Record<CharacterId, Id>>>;
  /** A skipped turn; the live voice says `skipText` for anyone else. */
  readonly skip: Readonly<Partial<Record<CharacterId, Id>>>;
  readonly skipText: GlossedText;
  /** Linh, in Vietnamese: let's say it together (when the learner asks for help on a card). */
  readonly together: Id;
  /** Linh, in Vietnamese, once a chapter after an answer that wasn't English: read the card. */
  readonly english: Id;
}

export const S1_SHARED_LINES: SharedLines = {
  praise: {
    linh: ['s1-set-linh-great', 's1-set-linh-yes'],
    pip: ['s1-set-pip-great', 's1-set-pip-yes'],
    mei: ['s1-set-mei-great'],
    bea: ['s1-set-bea-lovely'],
  },
  okay: {
    linh: ['s1-set-linh-okay'],
    mei: ['s1-set-mei-okay'],
    bea: ['s1-set-bea-right'],
  },
  again: { linh: 's1-set-linh-again' },
  againText: glossed('Again?', viDraft('Nói lại nhé?')),
  slowly: {
    linh: 's1-set-linh-slowly',
    pip: 's1-set-pip-slowly',
    mei: 's1-set-mei-slowly',
    bea: 's1-set-bea-slowly',
  },
  skip: { linh: 's1-set-linh-skip' },
  skipText: glossed("That's okay!", viDraft('Không sao đâu!')),
  together: 's1-set-linh-together',
  english: 's1-set-linh-english',
};

/** The praise pool for a listener (none for a character without one). */
export const praiseFor = (listener: CharacterId): readonly Id[] =>
  S1_SHARED_LINES.praise[listener] ?? [];

/** The "Okay!" pool for a listener, falling back to their praise. */
export const okayFor = (listener: CharacterId): readonly Id[] =>
  S1_SHARED_LINES.okay[listener] ?? praiseFor(listener);
