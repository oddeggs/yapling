import { describe, expect, it } from 'vitest';

import { AlignmentMapper, BreakInserter, breakTag, withoutTags } from './phrase-breaks';

const B = breakTag(0.35);

describe('phrase breaks', () => {
  it('puts a break before the word after each phrase, never at the end', () => {
    const breaks = new BreakInserter(0.35);
    const pieces = ['Hi Lan, ', 'so many ', 'boxes! ', 'Where does this go? '].map((p) =>
      breaks.push(p),
    );
    expect(pieces.join('')).toBe(`Hi Lan, ${B}so many boxes! ${B}Where does this go? `);
    for (const piece of pieces) expect(piece.split('<').length).toBe(piece.split('>').length);
  });

  it('adds nothing at stages without breaks', () => {
    expect(new BreakInserter(null).push('Hi, there. ')).toBe('Hi, there. ');
  });

  it('strips tags back to the caption', () => {
    expect(withoutTags(`Hi Lan, ${B}so many`)).toBe('Hi Lan, so many');
  });
});

/** Provider chunks as Flash returned them for `Hi Lan,<break/> so many boxes!` (SSML on). */
const chunk = (text: string, step = 50) => ({
  chars: [...text],
  charStartTimesMs: [...text].map((_, i) => i * step),
  charDurationsMs: [...text].map(() => step),
});

describe('the alignment mapper', () => {
  it('maps tag characters and added characters out, across chunks', () => {
    const mapper = new AlignmentMapper();
    mapper.addText('Hi Lan, so many boxes! ');
    const a = mapper.map(chunk('Hi Lan, '), 0);
    const b = mapper.map(chunk(`${B} `), 400);
    const c = mapper.map(chunk('. '), 1_500);
    const d = mapper.map(chunk('so many boxes! '), 1_600);
    const chars = [a, b, c, d].flatMap((m) => m.chars).join('');
    expect(chars).toBe('Hi Lan, so many boxes! ');
    expect(b.chars).toEqual([]);
    expect(c.chars).toEqual([]);
    expect(d.startMs[0]).toBe(1_600);
    for (const m of [a, d]) {
      expect(m.startMs).toHaveLength(m.chars.length);
      m.startMs.forEach((s, i) => expect(m.endMs[i]).toBeGreaterThanOrEqual(s));
    }
  });

  it('copes with a tag split across chunks', () => {
    const mapper = new AlignmentMapper();
    mapper.addText('Hi, so. ');
    const parts = ['Hi,<br', 'eak time="0.35s" />', ' so. '].map((t) => mapper.map(chunk(t), 0));
    expect(parts.flatMap((m) => m.chars).join('')).toBe('Hi, so. ');
  });

  it('fills characters the provider skipped', () => {
    const mapper = new AlignmentMapper();
    mapper.addText('ok, go');
    expect(mapper.map(chunk('ok,go'), 0).chars.join('')).toBe('ok, go');
  });
});
