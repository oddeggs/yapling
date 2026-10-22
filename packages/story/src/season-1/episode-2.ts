import { gen, learner, rec, scene } from '../build';
import type { Episode } from '../types';
import { S1_E2_PRACTICE, S1_E2_REAL_WEEK } from './episode-2-calls';
import {
  hint,
  JOB_WORDS,
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
 * Episode 2, "Help Wanted", and its week, line for line from the script (`season-1-script.md`,
 * "Episode 2"). Pip rehearses its interview in the burrow, then Sol interviews Pip at Hollowbrook
 * and asks the learner the same question. A Visitor plays the same call on cards: one question to
 * Pip, then name and job, one strength and the hours for Sol, each modelled first.
 */

export const S1_E2_CALL = scene({
  id: 's1-e2',
  kind: 'episode',
  title: 'Help Wanted',
  place: 'hollowbrook-office',
  cast: ['pip', 'sol'],
  summary:
    'Pip rehearses its interview with the learner in the burrow, then Sol interviews Pip at Hollowbrook and asks the learner the same question.',
  goal: 'Answer "Tell me about yourself" and say what you are good at, with an example.',
  canDos: ['say-what-youre-good-at', 'tell-me-about-yourself'],
  phrases: ['im-good-at', 'for-example', 'id-love-to', 'just-to-confirm'],
  beats: [
    // In the burrow: the learner plays Sol.
    rec('rehearse', 's1-e2-02', N),
    learner(
      'ask-pip',
      turn({
        listener: 'pip',
        expects: 'Asks Pip an interview question, playing Sol.',
        hint: hint(
          'Tell me about yourself. / What are you good at?',
          'Hãy giới thiệu về bản thân bạn. / Bạn giỏi việc gì?',
        ),
        onTargetError: 'accept',
        stuck: 'Suggest a question yourself: "Ask me: tell me about yourself?" Then answer it.',
      }),
      N,
    ),
    gen(
      'pip-answers',
      'pip',
      "Answer the learner's question as an interviewee, one stage below the learner, with one mistake that matches the learner's own target error (no target yet: a past-tense slip).",
      {
        ...N,
        constraints: ['Exactly one mistake, the same kind the learner makes.'],
        example: "I'm good at cook. Yesterday I cook for Mei!",
        answer: turn({
          listener: 'pip',
          expects: "Corrects Pip's mistake.",
          hint: hint('You mean: …', 'Ý Pip là: …'),
          onTargetError: 'hint',
          stuck: 'Notice your own mistake and fix it, a little proud.',
        }),
      },
    ),
    gen('pip-thanks', 'pip', 'Write the fix in your notebook and promise to use it.', {
      ...N,
      example: 'Cooking, cooked. Writing it down!',
    }),
    rec('sol-hi', 's1-e2-03', N),
    gen(
      'pip-interview',
      'pip',
      "Answer Sol, using the learner's fix from the burrow, so they hear it land.",
      { ...N, example: "I'm good at cooking. Yesterday, I cooked for Mei!" },
    ),
    rec('swap', 's1-e2-11', N),
    learner(
      'about-yourself',
      turn({
        listener: 'sol',
        expects: 'Answers "Tell me about yourself": who they are, their work or study, their day.',
        canDo: 'tell-me-about-yourself',
        hint: hint(
          "I'm … I work at … / I study … Every day, I …",
          'Mình là … Mình làm ở … / Mình học … Mỗi ngày, mình …',
        ),
        stuck: 'Ask a smaller question, kindly: what do you do, and where?',
      }),
      N,
    ),
    gen(
      'sol-good-at',
      'sol',
      'Pick up one thing the learner said, then ask what they are good at.',
      {
        ...N,
        example: 'A nurse! So, what are you good at?',
        answer: turn({
          listener: 'sol',
          expects: 'Says what they are good at.',
          phrases: ['im-good-at'],
          canDo: 'say-what-youre-good-at',
          hint: hint("I'm good at …", 'Mình giỏi …'),
          stuck: 'Offer an easy start: "Maybe something at work, or at home?"',
        }),
      },
    ),
    gen('sol-example', 'sol', 'Ask for an example, nothing else.', {
      ...N,
      example: 'Nice. Can you give me an example?',
      answer: turn({
        listener: 'sol',
        expects: 'Gives an example: a moment in the past when they did it.',
        phrases: ['for-example'],
        canDo: 'say-what-youre-good-at',
        hint: hint('For example, last week I …', 'Ví dụ, tuần trước mình …'),
        stuck: 'Say any small example is fine, and thank them for it.',
      }),
    }),
    gen('sol-learned', 'sol', 'Ask one more follow-up: what did they learn from that?', {
      minStage: 'neighbour',
      example: 'What did you learn from that?',
      answer: turn({
        listener: 'sol',
        expects: 'Says what they learned.',
        hint: hint('I learned that …', 'Mình học được rằng …'),
        stuck: 'Say that is a good thing to learn, and move on.',
      }),
    }),
    gen('sol-weakness', 'sol', 'Ask about a weakness, and what they do about it.', {
      minStage: 'regular',
      example: "And a weakness? What's hard for you?",
      answer: turn({
        listener: 'sol',
        expects: 'Names a weakness and what they do about it.',
        hint: hint('Sometimes I … so now I …', 'Đôi khi mình … nên bây giờ mình …'),
        stuck: 'Say it is a hard question, and move on kindly.',
      }),
    }),
    gen('sol-problem', 'sol', 'Ask about a time they solved a problem.', {
      minStage: 'regular',
      example: 'Tell me about a problem you solved.',
      answer: turn({
        listener: 'sol',
        expects: 'Tells a short story of a problem and what they did.',
        phrases: ['for-example'],
        hint: hint('Once, … so I …', 'Có lần, … nên mình …'),
        stuck: 'Thank them and say it sounds like they stay calm.',
      }),
    }),
    gen(
      'sol-what-if',
      'sol',
      'Ask a hypothetical ("What would you do if…?"), and interrupt once, kindly, to dig deeper.',
      {
        minStage: 'local',
        example: 'What would you do if two meetings were at nine?',
        answer: turn({
          listener: 'sol',
          expects: 'Answers the hypothetical with a plan.',
          hint: hint('I would …', 'Mình sẽ …'),
          stuck: 'Say there is no wrong answer, and move on.',
        }),
      },
    ),
    rec('details', 's1-e2-12', N),
    rec('pip-check', 's1-e2-09', N),
    learner(
      'confirm',
      turn({
        listener: 'sol',
        expects: 'Checks the start date and hours with Sol for Pip.',
        phrases: ['just-to-confirm'],
        hint: hint(
          'Just to confirm: the fourteenth, mornings?',
          'Cho mình xác nhận lại: ngày mười bốn, làm buổi sáng, đúng không?',
        ),
        stuck: 'Repeat the details once, slowly: the fourteenth, mornings only.',
      }),
      N,
    ),
    gen('sol-confirms', 'sol', 'Confirm the details back, in a few words.', {
      ...N,
      example: "That's right. The fourteenth, mornings.",
    }),
    rec('tour', 's1-e2-10', N),
    learner(
      'tour-yes',
      turn({
        listener: 'sol',
        expects: 'Says yes to the tour, warmly.',
        phrases: ['id-love-to'],
        hint: hint("I'd love to!", 'Có chứ, mình rất muốn!'),
        onTargetError: 'accept',
        maxTries: 2,
        stuck: 'Say "Come on, then!" and start the tour.',
      }),
      N,
    ),
    gen('sol-tour', 'sol', 'Show one thing on the tour, with something to smile at.', {
      ...N,
      example: 'This is the team room. And this is the snack shelf, Pip.',
    }),
    rec('close', 's1-e2-06', N),

    // At Visitor: one card question to Pip, then Sol asks the learner.
    rec('rehearse-visitor', 's1-e2-visitor-practise', V),
    learner(
      'ask-pip-visitor',
      // Pip answers next, with the same line it says at the office.
      visitorCards({
        listener: 'pip',
        choices: [card("What's your job?", 'Bạn làm nghề gì?')],
        accept: ['job', 'work', 'what'],
        praise: [],
        task: task(
          'Pip has an interview soon. You play Sol: read the question on the card.',
          'Pip sắp đi phỏng vấn. Bạn đóng vai Sol: đọc câu hỏi trên thẻ.',
        ),
      }),
      V,
    ),
    rec('pip-me-visitor', 's1-e2-visitor-pip-me', V),
    rec('sol-hi-visitor', 's1-e2-visitor-sol-hi', V),
    rec('pip-interview-visitor', 's1-e2-visitor-pip-me', V),
    rec('sol-you-visitor', 's1-e2-visitor-sol-you', V),
    learner(
      'about-you-visitor',
      visitorCards({
        listener: 'sol',
        choices: [
          card("I'm {name}. I'm a …", 'Mình là {name}. Mình là …'),
          card("I'm {name}. I work at …", 'Mình là {name}. Mình làm ở …'),
        ],
        accept: ["i'm", 'i am', '{name}', ...JOB_WORDS],
        canDo: 'tell-me-about-yourself',
        task: task(
          'Sol asks about you. Say your name and your job.',
          'Sol hỏi về bạn. Nói tên và công việc của bạn.',
        ),
      }),
      V,
    ),
    gen('sol-job-visitor', 'sol', "Say the learner's job back, warmly.", {
      ...V,
      constraints: [VISITOR_LINE],
      example: 'A nurse! Great!',
    }),
    rec('sol-good-visitor', 's1-e2-visitor-sol-good', V),
    learner(
      'good-at-visitor',
      visitorCards({
        listener: 'sol',
        choices: [
          card("I'm good at cooking.", 'Mình nấu ăn giỏi.'),
          card("I'm good at numbers.", 'Mình giỏi tính toán.'),
        ],
        accept: ['good'],
        phrases: ['im-good-at'],
        canDo: 'say-what-youre-good-at',
        task: task(
          'What are you good at? Pick a card, or say it in your own words.',
          'Bạn giỏi việc gì? Chọn một thẻ, hoặc nói bằng từ của bạn.',
        ),
      }),
      V,
    ),
    gen('sol-good-back-visitor', 'sol', 'Say what the learner is good at back, warmly.', {
      ...V,
      constraints: [VISITOR_LINE],
      example: 'Cooking! Very nice.',
    }),
    rec('mornings-visitor', 's1-e2-visitor-sol-mornings', V),
    learner(
      'mornings-ok-visitor',
      visitorCards({
        listener: 'sol',
        choices: [
          card('Mornings. Okay!', 'Buổi sáng. Được!'),
          card('Yes, mornings are okay.', 'Vâng, buổi sáng thì được.'),
        ],
        accept: ['morning', 'mornings', 'okay', 'ok', 'yes'],
        phrases: ['just-to-confirm'],
        task: task(
          'Say the hours back and say yes for Pip.',
          'Nhắc lại giờ làm và nhận lời giúp Pip.',
        ),
      }),
      V,
    ),
    rec('bye-visitor', 's1-e2-visitor-sol-bye', V),
    learner(
      'bye-back-visitor',
      visitorCards({
        listener: 'sol',
        choices: [card('Thank you. Bye!', 'Cảm ơn. Tạm biệt!')],
        accept: [...THANKS, 'bye'],
      }),
      V,
    ),
    rec('done-visitor', 's1-e2-visitor-pip-done', V),
  ],
});

export const S1_E2: Episode = {
  id: 's1-e2',
  number: 2,
  title: 'Help Wanted',
  place: 'hollowbrook-office',
  cast: ['sol', 'pip'],
  logline:
    'Pip has its first job interview, with Sol at Hollowbrook. You rehearse it with Pip, then swap: Sol interviews you.',
  learningFocus:
    'Talking about strengths with an example; answering "Tell me about yourself"; checking details.',
  canDos: { life: 'say-what-youre-good-at', work: 'tell-me-about-yourself' },
  phrases: ['im-good-at', 'for-example', 'id-love-to', 'just-to-confirm'],
  realWeek:
    '"Tell me about yourself, for real": Pip asks about your own job or study, picking up what you said in week 1.',
  practice:
    'Teach the yapling: explain three job words Pip copied from the Hollowbrook poster (deadline, team, shift).',
  stageScaling:
    'Neighbour: Sol asks one more follow-up after the example. Regular+: a weakness and a time you solved a problem. Local+: a hypothetical, and Sol digs deeper.',
  lines: [
    's1-e2-01',
    's1-e2-02',
    's1-e2-03',
    's1-e2-11',
    's1-e2-12',
    's1-e2-09',
    's1-e2-10',
    's1-e2-06',
    's1-e2-visitor-practise',
    's1-e2-visitor-pip-me',
    's1-e2-visitor-sol-hi',
    's1-e2-visitor-sol-you',
    's1-e2-visitor-sol-good',
    's1-e2-visitor-sol-mornings',
    's1-e2-visitor-sol-bye',
    's1-e2-visitor-pip-done',
    's1-e2-rw-open',
    's1-e2-rw-close',
    's1-e2-pr-open',
    's1-e2-pr-close',
    's1-e2-story-01',
    's1-e2-story-02',
    's1-e2-story-03',
    's1-e2-story-04',
    's1-e2-story-05',
    's1-e2-story-06',
    's1-e2-13',
    's1-e2-08',
  ],
  cliffhanger: 's1-e2-13',
  recap: 's1-e2-08',
  draft: false,
  // Sol's postcard says "See you on Thursday", so it comes on day 1, before the interview.
  week: [
    { day: 1, scene: 's1-e2-postcard' },
    { day: 1, scene: 's1-e2' },
    { day: 2, scene: 's1-e2-story' },
    { day: 3, scene: 's1-e2-real-week' },
    { day: 4, scene: 's1-e2-practice' },
    { day: 5, scene: 's1-e2-voicemail' },
  ],
  scenes: [
    S1_E2_CALL,
    postcards(
      {
        id: 's1-e2-postcard',
        title: 'Postcard from Sol',
        summary: 'Sol says hello before the interview, with a tip.',
      },
      [['sol', 's1-e2-01']],
    ),
    pipStory(
      {
        id: 's1-e2-story',
        title: 'Too much tie',
        summary:
          'Before its interview, Pip tried on three things: too much hat, too much coat, too much tie.',
        phrases: ['id-love-to'],
      },
      [
        's1-e2-story-01',
        's1-e2-story-02',
        's1-e2-story-03',
        's1-e2-story-04',
        's1-e2-story-05',
        's1-e2-story-06',
      ],
    ),
    S1_E2_REAL_WEEK,
    S1_E2_PRACTICE,
    voicemail({
      id: 's1-e2-voicemail',
      title: 'Pip left you a voicemail',
      summary: 'Pip got the job. And a big man wants cheaper coffee beans from Mei.',
      from: 'pip',
      line: 's1-e2-13',
    }),
  ],
};
