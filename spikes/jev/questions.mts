/* The Jev questions under test, one place. Wording v1 is written before any results. */
import type { Q } from './jev.mts';

export const OUTCOME_CRITERIA_V1 = {
  fine: 'It does what hoped_for describes, in English, in any words: broken grammar, missing words, a single word or a small speech-recognition slip are fine.',
  unclear: "They say they don't know or don't understand, ask to hear it again or slower, answer in Vietnamese, only say hello, or the words make no sense as a reply (garbled speech recognition).",
  question: 'They ask the character a question, or talk about something near the topic, instead of doing what hoped_for describes.',
  off_topic: 'They talk about something unrelated to the conversation.',
  silent: 'Nothing usable: empty, or only hesitation sounds such as um or uh.',
} as const;

const OUTCOME_INSTRUCTIONS_V1 =
  "An English learner whose first language is Vietnamese is in a spoken role-play. learner_said is what speech recognition heard them say right after last_line. hoped_for is what we hoped their reply would do. Which best describes learner_said? A hello, a question back or another topic is not 'fine' unless hoped_for asks for it.";

const reorder = (c: Record<string, string>, keys: string[]) => Object.fromEntries(keys.map((k) => [k, c[k]!]));

export const outcomeV1: Q = { type: 'choice', instructions: OUTCOME_INSTRUCTIONS_V1, criteria: { ...OUTCOME_CRITERIA_V1 } };
/** The same options with fine last, to check Jev's lean toward the first option. */
export const outcomeV1r: Q = {
  type: 'choice',
  instructions: OUTCOME_INSTRUCTIONS_V1,
  criteria: reorder(OUTCOME_CRITERIA_V1, ['silent', 'off_topic', 'question', 'unclear', 'fine']),
};
export const hopedV1: Q = {
  type: 'noul',
  instructions:
    'Does learner_said do what hoped_for describes, in English? Any words count: broken grammar, a single word or a small speech-recognition slip are fine. A hello, a question back, Vietnamese, "I don\'t know" or garbled words do not.',
};
export const targetQ = (description: string): Q => ({
  type: 'noul',
  instructions: `Does learner_said make this English mistake: ${description}?`,
  criteria: { true: `It makes this mistake at least once: ${description}.`, false: 'It does not make this mistake (other mistakes do not count).' },
});

/*
 * v2, after reading v1's misses on the main set: doing part of the hoped-for thing counts, a greeting or
 * a question around it doesn't spoil it, and the 'question' option is a question about something else.
 */
export const OUTCOME_CRITERIA_V2 = {
  fine: 'It does what hoped_for describes, or part of it, in English, in any words: broken grammar, missing words, a single word, a greeting or question around it, or a small speech-recognition slip (a wrong name or place) are fine.',
  unclear: "They say they don't know or don't understand, ask to hear it again or slower, answer in Vietnamese, only say hello, or the words make no sense as a reply (garbled speech recognition).",
  question: 'They ask the character about something else, or talk near the topic, instead of doing what hoped_for describes.',
  off_topic: 'They talk about something unrelated to the conversation.',
  silent: 'Nothing usable: empty, or only hesitation sounds such as um or uh.',
} as const;
export const outcomeV2: Q = { type: 'choice', instructions: OUTCOME_INSTRUCTIONS_V1, criteria: { ...OUTCOME_CRITERIA_V2 } };
export const outcomeV2r: Q = {
  type: 'choice',
  instructions: OUTCOME_INSTRUCTIONS_V1,
  criteria: reorder(OUTCOME_CRITERIA_V2, ['silent', 'off_topic', 'question', 'unclear', 'fine']),
};
export const hopedV2: Q = {
  type: 'noul',
  instructions:
    'Does learner_said do what hoped_for describes, or part of it, in English? Any words count: broken grammar, a single word, a greeting around it or a small speech-recognition slip are fine. A hello alone, a question about something else, Vietnamese, "I don\'t know" or garbled words do not.',
};

/** Speech recognition junk: English words that make no sense together as a reply. */
export const garbledV1: Q = {
  type: 'noul',
  instructions:
    'learner_said comes from speech recognition of a Vietnamese learner speaking English. Is it garbled: English words that make no sense together as a reply to last_line (speech recognition mishearing), rather than a reply a person could mean, however broken or short?',
  criteria: {
    true: 'Garbled: the words do not fit together or do not fit the conversation, as when speech recognition mishears accented speech.',
    false: 'A reply a person could mean, even with broken grammar, missing words, one word, a question back, another topic, or Vietnamese.',
  },
};
