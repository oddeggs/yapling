import { answer, cards, gen, learner, rec, scene, ui } from '../build';
import { glossed, viDesign, viDraft } from '../gloss';
import { card, YES_NO } from './visitor';

/*
 * Day one in the burrow. The unpacking chat is the one-minute placement, a ladder: a closed
 * warm-up box with Yes / No cards (not scored), then three open boxes about the learner's work,
 * after work and what they want to get better at. The placement rule counts the open boxes that
 * got a fine answer (`placementStage` in the learning model). If the first two both miss, Pip
 * skips the last one, so nobody meets three misses in a row. Answers are measured, never
 * corrected (no targets yet). A box missed is one that ran out of tries or was skipped.
 */

/** An open box: where a fine answer goes, and where a miss (tries run out, or skipped) goes. */
const pipAnswer = (
  expects: string,
  hint: ReturnType<typeof glossed>,
  to: { readonly fine?: string; readonly miss: string },
) =>
  answer({
    listener: 'pip',
    expects,
    onTargetError: 'accept',
    hint,
    maxTries: 2,
    fallback: {
      speaker: 'pip',
      intent:
        'Tell the learner kindly that it does not matter and there is no rush: they can tell you another time. Move on to the next box, light and cheerful.',
      to: to.miss,
    },
    ...(to.fine === undefined ? {} : { fine: to.fine }),
  });

const FREE_TIME_HINT = glossed('After work, I like …', viDraft('Sau giờ làm, tôi thích …'));

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
      'warm-up',
      'pip',
      'Pick up a heavy box and ask the learner if it is theirs. One short question.',
      {
        example: 'Oof, this box is heavy! Is it yours?',
        answer: cards({
          listener: 'pip',
          choices: [card('Yes.', 'Có.'), card('No.', 'Không.')],
          accept: [...YES_NO, 'mine'],
          expects: 'Says yes or no.',
          scored: false,
        }),
      },
    ),
    gen(
      'ask-work',
      'pip',
      'Open a box labelled WORK and ask what the learner does for work. One short question.',
      {
        example: 'Ooh, this box says WORK. What do you do for work?',
        answer: pipAnswer(
          'Says what their job is, in any words.',
          glossed("I'm a … at …", viDesign('Tôi là … ở …')),
          { miss: 'ask-free-time-after-miss' },
        ),
      },
    ),
    gen(
      'ask-free-time',
      'pip',
      "React to the learner's job in a few delighted words. Then open a box of snacks and games and ask what they like to do after work.",
      {
        example:
          'A data analyst! This box is all snacks and games. What do you like to do after work?',
        answer: pipAnswer('Says something they like doing.', FREE_TIME_HINT, {
          fine: 'ask-goal',
          miss: 'ask-goal',
        }),
      },
    ),
    gen(
      'ask-free-time-after-miss',
      'pip',
      'Open a box of snacks and games. Ask what the learner likes to do after work.',
      {
        example: 'This box is all snacks and games. What do you like to do after work?',
        // Two open boxes missed: the last one waits for another day.
        answer: pipAnswer('Says something they like doing.', FREE_TIME_HINT, {
          fine: 'ask-goal',
          miss: 'rest',
        }),
      },
    ),
    gen('ask-goal', 'pip', 'Last box. Ask what the learner wants to get better at, in English.', {
      example: 'Last box! What do you want to get better at, in English?',
      answer: pipAnswer(
        'Says what they want to improve.',
        glossed('I want to …', viDesign('Tôi muốn …')),
        {
          fine: 'outro',
          miss: 'outro',
        },
      ),
    }),
    gen(
      'rest',
      'pip',
      'Say the boxes are heavy and you both need a rest. Cheerful, one short line.',
      {
        constraints: ['Do not ask anything.'],
        example: "Phew! Heavy boxes. Let's rest!",
      },
    ),
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
