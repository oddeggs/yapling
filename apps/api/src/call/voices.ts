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
 * moment the learner's turn ends while the generated reply streams in. None are recorded yet, so
 * the call skips the reaction; each entry is a story line id once `tools/voice` renders it.
 */
export interface Reaction {
  readonly lineId: string;
  /** What it says, so the reply doesn't repeat it. */
  readonly text: string;
  /** For questions ("Hmm,") or statements. */
  readonly forQuestion: boolean;
  readonly durationMs: number;
}

export const REACTIONS: Readonly<Partial<Record<CharacterId, readonly Reaction[]>>> = {};

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
