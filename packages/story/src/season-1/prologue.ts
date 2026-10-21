import { answer, gen, learner, rec, scene, ui } from '../build';
import { glossed, viDesign, viDraft } from '../gloss';

/*
 * Day one in the burrow. The unpacking chat is the one-minute placement: Pip opens a box per
 * question about the learner's job and day. Answers are measured, not corrected (no targets yet).
 */

const pipAnswer = (expects: string, hint: ReturnType<typeof glossed>) =>
  answer({
    listener: 'pip',
    expects,
    onTargetError: 'accept',
    hint,
    maxTries: 2,
    fallback: {
      speaker: 'pip',
      intent:
        "Say that's okay, no rush, you can tell me later. Then open the next box. Light and cheerful.",
    },
  });

export const PROLOGUE_UNPACK = scene({
  id: 's1-pro-unpack',
  kind: 'placement',
  title: 'Help me unpack',
  place: 'burrow',
  cast: ['pip'],
  summary:
    "Day one in the learner's new burrow. Boxes everywhere. Pip and the learner unpack the last boxes together; each box is a question about the learner.",
  goal: 'Answer a few simple questions about your job and your day.',
  beats: [
    rec('intro', 's1-pro-01'),
    gen(
      'ask-work',
      'pip',
      'Open a box labelled WORK and ask what the learner does for work. One short question.',
      {
        example: 'Ooh, this box says WORK. What do you do for work?',
        answer: pipAnswer(
          'Says what their job is, in any words.',
          glossed("I'm a … at …", viDesign('Tôi là … ở …')),
        ),
      },
    ),
    gen(
      'ask-day',
      'pip',
      "React to the learner's job in a few delighted words, then ask what a normal day is like for them.",
      {
        example: "A data analyst! What's a normal day like for you?",
        answer: pipAnswer(
          'Describes part of a normal day.',
          glossed('In the morning, I …', viDesign('Buổi sáng, tôi …')),
        ),
      },
    ),
    gen(
      'ask-free-time',
      'pip',
      'Open a box of snacks and games. Ask what the learner likes to do after work.',
      {
        example: 'This box is all snacks and games. What do you like to do after work?',
        answer: pipAnswer(
          'Says something they like doing.',
          glossed('After work, I like …', viDraft('Sau giờ làm, tôi thích …')),
        ),
      },
    ),
    gen('ask-goal', 'pip', 'Last box. Ask what the learner wants to get better at, in English.', {
      example: 'Last box! What do you want to get better at, in English?',
      answer: pipAnswer(
        'Says what they want to improve.',
        glossed('I want to …', viDesign('Tôi muốn …')),
      ),
    }),
    rec('outro', 's1-pro-02'),
  ],
});

export const PROLOGUE_KNOCK = scene({
  id: 's1-pro-knock',
  kind: 'placement',
  title: 'A knock at the door',
  place: 'burrow',
  cast: ['linh', 'pip'],
  summary:
    'Evening of day one. Linh from next door knocks to welcome the learner and invites them to the café.',
  goal: 'Greet a new neighbour.',
  beats: [
    ui('knock', { type: 'knock' }),
    rec('welcome', 's1-pro-03'),
    learner(
      'greet-linh',
      answer({
        listener: 'linh',
        expects: 'Greets Linh or thanks her (Nice to meet you, thanks).',
        onTargetError: 'accept',
        hint: glossed('Nice to meet you!', viDesign('Rất vui được gặp bạn!')),
        maxTries: 2,
        fallback: {
          speaker: 'linh',
          intent: 'Smile it off kindly: no need to say anything. See them at the café soon.',
          to: 'dusk',
        },
      }),
    ),
    gen('linh-bye', 'linh', 'Say a warm goodbye in one short sentence: see you at the café.', {
      example: 'Nice to meet you too! See you at the café.',
    }),
    ui('dusk', { type: 'dusk_letter' }),
  ],
});
