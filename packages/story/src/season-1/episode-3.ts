import { gen, learner, rec, scene, seconds, ui } from '../build';
import type { Answer, Episode } from '../types';
import {
  englishOnly,
  hint,
  N,
  pipStory,
  postcards,
  turn,
  V,
  VISITOR_LINE,
  voicemail,
} from './later-weeks';
import { card, task, THANKS, visitorCards } from './visitor';

/*
 * Episode 3, "Cheaper Beans", and its week (`season-1-script.md`, "Episode 3"): the "same scene,
 * two stages" episode. Hank has one recorded opener per stage. A Visitor says no, offers one thing
 * and shakes on it, with Mei and Pip carrying the rest. Dex runs his first real-week call (his lines
 * speak with the live voice until his own is recorded).
 */

export const S1_E3_CALL = scene({
  id: 's1-e3',
  kind: 'episode',
  title: 'Cheaper Beans',
  place: 'lantern-cafe',
  cast: ['mei', 'hank', 'pip'],
  summary:
    'At the café counter, Hank wants ten percent off his beans. The learner helps Mei say no kindly, offer something else instead, and keep him as a customer.',
  goal: 'Say no politely, push back once and offer an alternative.',
  canDos: ['say-no-politely', 'push-back-offer-alternative'],
  phrases: ['sorry-we-cant', 'how-about', 'fair-point-but', 'deal'],
  beats: [
    // Hank's opener, one take per stage.
    rec('hank-arrives-visitor', 's1-e3-visitor-hank', V),
    rec('hank-arrives', 's1-e3-01', { minStage: 'newcomer', maxStage: 'newcomer' }),
    rec('hank-arrives-neighbour', 's1-e3-10', { minStage: 'neighbour', maxStage: 'neighbour' }),
    rec('hank-arrives-regular', 's1-e3-11', { minStage: 'regular', maxStage: 'regular' }),
    rec('hank-arrives-fast', 's1-e3-02', { minStage: 'local' }),
    rec('mei-panics', 's1-e3-03', N),
    learner(
      'say-no',
      turn({
        listener: 'hank',
        expects: 'Says no to the discount, kindly.',
        phrases: ['sorry-we-cant'],
        canDo: 'say-no-politely',
        hint: hint("I'm sorry, we can't do that.", 'Xin lỗi, chúng tôi không làm vậy được.'),
        stuck: 'Whisper the words for the learner: "Sorry, we can\'t do that."',
        by: 'mei',
      }),
      N,
    ),
    gen(
      'hank-pushes',
      'hank',
      'Push once, and name the big café across the harbour, Big Bean, as cheaper.',
      {
        ...N,
        constraints: ['Name Big Bean, across the harbour: the next episode needs it.'],
        example: 'Come on, Big Bean across the harbour is cheaper. Ten percent?',
        answer: turn({
          listener: 'hank',
          expects: 'Holds the no, kindly.',
          phrases: ['sorry-we-cant'],
          canDo: 'say-no-politely',
          hint: hint("Sorry, we really can't.", 'Xin lỗi, thật sự là không được.'),
          stuck: 'Grumble and wait to hear what else they have.',
        }),
      },
    ),
    gen('neighbour-why', 'hank', 'Ask why not, fairly: you are a good customer.', {
      minStage: 'neighbour',
      example: "Why not? I'm a good customer.",
      answer: turn({
        listener: 'hank',
        expects: 'Gives a reason for the no, politely.',
        hint: hint('Because the rent …', 'Vì tiền thuê nhà …'),
        stuck: 'Say "Fair enough" and wait to hear the offer.',
      }),
    }),
    rec('pip-idea', 's1-e3-04', N),
    learner(
      'alternative',
      turn({
        listener: 'hank',
        expects: 'Offers something else instead of the discount.',
        phrases: ['how-about'],
        canDo: 'push-back-offer-alternative',
        hint: hint(
          'How about free kaya toast? / How about …?',
          'Hay là tặng kèm bánh mì nướng kaya nhé? / Hay là … nhé?',
        ),
        stuck: 'Whisper an idea for the learner: "How about free kaya toast?"',
        by: 'pip',
      }),
      N,
    ),
    gen('hank-objects', 'hank', 'Object once to the offer, gruff but friendly.', {
      ...N,
      example: 'Toast? My team wants cheap beans, not toast.',
      answer: turn({
        listener: 'hank',
        expects: 'Agrees a little, and holds the offer.',
        phrases: ['fair-point-but'],
        canDo: 'push-back-offer-alternative',
        hint: hint("That's a fair point, but …", 'Ông nói cũng có lý, nhưng …'),
        stuck: 'Think it over out loud and start to come round.',
      }),
    }),
    gen('regular-counter', 'hank', 'Make one counter-offer: five percent, then?', {
      minStage: 'regular',
      example: 'Five percent, then. Final offer?',
      answer: turn({
        listener: 'hank',
        expects: 'Negotiates with a reason, and keeps the price.',
        phrases: ['fair-point-but', 'how-about'],
        hint: hint('I understand, but … How about …?', 'Tôi hiểu, nhưng … Hay là … nhé?'),
        stuck: 'Laugh and say they drive a hard bargain.',
      }),
    }),
    rec('hank-folds', 's1-e3-05', N),
    learner(
      'shake',
      turn({
        listener: 'hank',
        expects: 'Shakes on it.',
        phrases: ['deal'],
        hint: hint('Deal! Thank you.', 'Chốt! Cảm ơn ông.'),
        onTargetError: 'accept',
        maxTries: 2,
        stuck: 'Hold out a paw and say "Deal, then."',
      }),
      N,
    ),
    rec('twist', 's1-e3-09', { minStage: 'newcomer', maxStage: 'neighbour' }),
    rec('twist-regular', 's1-e3-06', { minStage: 'regular' }),
    gen(
      'mei-door',
      'mei',
      'Say one worried line to the learner about your door. Nothing to answer.',
      {
        ...N,
        example: 'My door? But why…?',
      },
    ),

    // At Visitor: say no, offer one thing, shake on it.
    rec('mei-panics-visitor', 's1-e3-visitor-mei', V),
    learner(
      'say-no-visitor',
      visitorCards({
        listener: 'hank',
        choices: [
          card('Sorry, no.', 'Xin lỗi, không được.'),
          card("I'm sorry, we can't do that.", 'Xin lỗi, chúng tôi không làm vậy được.'),
        ],
        accept: ['sorry', 'no', "can't", 'cannot'],
        phrases: ['sorry-we-cant'],
        canDo: 'say-no-politely',
        task: task(
          'Hank wants cheaper coffee. Help Mei say no, politely.',
          'Hank muốn mua cà phê rẻ hơn. Bạn giúp Mei từ chối thật lịch sự.',
        ),
      }),
      V,
    ),
    rec('hank-hmm-visitor', 's1-e3-visitor-hank-hmm', V),
    rec('pip-idea-visitor', 's1-e3-visitor-pip', V),
    learner(
      'alternative-visitor',
      visitorCards({
        listener: 'hank',
        choices: [
          card('How about a free cake?', 'Tặng ông một cái bánh nhé?'),
          card('How about free tea?', 'Tặng ông trà miễn phí nhé?'),
        ],
        accept: ['how about', 'free', 'cake', 'tea'],
        phrases: ['how-about'],
        canDo: 'push-back-offer-alternative',
        task: task(
          'Offer Hank something else instead of a discount.',
          'Mời Hank một món khác thay cho giảm giá.',
        ),
      }),
      V,
    ),
    rec('hank-deal-visitor', 's1-e3-visitor-hank-deal', V),
    learner(
      'shake-visitor',
      visitorCards({
        listener: 'hank',
        choices: [card('Deal!', 'Chốt!')],
        accept: ['deal', 'okay', 'ok', 'yes'],
        phrases: ['deal'],
      }),
      V,
    ),
    rec('twist-visitor', 's1-e3-visitor-twist', V),
    rec('mei-why-visitor', 's1-e3-visitor-mei-why', V),
  ],
});

export const S1_E3_REAL_WEEK = scene({
  id: 's1-e3-real-week',
  kind: 'real_week',
  title: 'A real no',
  place: 'hollowbrook-office',
  cast: ['dex'],
  summary:
    'Dex\'s first call, in the interview room. He asks about a "no" the learner needs to say this week, plays the person they have to say it to, and coaches one strong thing.',
  goal: 'Rehearse a real "no" for this week: say it kindly and offer something else.',
  canDos: ['say-no-politely', 'push-back-offer-alternative'],
  phrases: ['sorry-we-cant', 'how-about'],
  beats: [
    rec('open', 's1-e3-rw-open', N),
    gen(
      'dex-asks',
      'dex',
      'Ask one question: is there a "no" the learner needs to say this week, at work or at home? Use their job from memory.',
      {
        ...N,
        example: 'Is there something you need to say no to this week?',
        answer: turn({
          listener: 'dex',
          expects: 'Says what the request is and who asked.',
          hint: hint('This week, someone asked me to …', 'Tuần này, có người nhờ mình …'),
          stuck: 'Offer a common one: a manager asking for a Saturday shift. Take it.',
        }),
      },
    ),
    gen('dex-plays', 'dex', 'Set the scene, become that person, and make the request.', {
      ...N,
      example: "Okay, I'm your manager. Can you work on Saturday?",
      answer: turn({
        listener: 'dex',
        expects: 'Says no, kindly.',
        phrases: ['sorry-we-cant'],
        canDo: 'say-no-politely',
        hint: hint("I'm sorry, I can't do that.", 'Xin lỗi, mình không làm vậy được.'),
        stuck: 'Step out of the role for a moment and offer the words: "I\'m sorry, I can\'t."',
      }),
    }),
    gen('dex-pushes', 'dex', 'Push once, fairly, as that person would.', {
      ...N,
      example: "It's only one day. Are you sure?",
      answer: turn({
        listener: 'dex',
        expects: 'Offers something else instead.',
        phrases: ['how-about'],
        canDo: 'push-back-offer-alternative',
        hint: hint('How about …?', 'Hay là … nhé?'),
        stuck: 'As that person, suggest another day yourself and accept it.',
      }),
    }),
    gen(
      'dex-coaches',
      'dex',
      'Accept the offer as that person, then step out of the role and name one strong thing the learner did.',
      { ...N, example: 'Monday works. And you stayed kind the whole time.' },
    ),
    rec('close', 's1-e3-rw-close', N),

    // At Visitor: Dex plays the boss with a small request.
    gen('dex-asks-visitor', 'dex', 'Say your name, and ask, as their boss: work on Sunday?', {
      ...V,
      constraints: [VISITOR_LINE],
      example: "I'm Dex. Work on Sunday? Okay?",
      answer: visitorCards({
        listener: 'dex',
        choices: [
          card('Sorry, no.', 'Xin lỗi, không được.'),
          card("Sorry, I can't.", 'Xin lỗi, mình không đi làm được.'),
        ],
        accept: ['sorry', 'no', "can't", 'cannot'],
        phrases: ['sorry-we-cant'],
        canDo: 'say-no-politely',
        task: task(
          'Dex plays your boss. Say no, politely.',
          'Dex đóng vai sếp của bạn. Từ chối thật lịch sự.',
        ),
      }),
    }),
    gen('dex-monday-visitor', 'dex', 'Accept, and ask about Monday instead.', {
      ...V,
      constraints: [VISITOR_LINE],
      example: 'Okay. Then Monday?',
      answer: visitorCards({
        listener: 'dex',
        choices: [
          card('Yes, Monday is okay.', 'Vâng, thứ Hai thì được.'),
          card('How about Tuesday?', 'Hay là thứ Ba nhé?'),
        ],
        accept: ['yes', 'okay', 'ok', 'monday', 'how about', 'tuesday'],
        phrases: ['how-about'],
        canDo: 'push-back-offer-alternative',
      }),
    }),
    gen('dex-thanks-visitor', 'dex', 'Say good, and thank them.', {
      ...V,
      constraints: [VISITOR_LINE],
      example: 'Good! Thank you.',
      answer: visitorCards({
        listener: 'dex',
        choices: [card('Thank you. Bye!', 'Cảm ơn. Tạm biệt!')],
        accept: [...THANKS, 'bye'],
      }),
    }),
    gen('dex-bye-visitor', 'dex', 'Say well done, and goodbye.', {
      ...V,
      constraints: [VISITOR_LINE],
      example: 'Well done. Bye!',
    }),
  ],
});

/** A Pass it on round: one story, less time each round; English only. */
const round = (
  listener: 'pip' | 'linh' | 'hank',
  frame: string,
  time: ReturnType<typeof seconds>,
): Answer =>
  turn({
    listener,
    expects: 'Says why the café matters to them, within the time.',
    canDo: 'short-story-with-a-point',
    timer: time,
    onTargetError: 'accept',
    hint: englishOnly(frame),
    maxTries: 2,
    stuck: 'Ask one simple question to get them started: "What do you like there?"',
  });

const NEWCOMER_FRAME = 'I like this café because … Mei is … Every week, I …';
const VISITOR_FRAME = 'I like the café. / Mei is my friend. / The toast is good.';

export const S1_E3_PRACTICE = scene({
  id: 's1-e3-practice',
  kind: 'practice',
  title: 'Pass it on',
  place: 'lantern-cafe',
  cast: ['pip', 'linh', 'hank'],
  summary:
    'At the café. Mei might lose it, and Pip asks why it matters to the learner. They tell it three times: to Pip, to Linh, then to Hank in a hurry.',
  goal: 'Tell why the café matters to you three times, shorter and smoother each time.',
  canDos: ['short-story-with-a-point'],
  beats: [
    rec('open', 's1-e3-pr-open', N),
    gen('pip-asks-visitor', 'pip', 'Ask why the learner likes the café: thirty seconds.', {
      ...V,
      constraints: [VISITOR_LINE],
      example: 'Why do you like the café?',
    }),
    learner(
      'round-1',
      round('pip', NEWCOMER_FRAME, seconds(90, { neighbour: 75, regular: 60 })),
      N,
    ),
    learner('round-1-visitor', round('pip', VISITOR_FRAME, seconds(30)), V),
    ui('mirror-1', { type: 'fluency_mirror', round: 1 }),
    gen('linh-asks', 'linh', 'Come in for tea, and ask to hear it too: one minute.', {
      ...N,
      example: 'Pip says you have a café story. Tell me too? One minute.',
    }),
    gen('linh-asks-visitor', 'linh', 'Ask why the learner likes the café: twenty-five seconds.', {
      ...V,
      constraints: [VISITOR_LINE],
      example: 'Why do you like the café?',
    }),
    learner(
      'round-2',
      round('linh', NEWCOMER_FRAME, seconds(60, { neighbour: 50, regular: 45 })),
      N,
    ),
    learner('round-2-visitor', round('linh', VISITOR_FRAME, seconds(25)), V),
    ui('mirror-2', { type: 'fluency_mirror', round: 2 }),
    gen('hank-asks', 'hank', 'At the counter, in a hurry, at Newcomer speed: why this café?', {
      ...N,
      example: 'Quick, quick. Why this café?',
    }),
    gen('hank-asks-visitor', 'hank', 'In a hurry: why this café? Twenty seconds.', {
      ...V,
      constraints: [VISITOR_LINE],
      example: 'Why this café? Tell me!',
    }),
    learner(
      'round-3',
      round('hank', NEWCOMER_FRAME, seconds(45, { neighbour: 40, regular: 30 })),
      N,
    ),
    learner('round-3-visitor', round('hank', VISITOR_FRAME, seconds(20)), V),
    ui('mirror-3', { type: 'fluency_mirror', round: 3 }),
    rec('close', 's1-e3-pr-close', N),
    gen('pip-close-visitor', 'pip', 'Cheer: three times, and Hank listened.', {
      ...V,
      constraints: [VISITOR_LINE],
      example: 'Three times! Hank listened!',
    }),
  ],
});

export const S1_E3: Episode = {
  id: 's1-e3',
  number: 3,
  title: 'Cheaper Beans',
  place: 'lantern-cafe',
  cast: ['hank', 'mei', 'pip'],
  logline:
    'Hank, a fast-talking regular who buys beans for his shipping crew, demands a discount. You help Mei hold her price without losing him.',
  learningFocus: 'Saying no politely, offering alternatives, keeping up with fast speech.',
  canDos: { life: 'say-no-politely', work: 'push-back-offer-alternative' },
  phrases: ['sorry-we-cant', 'how-about', 'fair-point-but', 'deal'],
  realWeek: 'A real "no" you need to say this week, rehearsed with Dex, who plays the other side.',
  practice:
    'Pass it on at the café: why the café matters to you, told to Pip, Linh and then Hank (90/60/45 s).',
  stageScaling:
    'Neighbour: explain why, offer an alternative and confirm the deal. Regular: negotiate with reasons. Local: interruptions and a mid-sentence change of mind. Voice: de-escalate and keep the relationship.',
  lines: [
    's1-e3-visitor-hank',
    's1-e3-01',
    's1-e3-10',
    's1-e3-11',
    's1-e3-02',
    's1-e3-03',
    's1-e3-04',
    's1-e3-05',
    's1-e3-09',
    's1-e3-06',
    's1-e3-visitor-mei',
    's1-e3-visitor-hank-hmm',
    's1-e3-visitor-pip',
    's1-e3-visitor-hank-deal',
    's1-e3-visitor-twist',
    's1-e3-visitor-mei-why',
    's1-e3-rw-open',
    's1-e3-rw-close',
    's1-e3-pr-open',
    's1-e3-pr-close',
    's1-e3-story-01',
    's1-e3-story-02',
    's1-e3-story-03',
    's1-e3-story-04',
    's1-e3-story-05',
    's1-e3-story-06',
    's1-e3-postcard-linh',
    's1-e3-07',
    's1-e3-12',
  ],
  cliffhanger: 's1-e3-07',
  recap: 's1-e3-12',
  draft: false,
  week: [
    { day: 1, scene: 's1-e3' },
    { day: 2, scene: 's1-e3-story' },
    { day: 2, scene: 's1-e3-postcard' },
    { day: 3, scene: 's1-e3-real-week' },
    { day: 4, scene: 's1-e3-practice' },
    { day: 5, scene: 's1-e3-voicemail' },
  ],
  scenes: [
    S1_E3_CALL,
    pipStory(
      {
        id: 's1-e3-story',
        title: 'The quick sync',
        summary:
          'On its first morning at Hollowbrook, Pip heard "quick sync" as "quick sink" and brought soap.',
        phrases: ['just-to-confirm'],
      },
      [
        's1-e3-story-01',
        's1-e3-story-02',
        's1-e3-story-03',
        's1-e3-story-04',
        's1-e3-story-05',
        's1-e3-story-06',
      ],
    ),
    postcards(
      {
        id: 's1-e3-postcard',
        title: 'Postcard from Linh',
        summary: 'Linh used to say yes to everything. Now she says no, and offers another day.',
        phrases: ['sorry-we-cant', 'how-about'],
      },
      [['linh', 's1-e3-postcard-linh']],
    ),
    S1_E3_REAL_WEEK,
    S1_E3_PRACTICE,
    voicemail({
      id: 's1-e3-voicemail',
      title: 'Mei left you a voicemail',
      summary: 'Someone wants to buy the café building, and the message cuts off.',
      from: 'mei',
      line: 's1-e3-07',
      beep: true,
    }),
  ],
};
