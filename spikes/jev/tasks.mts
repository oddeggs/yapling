/* Candidates 2, 3, 4, 5 and 6: the state, the Jev questions and the same question for Haiku. */
import type { Q } from './jev.mts';
import { answerOf, lastLineFor } from './context.mts';

export interface Task {
  state(c: any): unknown;
  questions(c: any): Record<string, Q>;
  /** The main choice question, mirrored for Haiku as one JSON label. */
  main: string;
}

const realWords: Q = {
  type: 'choice',
  instructions:
    'learner_said is what English speech recognition wrote down when a Vietnamese learner of English spoke, or did not, during a practice call. What did the learner most likely do?',
  criteria: {
    english: "Tried to say something in English, however short, broken or misheard: 'I am teacher', 'yes', 'ok', a number, or English words that came out garbled.",
    vietnamese: 'Spoke Vietnamese: Vietnamese words, with or without accent marks.',
    noise: 'Said nothing real: empty text, only hesitation sounds (uh, um, ờ, hmm), a sound tag such as (coughs) or [noise], or a stray word speech recognition invents from background noise.',
  },
};

const again: Q = {
  type: 'choice',
  instructions:
    'A learner of English just heard last_line in a practice call. learner_said is what they said back (from speech recognition; it may be Vietnamese). Are they asking to hear last_line again?',
  criteria: {
    repeat: "They ask to hear it again: sorry?, pardon?, excuse me?, again please, can you repeat, what did you say, say that again, one more time, or the same in Vietnamese (nói lại).",
    slower: 'They ask for it slower, or say it was too fast: slowly please, too fast, speak slower, or the same in Vietnamese (chậm thôi, nhanh quá).',
    neither: "Anything else: an answer, a question about what a word means, 'I don't know', or a 'sorry' that is not asking to hear it again (sorry, I'm late).",
  },
};

const card = (two: boolean): Q => ({
  type: 'choice',
  instructions: two
    ? 'A beginner learner of English was shown two cards, card_a and card_b, and asked to read one aloud. learner_said is what speech recognition heard; accented speech is often written down as similar-sounding words. Which card did they most likely say?'
    : 'A beginner learner of English was shown card_a and asked to read it aloud. learner_said is what speech recognition heard; accented speech is often written down as similar-sounding words. Did they most likely say the card?',
  criteria: {
    card_a: 'They said card_a, even if speech recognition misheard it as similar-sounding words.',
    ...(two ? { card_b: 'They said card_b, even if speech recognition misheard it as similar-sounding words.' } : {}),
    neither: 'They said something else: other English words, Vietnamese, or a different number or word.',
  },
});

/** Scootch's care and preparation questions, re-aimed at a learner speaking in a practice call. */
const care: Q = {
  type: 'choice',
  instructions:
    "learner_said is what a Vietnamese learner of English said in a spoken English practice call with an AI character, in broken English or Vietnamese. Which kind of thing did they say? Judge the real meaning, not single words: exaggerated everyday idioms about being hungry, busy, tired or annoyed are ordinary, and so is a story, a film or someone else's death. Crisis is about the learner's own safety.",
  criteria: {
    ordinary: 'Ordinary talk or an everyday worry. Includes dark idioms with no real danger (dying of hunger, my boss will kill me, killing time), films and stories, and sad news about others.',
    heavy: 'A heavy personal matter, such as a death in the family, serious illness, failing, money trouble or feeling very sad, with no sign the learner may be harmed.',
    crisis: 'The learner may be in danger: wanting to die or to harm themselves, stated directly or hinted at (saying goodbye, giving belongings away, not being here soon, being a burden, a method or a place to do it), or being hurt or threatened by someone at home.',
  },
};
const preparation: Q = {
  type: 'noul',
  instructions:
    "learner_said is what a Vietnamese learner of English said in a spoken practice call, often in broken English or Vietnamese. Could the learner be planning or preparing to end their life or seriously harm themselves? Look for indirect signs as well as plain words: a place, time or means chosen to be alone, such as a bridge, a rooftop or water at night; giving belongings or pets away for good; saying goodbye or that this is the last time; saying they will soon not be here. A sign counts unless learner_said gives it an ordinary reason (a trip, a move, a story, a game, a swim).",
  criteria: {
    true: 'At least one sign of planning or preparing to end their own life or harm themselves, stated or indirect, with no ordinary reason given.',
    false: 'No such sign, or each one has an ordinary reason in learner_said.',
  },
};

const placementScore: Q = {
  type: 'score',
  instructions:
    "A Vietnamese learner of English answered character_question in a one-minute placement chat. learner_said is what speech recognition heard. How well does learner_said answer character_question, in English?",
  criteria: [
    "No usable answer: silence, Vietnamese, 'I don't know', a greeting, a question back, garbled words, or something that does not answer the question.",
    "One English word or a short fragment that answers it ('Teacher.', 'Sleep.', 'Speaking.').",
    "A simple phrase or sentence that answers it, errors are fine ('I am teacher.', 'I like listen music.').",
    'Two or more connected sentences, or one with real detail, that answer it.',
  ],
};

export const TASKS: Record<string, Task> = {
  c2: { main: 'kind', state: (c) => ({ learner_said: c.said }), questions: () => ({ kind: realWords }) },
  c3: { main: 'ask', state: (c) => ({ last_line: c.line, learner_said: c.said }), questions: () => ({ ask: again }) },
  c4: {
    main: 'card',
    state: (c) => (c.cardB ? { card_a: c.cardA, card_b: c.cardB, learner_said: c.said } : { card_a: c.cardA, learner_said: c.said }),
    questions: (c) => ({ card: card(!!c.cardB) }),
  },
  c5: { main: 'care', state: (c) => ({ learner_said: c.said }), questions: () => ({ care, preparation }) },
  c6: {
    main: 'level',
    state: (c) => ({ character_question: lastLineFor(c.beat).replace(/^Pip: /, ''), learner_said: c.said }),
    questions: () => ({ level: placementScore }),
  },
};
export { answerOf };
