import type { CharacterId } from '@yapling/contracts';

import castVoices from '../../../../audio/cast-voices.json';

/*
 * Who speaks with which voice: `audio/cast-voices.json`, the same file the recorded lines are
 * rendered from, so live turns sound like the recordings. A character without a voice there yet
 * borrows one (listed in `VOICE_STAND_INS`) until the voice pipeline designs theirs.
 */

interface CastVoices {
  readonly characters: Readonly<Record<string, { readonly voice_id?: string }>>;
}

const voices = (castVoices as CastVoices).characters;

/** Stand-ins for characters with no designed voice yet. */
export const VOICE_STAND_INS: Readonly<Partial<Record<CharacterId, CharacterId>>> = {
  office: 'mags',
  dex: 'sol',
  arjun: 'sol',
};

export function voiceFor(character: CharacterId): string {
  const own = voices[character]?.voice_id;
  if (own) return own;
  const standIn = VOICE_STAND_INS[character];
  const borrowed = standIn === undefined ? undefined : voices[standIn]?.voice_id;
  if (borrowed) return borrowed;
  const pip = voices['pip']?.voice_id;
  if (!pip) throw new Error('audio/cast-voices.json has no voice for pip');
  return pip;
}

/**
 * Recorded reactions ("Ooh," "Mm," "Oh!", "Hmm,") per character, played from the app bundle the
 * moment the learner's turn ends while the generated reply streams in. A character with none
 * recorded skips the reaction; each entry is a story line id rendered by `tools/voice`.
 */
export interface Reaction {
  readonly lineId: string;
  /** What it says, so the reply doesn't repeat it. */
  readonly text: string;
  /** For questions ("Hmm,") or statements. */
  readonly forQuestion: boolean;
  readonly durationMs: number;
}

export const REACTIONS: Readonly<Partial<Record<CharacterId, readonly Reaction[]>>> = {
  pip: [
    { lineId: 's1-react-pip-ooh', text: 'Ooh,', forQuestion: false, durationMs: 607 },
    { lineId: 's1-react-pip-oh', text: 'Oh!', forQuestion: false, durationMs: 618 },
    { lineId: 's1-react-pip-mm', text: 'Mm,', forQuestion: false, durationMs: 606 },
    { lineId: 's1-react-pip-hmm', text: 'Hmm,', forQuestion: true, durationMs: 614 },
  ],
  mei: [
    { lineId: 's1-react-mei-ooh', text: 'Ooh,', forQuestion: false, durationMs: 656 },
    { lineId: 's1-react-mei-oh', text: 'Oh!', forQuestion: false, durationMs: 617 },
    { lineId: 's1-react-mei-mm', text: 'Mm,', forQuestion: false, durationMs: 616 },
    { lineId: 's1-react-mei-hmm', text: 'Hmm,', forQuestion: true, durationMs: 651 },
  ],
  linh: [
    { lineId: 's1-react-linh-ooh', text: 'Ooh,', forQuestion: false, durationMs: 688 },
    { lineId: 's1-react-linh-oh', text: 'Oh!', forQuestion: false, durationMs: 619 },
    { lineId: 's1-react-linh-mm', text: 'Mm,', forQuestion: false, durationMs: 604 },
    { lineId: 's1-react-linh-hmm', text: 'Hmm,', forQuestion: true, durationMs: 611 },
  ],
  office: [
    { lineId: 's1-react-office-ooh', text: 'Ooh,', forQuestion: false, durationMs: 604 },
    { lineId: 's1-react-office-oh', text: 'Oh!', forQuestion: false, durationMs: 619 },
    { lineId: 's1-react-office-mm', text: 'Mm,', forQuestion: false, durationMs: 608 },
    { lineId: 's1-react-office-hmm', text: 'Hmm,', forQuestion: true, durationMs: 610 },
  ],
};

/** The reaction to play before a reply, or null when the character has none recorded. */
export function pickReaction(
  character: CharacterId,
  learnerText: string,
  seq: number,
): Reaction | null {
  const clips = REACTIONS[character] ?? [];
  if (clips.length === 0) return null;
  const question = /\?\s*$/.test(learnerText);
  const fitting = clips.filter((c) => c.forQuestion === question);
  const pool = fitting.length > 0 ? fitting : clips;
  return pool[seq % pool.length] ?? null;
}
