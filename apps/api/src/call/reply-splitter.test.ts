import { describe, expect, it } from 'vitest';

import { parseControl } from './control';
import { ReplySplitter } from './reply-splitter';

/** Streams `text` through a splitter in pieces of `size` characters. */
function stream(text: string, size: number, options = { maxWords: 25 }) {
  const splitter = new ReplySplitter(options);
  let spoken = '';
  for (let i = 0; i < text.length; i += size) spoken += splitter.push(text.slice(i, i + size));
  const end = splitter.end();
  spoken += end.tail;
  return { spoken: spoken.trim(), control: end.control, text: splitter.text };
}

const REPLY = 'Ooh, a marketing executive! What do you do every day?';
const CONTROL = '§{"outcome":"fine","phrasesUsed":["what-do-you-do"],"canDo":null}';

describe('the reply splitter', () => {
  it('never lets control text through, however the stream is cut', () => {
    for (const glue of ['\n', ' ', '']) {
      for (let size = 1; size <= 12; size++) {
        const { spoken, control } = stream(`${REPLY}${glue}${CONTROL}`, size);
        expect(spoken).toBe(REPLY);
        expect(spoken).not.toMatch(/[§{}]|outcome/);
        expect(parseControl(control)).toMatchObject({
          outcome: 'fine',
          phrasesUsed: ['what-do-you-do'],
        });
      }
    }
  });

  it('treats a bare JSON line as control too', () => {
    const { spoken, control } = stream('Okay! Where does it go?\n{"outcome":"off_topic"}', 3);
    expect(spoken).toBe('Okay! Where does it go?');
    expect(parseControl(control).outcome).toBe('off_topic');
  });

  it('emits only whole words while streaming', () => {
    const splitter = new ReplySplitter({ maxWords: 25 });
    expect(splitter.push('Hel')).toBe('');
    expect(splitter.push('lo the')).toBe('Hello ');
    expect(splitter.push('re')).toBe('');
    expect(splitter.end().tail).toBe('there ');
  });

  it('keeps two sentences at most', () => {
    const { spoken, control } = stream(
      'That is great. I love boxes. Let us open one. §{"outcome":"fine"}',
      5,
    );
    expect(spoken).toBe('That is great. I love boxes.');
    expect(control).toContain('fine');
    // A reply may end on its question, past the two sentences.
    expect(stream('My name is Pip. I am a red panda. What do you do?', 4).spoken).toBe(
      'My name is Pip. I am a red panda. What do you do?',
    );
    // A short exclamation doesn't use up a sentence: the question after it is kept.
    expect(stream('Hi! Oh, hello Khanh! What is your job? Tell me.', 4).spoken).toBe(
      'Hi! Oh, hello Khanh! What is your job?',
    );
  });

  it('cuts a long sentence at the next clause end past the word limit', () => {
    const long =
      'one two three four five six seven eight nine ten eleven twelve, thirteen fourteen fifteen';
    expect(stream(long, 4, { maxWords: 10 }).spoken).toBe(
      'one two three four five six seven eight nine ten eleven twelve.',
    );
    const runOn = Array.from({ length: 40 }, (_, i) => `w${i}`).join(' ');
    expect(stream(runOn, 7, { maxWords: 10 }).spoken.split(' ')).toHaveLength(18);
  });

  it('drops a leading reaction after a recorded one played', () => {
    const after = { maxWords: 25, afterReaction: true };
    expect(stream('Ooh, a new word! What is it?', 2, after).spoken).toBe('A new word! What is it?');
    expect(stream('Hmm, maybe.', 2, after).spoken).toBe('Maybe.');
    expect(stream('Ooh, a new word!', 2).spoken).toBe('Ooh, a new word!');
  });

  it('removes markup the voice would read out', () => {
    expect(stream('*smiles* That is **great**!', 3).spoken).toBe('That is great!');
    expect(stream('That is **great**!', 3).spoken).toBe('That is great!');
  });

  it('reads a missing or broken control line as a fine turn', () => {
    expect(stream('Nice!', 2).control).toBeNull();
    expect(parseControl(null)).toMatchObject({ outcome: 'fine', crisis: false });
    expect(parseControl('{"outcome":')).toMatchObject({ outcome: 'fine' });
    expect(parseControl('{"outcome":"weird","safety":"crisis"}')).toMatchObject({
      outcome: 'fine',
      crisis: true,
    });
    expect(parseControl('{"outcome":"target_error","targetId":"past_ed"}')).toMatchObject({
      outcome: 'target_error',
      targetId: 'past_ed',
    });
  });
});
