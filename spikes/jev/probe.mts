import { ask } from './jev.mts';
const r = await ask(
  { character_question: "What do you do for work?", learner_said: "I am teacher, at school" },
  {
    outcome: { type: 'choice', instructions: 'Does the learner answer the question?', criteria: { answers: 'They answer it.', other: 'They do not.' } },
    english: { type: 'noul', instructions: 'Is learner_said in English?' },
    level: { type: 'score', instructions: 'How fluent is learner_said?', criteria: ['Single words', 'Broken sentence', 'Full simple sentence', 'Fluent'] },
  },
);
console.log(JSON.stringify(r, null, 1));
