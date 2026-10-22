import { CHARACTER_IDS } from '@yapling/contracts';
import { describe, expect, it } from 'vitest';

import castVoices from '../../../../audio/cast-voices.json';
import { VOICE_STAND_INS, voiceFor } from './voices';

const cast = (castVoices as { characters: Record<string, { voice_id?: string }> }).characters;

describe('who speaks with which voice', () => {
  it('gives each character its own designed voice, and a stand-in only until it has one', () => {
    for (const character of CHARACTER_IDS) {
      const own = cast[character]?.voice_id;
      const standIn = cast[VOICE_STAND_INS[character] ?? 'pip']?.voice_id;
      expect(voiceFor(character), character).toBe(own ?? standIn);
    }
  });

  it("lets Dex borrow Sol's voice while he has none of his own", () => {
    expect(voiceFor('dex')).toBe(cast['dex']?.voice_id ?? cast['sol']?.voice_id);
  });
});
