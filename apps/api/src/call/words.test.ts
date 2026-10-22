import { describe, expect, it } from 'vitest';

import { cardRequest, parseCard } from './card-judge';
import { againAsk, cardWords, matchesCard, normalize, numberWords, withName } from './words';

/*
 * Card turns without a model: the beat's words against what speech recognition wrote down, the
 * spike's real Scribe junk among them, and "again" / "slowly" from the phrase list.
 */

describe('the words of a turn', () => {
  it('reads numbers as words, without punctuation or case', () => {
    expect(numberWords(45)).toBe('forty five');
    expect(numberWords(9)).toBe('nine');
    expect(normalize('Forty-five!')).toBe('forty five');
    expect(normalize('45.')).toBe('forty five');
    expect(normalize('$2, please')).toBe('two please');
    expect(normalize('I’m Lan.')).toBe("i'm lan");
  });

  it('matches a card turn by its words, numbers and names included', () => {
    const bus = cardWords(['45', 'forty-five', 'forty five'], '');
    expect(matchesCard('Forty five.', bus)).toBe(true);
    expect(matchesCard('45', bus)).toBe(true);
    expect(matchesCard('Fifty.', bus)).toBe(false);
    const name = cardWords(["i'm", 'i am', 'my name', '{name}'], 'Lan');
    expect(matchesCard('Lan.', name)).toBe(true);
    expect(matchesCard('I am Lan', name)).toBe(true);
    // Whole words only: "this" holds "hi" but isn't it.
    expect(matchesCard('This.', cardWords(['hi'], ''))).toBe(false);
    // Without a name, `{name}` matches nothing.
    expect(cardWords(['{name}'], '')).toEqual([]);
  });

  it('reads the real Scribe junk as the words meant', () => {
    expect(matchesCard('US.', cardWords(['yes', 'no'], ''))).toBe(true);
    expect(matchesCard('Taron.', cardWords(['sorry', 'again', 'pardon'], ''))).toBe(true);
    expect(matchesCard('Tank you.', cardWords(['thank', 'thanks'], ''))).toBe(true);
    expect(matchesCard('Bai!', cardWords(['bye', 'see you'], ''))).toBe(true);
    expect(matchesCard('Copy, please.', cardWords(['tea', 'coffee'], ''))).toBe(true);
    expect(matchesCard('For tea five.', cardWords(['forty five'], ''))).toBe(true);
    expect(matchesCard('Hammer?', cardWords(['how much'], ''))).toBe(true);
    expect(matchesCard('Shoes.', cardWords(['books', 'clothes'], ''))).toBe(false);
  });

  it('hears again and slowly from the phrase list', () => {
    expect(againAsk('Sorry? Again, please.')).toBe('repeat');
    expect(againAsk('Sorry, again, please.')).toBe('repeat');
    expect(againAsk('Taron.')).toBe('repeat');
    expect(againAsk('Can you say that again?')).toBe('repeat');
    expect(againAsk('Slowly, please.')).toBe('slower');
    expect(againAsk('Too fast.')).toBe('slower');
    expect(againAsk('Sorry, I am late.')).toBeNull();
    expect(againAsk('Yes.')).toBeNull();
    expect(againAsk("What's wrong?")).toBeNull();
  });

  it('fills the name in a card, or leaves the gap', () => {
    expect(withName("I'm {name}.", 'Lan')).toBe("I'm Lan.");
    expect(withName("I'm {name}.", '')).toBe("I'm ….");
  });
});

describe("Jev's card question", () => {
  it("asks the spike's question with the cards and what was heard", () => {
    const request = cardRequest({ cards: ['Tea, please.', 'Coffee, please.'], said: 'T please.' });
    expect(request.state).toEqual({
      card_a: 'Tea, please.',
      card_b: 'Coffee, please.',
      learner_said: 'T please.',
    });
    expect(Object.keys(request.questions)).toEqual(['card']);
    const one = cardRequest({ cards: ['Bye!'], said: 'Buy.' });
    expect(one.state).not.toHaveProperty('card_b');
  });

  it('passes a card at p ≥ 0.75 only', () => {
    const answer = (a: number, b: number, neither: number) => ({
      answers: { card: { probabilities: { card_a: a, card_b: b, neither } } },
      usage: { input_tokens: 400 },
    });
    expect(parseCard(answer(0.1, 0.86, 0.04), true)).toMatchObject({ card: 1, inputTokens: 400 });
    expect(parseCard(answer(0.7, 0.1, 0.2), true)?.card).toBeNull();
    expect(parseCard({ answers: {} }, true)).toBeNull();
  });
});
