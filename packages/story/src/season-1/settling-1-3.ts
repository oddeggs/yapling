import { learner, rec, scene, ui } from '../build';
import { okayFor, praiseFor } from './shared-lines';
import { AGAIN_WORDS, card, SLOWLY_WORDS, THANKS, visitorCards, YES_NO } from './visitor';

/*
 * Settling in, Chapters 1–3, line for line from the script of record (`docs/season-1-script.md`,
 * "Settling in"): Linh at the door, the boxes, and the two lifesavers. Linh speaks Vietnamese only
 * at the start of a new kind of task.
 */

const thankYou = card('Thank you!', 'Cảm ơn!');

export const S1_SET1 = scene({
  id: 's1-set1',
  kind: 'settling',
  title: 'Hello',
  place: 'burrow',
  cast: ['linh', 'pip'],
  summary:
    'Evening of day one. Linh, the pangolin next door, who came from Vietnam years ago, knocks to welcome the learner and Pip. She says each line first and the learner says it after her.',
  goal: 'Say hello and your name.',
  canDos: ['say-hello-and-your-name'],
  phrases: ['nice-to-meet-you'],
  beats: [
    ui('knock', { type: 'knock' }),
    rec('linh-hi', 's1-set1-01'),
    rec('linh-explains', 's1-set1-02'),
    learner(
      'say-hi',
      // Pip copies the learner straight after: no praise line.
      visitorCards({
        listener: 'linh',
        choices: [card('Hi!', 'Chào!')],
        accept: ['hi', 'hello', 'hey'],
        model: 's1-set1-01',
        canDo: 'say-hello-and-your-name',
        praise: [],
      }),
    ),
    rec('pip-copies', 's1-set1-03'),
    rec('and-you', 's1-set1-04'),
    learner(
      'say-name',
      visitorCards({
        listener: 'linh',
        choices: [card("I'm {name}.", 'Mình là {name}.')],
        accept: ["i'm", 'i am', 'my name', '{name}'],
        model: 's1-set1-04',
        canDo: 'say-hello-and-your-name',
      }),
    ),
    rec('nice-to-meet', 's1-set1-05'),
    learner(
      'say-nice',
      visitorCards({
        listener: 'linh',
        choices: [card('Nice to meet you, too.', 'Mình cũng rất vui được gặp bạn.')],
        accept: ['nice', 'meet'],
        model: 's1-set1-05',
        phrases: ['nice-to-meet-you'],
        canDo: 'say-hello-and-your-name',
      }),
    ),
    rec('pip-nice', 's1-set1-06'),
    rec('linh-bye', 's1-set1-07'),
    learner(
      'say-bye',
      visitorCards({
        listener: 'linh',
        choices: [card('Bye!', 'Tạm biệt!')],
        accept: ['bye', 'see you'],
        model: 's1-set1-07',
      }),
    ),
    rec('linh-proud', 's1-set1-08'),
  ],
});

export const S1_SET2 = scene({
  id: 's1-set2',
  kind: 'settling',
  title: 'Boxes',
  place: 'burrow',
  cast: ['linh', 'pip'],
  summary:
    'The day-one burrow, full of boxes. Linh helps the learner and Pip unpack: she asks short questions, and the learner picks a card and reads it aloud.',
  goal: 'Answer yes or no politely.',
  canDos: ['answer-yes-or-no-politely'],
  phrases: ['yes-please'],
  beats: [
    rec('pip-boxes', 's1-set2-01'),
    rec('linh-explains', 's1-set2-02'),
    rec('your-box', 's1-set2-03'),
    learner(
      'yes-or-no',
      // Linh's "Okay!" follows as a line of its own.
      visitorCards({
        listener: 'linh',
        choices: [card('Yes.', 'Có.'), card('No.', 'Không.')],
        accept: YES_NO,
        canDo: 'answer-yes-or-no-politely',
        praise: [],
      }),
    ),
    rec('linh-okay', 's1-set-linh-okay'),
    rec('books-or-clothes', 's1-set2-04'),
    learner(
      'books-or-clothes-answer',
      visitorCards({
        listener: 'linh',
        choices: [card('Books.', 'Sách.'), card('Clothes.', 'Quần áo.')],
        accept: ['books', 'book', 'clothes', 'clothing'],
        praise: okayFor('linh'),
      }),
    ),
    rec('pip-tea', 's1-set2-05'),
    learner(
      'tea-for-you',
      visitorCards({
        listener: 'pip',
        choices: [
          card('Yes, please.', 'Có, cảm ơn nhé.'),
          card('No, thank you.', 'Thôi, cảm ơn nhé.'),
        ],
        accept: ['yes', 'please', 'no', ...THANKS],
        phrases: ['yes-please'],
        canDo: 'answer-yes-or-no-politely',
      }),
    ),
    rec('gift', 's1-set2-06'),
    learner(
      'thank-linh',
      // Linh answers "You're welcome!" next.
      visitorCards({ listener: 'linh', choices: [thankYou], accept: THANKS, praise: [] }),
    ),
    rec('welcome', 's1-set2-07'),
    rec('box-done', 's1-set2-08'),
  ],
});

export const S1_SET3 = scene({
  id: 's1-set3',
  kind: 'settling',
  title: 'Again, please',
  place: 'burrow',
  cast: ['linh', 'pip'],
  summary:
    'In the burrow, Linh teaches two lifesavers: "Sorry? Again, please." and "Slowly, please." Then Pip talks too fast on purpose, and the learner uses them.',
  goal: 'Ask someone to say it again or slower.',
  canDos: ['ask-again-or-slower'],
  phrases: ['sorry-again-please', 'slowly-please'],
  beats: [
    rec('linh-explains', 's1-set3-01'),
    rec('model-again', 's1-set3-02'),
    learner(
      'say-again',
      // Saying it is the answer here, not a request to hear the line again.
      visitorCards({
        listener: 'linh',
        choices: [card('Sorry? Again, please.', 'Xin lỗi? Nói lại giúp mình nhé.')],
        accept: AGAIN_WORDS,
        model: 's1-set3-02',
        onReplay: 'pass',
        phrases: ['sorry-again-please'],
        canDo: 'ask-again-or-slower',
      }),
    ),
    rec('model-slowly', 's1-set3-03'),
    learner(
      'say-slowly',
      visitorCards({
        listener: 'linh',
        choices: [card('Slowly, please.', 'Nói chậm giúp mình nhé.')],
        accept: SLOWLY_WORDS,
        model: 's1-set3-03',
        onReplay: 'pass',
        phrases: ['slowly-please'],
        canDo: 'ask-again-or-slower',
      }),
    ),
    rec('pip-fast', 's1-set3-04'),
    learner(
      'use-a-lifesaver',
      // Asking works: Pip says it again, slower, and that is the turn.
      visitorCards({
        listener: 'pip',
        choices: [
          card('Sorry? Again, please.', 'Xin lỗi? Nói lại giúp mình nhé.'),
          card('Slowly, please.', 'Nói chậm giúp mình nhé.'),
        ],
        accept: [...AGAIN_WORDS, ...SLOWLY_WORDS],
        onReplay: 'replay_and_pass',
        phrases: ['sorry-again-please', 'slowly-please'],
        canDo: 'ask-again-or-slower',
        praise: [],
      }),
    ),
    rec('pip-slow', 's1-set3-05'),
    rec('it-works', 's1-set3-06'),
    learner(
      'thank-linh',
      visitorCards({
        listener: 'linh',
        choices: [thankYou],
        accept: THANKS,
        praise: praiseFor('linh'),
      }),
    ),
    rec('linh-bye', 's1-set3-07'),
  ],
});
