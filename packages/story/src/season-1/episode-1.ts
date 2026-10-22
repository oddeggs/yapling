import { answer, gen, learner, rec, scene, ui } from '../build';
import { glossed, viDesign, viDraft } from '../gloss';
import type { Letter } from '../types';
import { card, task, visitorCards } from './visitor';

const V = { maxStage: 'visitor' } as const;
const N = { minStage: 'newcomer' } as const;

/*
 * Episode 1, "The Letter", the episode call at the Lantern Café, step by step from the script.
 * Recorded lines carry the story; generated slots let the learner speak, and each one resolves
 * the same way whatever is said (Mei shows the letter, the office offers a Friday meeting).
 * Visitors play the same scene with card turns in place of the hard ones (`season-1-script.md`,
 * "Week 1 for Visitors"): Mei doesn't deflect, Pip and Mei ask in shorter recorded lines, and the
 * learner reads one of two cards.
 */

export const S1_E1_LETTER: Letter = {
  id: 's1-e1-letter',
  lines: [
    { ...glossed('Dear Ms Mei,', viDraft('Kính gửi cô Mei,')), seed: null },
    {
      ...glossed(
        'From next month, the rent for 12 Harbour Lane will be 2× the current rent.',
        viDraft('Từ tháng sau, tiền thuê nhà số 12 Harbour Lane sẽ gấp đôi hiện tại.'),
      ),
      seed: glossed('rent', viDraft('tiền thuê')),
    },
    {
      ...glossed('Please reply by Friday.', viDraft('Vui lòng trả lời trước thứ Sáu.')),
      seed: glossed('by Friday', viDraft('trước thứ Sáu')),
    },
    {
      ...glossed('— Harbour Property Office', viDraft('— Văn phòng Bất động sản Harbour')),
      seed: null,
    },
  ],
};

const askAgain = (fallbackTo: string) =>
  answer({
    listener: 'mei',
    expects: 'Asks again kindly, or offers help.',
    phrases: ['whats-wrong', 'can-i-help'],
    canDo: 'ask-whats-wrong',
    hint: glossed('Can I help?', viDesign('Mình giúp được không?')),
    fallback: {
      speaker: 'mei',
      intent: "Sigh, give in and say it's this letter. Hand it over. One short line.",
      to: fallbackTo,
    },
  });

export const S1_E1_CALL = scene({
  id: 's1-e1',
  kind: 'episode',
  title: 'The Letter',
  place: 'lantern-cafe',
  cast: ['mei', 'pip', 'office'],
  summary:
    "At the Lantern Café. A letter says Mei's rent will double from next month. The learner and Pip help her read it, call the property office, and decide what to do.",
  goal: "Ask Mei what's wrong and offer help; introduce yourself on the phone; give one piece of advice.",
  canDos: ['ask-whats-wrong', 'introduce-yourself-30s'],
  phrases: ['whats-wrong', 'i-need-a-plan', 'can-i-help', 'i-think-you-should'],
  beats: [
    // 1. Open
    rec('open', 's1-e1-02'),
    // 2. Notice
    rec('notice', 's1-e1-03'),
    learner(
      'ask-whats-wrong',
      answer({
        listener: 'mei',
        expects: "Asks Mei what's wrong.",
        phrases: ['whats-wrong'],
        canDo: 'ask-whats-wrong',
        hint: glossed("What's wrong?", viDesign('Có chuyện gì vậy?')),
        fallback: {
          speaker: 'pip',
          intent: 'Ask Mei for the learner, gently: "Mei, what\'s wrong?"',
        },
      }),
      N,
    ),
    learner(
      'ask-whats-wrong-visitor',
      // Mei shows the letter next, in her own words.
      visitorCards({
        listener: 'mei',
        choices: [card("What's wrong?", 'Có chuyện gì vậy?')],
        accept: ['wrong', 'okay', 'ok'],
        phrases: ['whats-wrong'],
        canDo: 'ask-whats-wrong',
        praise: [],
        task: task("Ask Mei what's wrong. Read the card.", 'Hỏi Mei có chuyện gì. Đọc thẻ nhé.'),
      }),
      V,
    ),
    gen(
      'mei-deflects',
      'mei',
      'Deflect once, lightly, with a joke: say it is nothing. Do not show the letter yet.',
      { ...N, example: 'Aiyah, nothing lah.', answer: askAgain('letter') },
    ),
    gen(
      'mei-deflects-again',
      'mei',
      'Deflect a second time, more quietly. Let your mood show, so the learner has to read it.',
      {
        minStage: 'neighbour',
        example: "Really, it's fine. I'm just tired.",
        answer: askAgain('letter'),
      },
    ),
    gen(
      'mei-shows-letter',
      'mei',
      "Give in: say it's this letter and hand it over. One short line.",
      {
        example: "Oh, it's nothing… Okay. It's this letter.",
      },
    ),
    // 3. The letter
    ui('letter', { type: 'letter', letter: S1_E1_LETTER }),
    rec('double', 's1-e1-04'),
    // 4. Teach the yapling
    rec('rent-question', 's1-e1-05', N),
    rec('rent-question-visitor', 's1-e1-visitor-rent', V),
    learner(
      'teach-rent',
      answer({
        listener: 'pip',
        expects: 'Explains what rent means, in their own words.',
        hint: glossed('Rent is the money you pay …', viDesign('Rent là tiền bạn trả để …')),
        fallback: {
          speaker: 'pip',
          intent:
            'Work it out aloud with what the learner said: "Oh! Money to use the café? Every month?" Thank them.',
        },
      }),
      N,
    ),
    learner(
      'teach-rent-visitor',
      // Pip writes it down next.
      visitorCards({
        listener: 'pip',
        choices: [
          card("It's money.", 'Là tiền.'),
          card("It's money for a home.", 'Là tiền thuê nhà.'),
        ],
        accept: ['money', 'pay', 'home'],
        praise: [],
        task: task('Pip asks what "rent" is. Pick a card.', 'Pip hỏi "rent" là gì. Chọn một thẻ.'),
      }),
      V,
    ),
    ui('notebook', { type: 'notebook', word: 'rent' }),
    gen(
      'pip-writes',
      'pip',
      "Write rent in your notebook in the learner's own words: read their explanation back slowly, delighted.",
      { example: 'Wait, let me write that. Rent: the money you pay to use a place. Ooh.' },
    ),
    // 5. The call to the landlord's office
    rec('ask-call', 's1-e1-06', N),
    rec('ask-call-visitor', 's1-e1-visitor-call', V),
    learner(
      'agree-to-call',
      answer({
        listener: 'mei',
        expects: 'Agrees to call for Mei (sure, of course, I can help).',
        phrases: ['can-i-help'],
        canDo: 'ask-whats-wrong',
        onTargetError: 'accept',
        hint: glossed('Sure, I can help.', viDraft('Được chứ, mình giúp được.')),
        maxTries: 2,
        fallback: {
          speaker: 'pip',
          intent: 'Say "We can do it!" and pick up the phone for the learner.',
        },
      }),
      N,
    ),
    learner(
      'agree-to-call-visitor',
      visitorCards({
        listener: 'mei',
        choices: [card('Yes, I can help.', 'Ừ, mình giúp được.'), card('Okay!', 'Được!')],
        accept: ['yes', 'okay', 'ok', 'sure', 'help'],
        phrases: ['can-i-help'],
        canDo: 'ask-whats-wrong',
        task: task('Mei asks you to call. Say yes.', 'Mei nhờ bạn gọi điện. Nhận lời nhé.'),
      }),
      V,
    ),
    ui('dial', { type: 'phone', state: 'ringing' }),
    gen(
      'office-answers',
      'office',
      'Answer the phone for the Harbour Property Office, politely, and ask who is calling.',
      {
        ...N,
        example: "Harbour Property Office, good morning. Who's calling, please?",
        answer: answer({
          listener: 'office',
          expects: "Introduces themselves and says they're calling for Mei.",
          canDo: 'introduce-yourself-30s',
          hint: glossed(
            "Hi, I'm … I'm calling for …",
            viDesign('Xin chào, tôi là … Tôi gọi thay cho …'),
          ),
          fallback: {
            speaker: 'office',
            intent:
              'Help the caller along: ask if they are calling for Ms Mei at the Lantern Café, and take any yes.',
          },
        }),
      },
    ),
    gen(
      'office-answers-visitor',
      'office',
      'Answer the phone for the Harbour Property Office and ask who is calling, in five words at most.',
      {
        ...V,
        constraints: ['Five words at most.'],
        example: "Hello. Who's calling, please?",
        answer: visitorCards({
          listener: 'office',
          choices: [
            card("I'm {name}.", 'Tôi là {name}.'),
            card("I'm {name}. I'm calling for Mei.", 'Tôi là {name}. Tôi gọi giúp Mei.'),
          ],
          accept: ["i'm", 'i am', 'my name', 'this is', '{name}', 'mei'],
          canDo: 'introduce-yourself-30s',
          task: task(
            'The office asks who is calling. Say your name.',
            'Văn phòng hỏi ai đang gọi. Nói tên bạn.',
          ),
        }),
      },
    ),
    gen(
      'office-follow-up',
      'office',
      'Ask one follow-up: the account number, or the reason for the call.',
      {
        minStage: 'neighbour',
        example: 'And what is the call about, please?',
        answer: answer({
          listener: 'office',
          expects:
            "Gives the reason for the call (the rent letter) or says they don't have the number.",
          hint: glossed("I'm calling about the rent.", viDraft('Tôi gọi về chuyện tiền thuê nhà.')),
          fallback: {
            speaker: 'office',
            intent: 'Say you have found the account for 12 Harbour Lane, no problem.',
          },
        }),
      },
    ),
    gen('office-holds-date', 'office', 'Say the new rent starts next month, as the letter says.', {
      minStage: 'regular',
      example: 'The new rent starts next month, I am afraid.',
      answer: answer({
        listener: 'office',
        expects: 'Negotiates politely for more time (until the end of the month).',
        hint: glossed(
          'Could we have until the end of the month?',
          viDraft('Chúng tôi có thể có thời gian đến cuối tháng không?'),
        ),
        fallback: {
          speaker: 'office',
          intent: 'Say Ms Mei can ask about the date at the meeting.',
        },
      }),
    }),
    gen(
      'office-resolves',
      'office',
      'Close the call: Ms Mei can come in on Friday to discuss it. Thank the caller and say goodbye.',
      {
        constraints: [
          'Always offer the Friday meeting, whatever the caller said.',
          'Do not change the rent or promise anything else.',
        ],
        example: 'Ms Mei can come in on Friday to discuss it.',
        resolution: 'Mei has a meeting at the property office on Friday.',
      },
    ),
    learner(
      'office-bye-visitor',
      visitorCards({
        listener: 'office',
        choices: [card('Thank you. Bye!', 'Cảm ơn. Tạm biệt!')],
        accept: ['thank', 'thanks', 'bye'],
        task: task('Say goodbye to the office.', 'Chào tạm biệt văn phòng.'),
      }),
      V,
    ),
    ui('hang-up', { type: 'phone', state: 'ended' }),
    // 6. Advice
    rec('what-now', 's1-e1-07'),
    learner(
      'advice',
      answer({
        listener: 'mei',
        expects: 'Gives Mei one piece of advice.',
        phrases: ['i-think-you-should', 'i-need-a-plan'],
        canDo: 'ask-whats-wrong',
        hint: glossed('I think you should …', viDesign('Mình nghĩ bạn nên …')),
        fallback: {
          speaker: 'pip',
          intent: 'Offer a simple idea yourself: "I think you should go to the meeting on Friday!"',
        },
      }),
      N,
    ),
    learner(
      'advice-visitor',
      // Mei reacts warmly next.
      visitorCards({
        listener: 'mei',
        choices: [
          card('Go on Friday.', 'Thứ Sáu đi gặp họ nhé.'),
          card('I think you should go on Friday.', 'Mình nghĩ bạn nên đi vào thứ Sáu.'),
        ],
        accept: ['friday', 'go', 'should', 'meeting'],
        phrases: ['i-think-you-should'],
        canDo: 'ask-whats-wrong',
        praise: [],
        task: task(
          'Mei asks what to do. Pick some advice.',
          'Mei hỏi nên làm gì. Chọn một lời khuyên.',
        ),
      }),
      V,
    ),
    gen(
      'mei-warm',
      'mei',
      "React warmly to the learner's idea, whatever it is: it's a good start for the plan. One short line.",
      {
        constraints: ['Accept any reasonable idea; never argue with it.'],
        example: 'Ok, that I can do. Thank you lah.',
      },
    ),
    // 7. Close
    rec('pip-job', 's1-e1-08'),
    rec('close', 's1-e1-09'),
  ],
});
