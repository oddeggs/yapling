import { gen, learner, rec, scene, ui } from '../build';
import { okayFor, praiseFor } from './shared-lines';
import { AGAIN_WORDS, card, SLOWLY_WORDS, task, THANKS, visitorCards } from './visitor';

/*
 * Settling in, Chapters 4–6, line for line from the script of record (`docs/season-1-script.md`,
 * "Settling in"): Bus 45 with Bea, Mei's café before her bad news, and Pip's page about the
 * learner, which ends with the letter under the café door.
 */

const thankYou = card('Thank you!', 'Cảm ơn!');

/** A Visitor-row live line: short, warm, built only from the learner's own words. */
const SHORT = 'Six words at most. Simple, slow English.';

export const S1_SET4 = scene({
  id: 's1-set4',
  kind: 'settling',
  title: 'Bus 45',
  place: 'bus-45',
  cast: ['linh', 'bea'],
  summary:
    'At the bus stop with Linh. Bea drives Bus 45. The learner listens for a number, a time and a price, and buys two tickets.',
  goal: 'Understand a number, a time and a price.',
  canDos: ['understand-number-time-price'],
  beats: [
    rec('bus-stop', 's1-set4-01'),
    rec('bea-morning', 's1-set4-02'),
    rec('which-bus', 's1-set4-03'),
    learner(
      'which-bus-answer',
      // Fifty is an English miss: "Again?" and Linh's question once more.
      visitorCards({
        listener: 'linh',
        choices: [card('Forty-five.', 'Bốn mươi lăm.'), card('Fifty.', 'Năm mươi.')],
        accept: ['45', 'forty-five', 'forty five'],
        recast: 'Forty-five.',
        canDo: 'understand-number-time-price',
        task: task(
          'Listen for the number, then pick a card and read it aloud.',
          'Nghe số, rồi chọn thẻ và đọc to.',
        ),
      }),
    ),
    rec('bea-nine', 's1-set4-04'),
    rec('what-time', 's1-set4-05'),
    learner(
      'what-time-answer',
      visitorCards({
        listener: 'linh',
        choices: [card('Nine.', 'Chín giờ.'), card('Ten.', 'Mười giờ.')],
        accept: ['9', 'nine'],
        recast: 'Nine.',
        canDo: 'understand-number-time-price',
      }),
    ),
    // Bea's normal pace, on purpose.
    rec('bea-tickets', 's1-set4-06'),
    learner(
      'tickets-price',
      // Both cards pass; asking again has Bea say it once more, slower.
      visitorCards({
        listener: 'bea',
        choices: [
          card('Sorry? Again, please.', 'Xin lỗi? Nói lại giúp mình nhé.'),
          card('Two dollars.', 'Hai đô.'),
        ],
        accept: [...AGAIN_WORDS, ...SLOWLY_WORDS, 'two', '2', 'dollars', 'dollar'],
        onReplay: 'replay_and_pass',
        phrases: ['sorry-again-please'],
        canDo: 'understand-number-time-price',
        praise: praiseFor('bea'),
      }),
    ),
    rec('how-many', 's1-set4-07'),
    learner(
      'how-many-answer',
      visitorCards({
        listener: 'linh',
        choices: [card('Two, please.', 'Hai vé nhé.'), card('One, please.', 'Một vé nhé.')],
        accept: ['two', '2', 'one', '1'],
        canDo: 'understand-number-time-price',
        praise: okayFor('linh'),
      }),
    ),
    rec('here-you-go', 's1-set4-08'),
    learner(
      'thank-bea',
      // Bea's next line starts with "Lovely!": her "Right!" instead of praise.
      visitorCards({
        listener: 'bea',
        choices: [thankYou],
        accept: THANKS,
        praise: okayFor('bea'),
      }),
    ),
    rec('nice-day', 's1-set4-09'),
  ],
});

export const S1_SET5 = scene({
  id: 's1-set5',
  kind: 'settling',
  title: "Mei's café",
  place: 'lantern-cafe',
  cast: ['mei', 'pip'],
  summary:
    "The Lantern Café, before Mei's bad news. Mei welcomes the learner and Pip; the learner orders, asks the price and pays. Mei looks tired.",
  goal: 'Order one thing.',
  canDos: ['order-one-thing'],
  phrases: ['yes-please', 'how-much'],
  beats: [
    rec('welcome', 's1-set5-01'),
    learner(
      'say-hi',
      visitorCards({
        listener: 'mei',
        choices: [card('Hi!', 'Chào!'), card('Hello!', 'Xin chào!')],
        accept: ['hi', 'hello', 'hey'],
      }),
    ),
    rec('tea-or-coffee', 's1-set5-02'),
    learner(
      'order-drink',
      visitorCards({
        listener: 'mei',
        choices: [
          card('Tea, please.', 'Cho mình trà nhé.'),
          card('Coffee, please.', 'Cho mình cà phê nhé.'),
        ],
        accept: ['tea', 'coffee'],
        canDo: 'order-one-thing',
        praise: okayFor('mei'),
        task: task(
          'Pick something on a card and read it aloud.',
          'Chọn món trên thẻ rồi đọc to nhé.',
        ),
      }),
    ),
    rec('kaya-toast', 's1-set5-03'),
    learner(
      'toast-too',
      visitorCards({
        listener: 'mei',
        choices: [
          card('Yes, please.', 'Có, cảm ơn nhé.'),
          card('No, thank you.', 'Thôi, cảm ơn nhé.'),
        ],
        accept: ['yes', 'please', 'no', ...THANKS],
        phrases: ['yes-please'],
        canDo: 'order-one-thing',
        praise: okayFor('mei'),
      }),
    ),
    rec('pip-whispers', 's1-set5-04'),
    learner(
      'how-much',
      // Mei answers with the price: no praise on top.
      visitorCards({
        listener: 'mei',
        choices: [card('How much?', 'Bao nhiêu tiền?')],
        accept: ['how much', 'much'],
        model: 's1-set5-04',
        phrases: ['how-much'],
        canDo: 'order-one-thing',
        praise: [],
      }),
    ),
    rec('price', 's1-set5-05'),
    learner(
      'pay',
      // Mei thanks the learner next.
      visitorCards({
        listener: 'mei',
        choices: [card('Here you go.', 'Đây, gửi bạn.'), thankYou],
        accept: ['here', 'go', ...THANKS],
        praise: [],
      }),
    ),
    rec('thanks-lah', 's1-set5-06'),
    rec('back-to-work', 's1-set5-07'),
    rec('pip-tired', 's1-set5-08'),
  ],
});

/** Words that pass "I'm a … / I work …": the frames and common jobs. */
const JOB_WORDS = [
  "i'm a",
  'i am a',
  "i'm an",
  'i am an',
  'i work',
  'student',
  'office',
  'teacher',
  'engineer',
  'nurse',
  'doctor',
  'driver',
  'cook',
  'chef',
  'designer',
  'developer',
  'accountant',
  'manager',
  'analyst',
  'sales',
  'shop',
  'worker',
  'job',
] as const;

export const S1_SET6 = scene({
  id: 's1-set6',
  kind: 'settling',
  title: 'About me',
  place: 'burrow',
  cast: ['pip', 'linh'],
  summary:
    'The burrow at dusk. Pip writes a page about the learner in its notebook: where they are from, what they do and what they like. Then a letter arrives under the café door.',
  goal: "Say where you're from and what you do.",
  canDos: ['say-where-youre-from-and-what-you-do'],
  phrases: ['im-from'],
  beats: [
    rec('pip-page', 's1-set6-01'),
    rec('linh-from', 's1-set6-02'),
    learner(
      'say-from',
      // Pip's delighted repeat is the reaction: no praise on top.
      visitorCards({
        listener: 'linh',
        choices: [
          card("I'm from …", 'Mình đến từ …'),
          card("I'm from Vietnam.", 'Mình đến từ Việt Nam.'),
        ],
        accept: ['from'],
        expects: 'Says where they are from ("I\'m from …"); their own town is welcome.',
        phrases: ['im-from'],
        canDo: 'say-where-youre-from-and-what-you-do',
        praise: [],
        task: task(
          'Talk about you: pick a card, or say it in your own words.',
          'Nói về bạn: chọn thẻ, hoặc nói bằng từ của bạn.',
        ),
      }),
    ),
    gen(
      'pip-writes-place',
      'pip',
      'Repeat where the learner is from, delighted, and say you are writing it down.',
      {
        constraints: [
          SHORT,
          'Use only the place the learner said; if they said none, just say you are writing it down.',
        ],
        example: 'From Hanoi! Writing it down.',
      },
    ),
    rec('linh-work', 's1-set6-03'),
    learner(
      'say-job',
      visitorCards({
        listener: 'linh',
        choices: [
          card("I'm a student.", 'Mình là sinh viên.'),
          card('I work in an office.', 'Mình làm văn phòng.'),
        ],
        accept: JOB_WORDS,
        expects: 'Says what they do ("I\'m a …", "I work …"), any job.',
        canDo: 'say-where-youre-from-and-what-you-do',
        praise: [],
      }),
    ),
    gen('pip-writes-job', 'pip', "Repeat the learner's job, impressed.", {
      constraints: [
        SHORT,
        'Use only the job the learner said; if none, say "Wow! Writing it down."',
      ],
      example: 'A teacher! Wow!',
    }),
    rec('pip-likes', 's1-set6-04'),
    learner(
      'say-like',
      visitorCards({
        listener: 'pip',
        choices: [
          card('I like coffee.', 'Mình thích cà phê.'),
          card('I like music.', 'Mình thích âm nhạc.'),
        ],
        accept: ['like'],
        praise: [],
      }),
    ),
    gen(
      'pip-reads-page',
      'pip',
      "Read your notebook page back in three short bits: the learner's name, where they are from, what they like.",
      {
        constraints: [
          'Three short sentences, each six words at most.',
          'Only what the learner said in this call; leave out anything they did not say.',
        ],
        example: 'Page one. Lan. From Hanoi. Likes coffee!',
      },
    ),
    rec('linh-ready', 's1-set6-05'),
    ui('dusk', { type: 'dusk_letter' }),
    rec('pip-letter', 's1-set6-06'),
  ],
});
