import { answer, gen, learner, rec, scene, seconds, ui } from '../build';
import { glossed, NO_GLOSS, viDesign, viDraft } from '../gloss';
import { card, task, visitorCards } from './visitor';

const V = { maxStage: 'visitor' } as const;
const N = { minStage: 'newcomer' } as const;

/** A Visitor-row live line. */
const VISITOR_LINE = 'One short sentence, eight words at most. Simple, slow English.';

/*
 * The rest of Episode 1's week: Pip's voice story and Linh's postcard (nothing to fail, no live
 * minutes), the real-week call (teach Pip to introduce yourself at work), the first Pass it on on
 * Bus 45, and the cliffhanger voicemail with Pip's slightly wrong phrase to fix.
 *
 * Visitors (`season-1-script.md`, "Week 1 for Visitors") get an untimed introduction one line at a
 * time and shorter Pass it on rounds, in the same scenes. The postcard and the voicemail play on
 * the phone, which reads every beat of a scene, so their Visitor versions are scenes of their own
 * (`VISITOR_VERSIONS`): Linh's "again" postcard, and the fix as a card.
 */

export const S1_E1_STORY = scene({
  id: 's1-e1-story',
  kind: 'story',
  title: 'Pip got lost',
  place: 'burrow',
  cast: ['pip'],
  summary: "Pip's first walk around town: it got lost and asked a seagull for directions.",
  goal: 'Listen to a short story.',
  phrases: ['can-i-help'],
  beats: [rec('seagull', 's1-e1-story-seagull')],
});

export const S1_E1_POSTCARD = scene({
  id: 's1-e1-postcard',
  kind: 'postcard',
  title: 'Postcard from Linh',
  place: 'burrow',
  cast: ['linh'],
  summary: 'A postcard from Linh with a tip for forgotten words.',
  goal: 'Read and listen to a tip.',
  beats: [ui('postcard', { type: 'postcard', from: 'linh' }), rec('tip', 's1-e1-01')],
});

export const S1_E1_POSTCARD_VISITOR = scene({
  id: 's1-e1-postcard-visitor',
  kind: 'postcard',
  title: 'Postcard from Linh',
  place: 'burrow',
  cast: ['linh'],
  summary: 'A postcard from Linh: the lifesaver always works.',
  goal: 'Read and listen to a tip.',
  phrases: ['sorry-again-please'],
  beats: [ui('postcard', { type: 'postcard', from: 'linh' }), rec('tip', 's1-e1-visitor-postcard')],
});

const introAnswer = (expects: string, hint: ReturnType<typeof glossed>) =>
  answer({
    listener: 'pip',
    expects,
    canDo: 'introduce-yourself-30s',
    timer: seconds(30),
    hint,
    fallback: {
      speaker: 'pip',
      intent:
        "Help kindly: offer to go first with the learner's name and job if you know them, then say it was a good start.",
    },
  });

export const S1_E1_REAL_WEEK = scene({
  id: 's1-e1-real-week',
  kind: 'real_week',
  title: 'Introduce yourself at work',
  place: 'burrow',
  cast: ['pip'],
  summary:
    'Pip starts at Hollowbrook soon and has to introduce itself at work. It asks the learner how people do that, and the learner introduces their own job.',
  goal: 'Introduce yourself and your job in 30 seconds.',
  canDos: ['introduce-yourself-30s'],
  beats: [
    gen(
      'pip-asks',
      'pip',
      'Say you have to introduce yourself at Hollowbrook. Ask how people introduce themselves at work, and ask the learner to show you with their own job.',
      {
        ...N,
        example:
          'At Hollowbrook, I have to say who I am. How do people introduce themselves at work?',
      },
    ),
    gen(
      'pip-asks-visitor',
      'pip',
      'Say you have to say who you are at Hollowbrook, and ask the learner to show you.',
      { ...V, constraints: [VISITOR_LINE], example: 'At work, I say my name. Show me?' },
    ),
    learner(
      'intro-hi-visitor',
      visitorCards({
        listener: 'pip',
        choices: [card("Hi, I'm {name}.", 'Xin chào, mình là {name}.')],
        accept: ['hi', 'hello', "i'm", 'i am', 'my name', '{name}'],
        canDo: 'introduce-yourself-30s',
        task: task('Introduce yourself: one line at a time.', 'Giới thiệu bản thân: từng câu một.'),
      }),
      V,
    ),
    learner(
      'intro-job-visitor',
      visitorCards({
        listener: 'pip',
        choices: [card("I'm a …", 'Mình là …'), card('I work at …', 'Mình làm ở …')],
        accept: ["i'm a", 'i am a', "i'm an", 'i am an', 'i work', 'job', 'student', 'office'],
        canDo: 'introduce-yourself-30s',
      }),
      V,
    ),
    learner(
      'intro-nice-visitor',
      visitorCards({
        listener: 'pip',
        choices: [card('Nice to meet you.', 'Rất vui được gặp bạn.')],
        accept: ['nice', 'meet'],
        phrases: ['nice-to-meet-you'],
        canDo: 'introduce-yourself-30s',
      }),
      V,
    ),
    learner(
      'intro-all-visitor',
      // The learner's first three-sentence run; Pip tries it back next.
      visitorCards({
        listener: 'pip',
        choices: [
          card(
            "Hi, I'm {name}. I'm a … Nice to meet you.",
            'Xin chào, mình là {name}. Mình là … Rất vui được gặp bạn.',
          ),
        ],
        accept: ['hi', "i'm", 'i am', 'nice', 'meet', '{name}'],
        expects:
          'Says all three lines in a row: hello and their name, their job, nice to meet you.',
        canDo: 'introduce-yourself-30s',
        praise: [],
        task: task('Now say all three lines together.', 'Giờ nói cả ba câu liền nhau nhé.'),
      }),
      V,
    ),
    learner(
      'intro-1',
      introAnswer(
        'Introduces themselves and their job: name, job, one thing they do.',
        glossed(
          "Hi, I'm … I work as … I help …",
          viDesign('Xin chào, tôi là … Tôi làm … Tôi giúp …'),
        ),
      ),
      N,
    ),
    gen(
      'pip-tries',
      'pip',
      "Try it back using the learner's structure and words, with your own funny job at the café.",
      {
        example:
          "Let me try! Hi, I'm Pip. I'm a… dish analyst at Lantern Café. I turn dirty dishes into clean dishes.",
      },
    ),
    gen('pip-again', 'pip', 'Ask for one more try: their best one, in thirty seconds.', {
      ...N,
      example: 'Your turn again. Your best one. Thirty seconds!',
    }),
    learner(
      'intro-2',
      introAnswer(
        'A shorter, clearer introduction: name, job, one thing they do.',
        glossed(
          'Shorter: name, job, one thing you do.',
          viDraft('Ngắn hơn: tên, nghề, một việc bạn làm.'),
        ),
      ),
      N,
    ),
    gen(
      'pip-notes',
      'pip',
      "Celebrate what got better (shorter, clearer) and write the learner's introduction in your notebook.",
      { ...N, example: "Shorter and clearer! I'm writing that down." },
    ),
    gen(
      'pip-notes-visitor',
      'pip',
      "Cheer the learner's three lines and write them in your notebook.",
      {
        ...V,
        constraints: [VISITOR_LINE],
        example: 'Three lines! Writing them down.',
      },
    ),
  ],
});

/**
 * Pass it on: one story, three listeners, less time each round (4/3/2). No first-language help.
 * A Visitor's rounds are 30, 25 and 20 seconds, with the frame on an English card from the start.
 */
const round = (listener: 'pip' | 'linh' | 'bea', time: ReturnType<typeof seconds>) =>
  answer({
    listener,
    expects: 'Tells the same story about their day, within the time.',
    canDo: 'short-story-with-a-point',
    timer: time,
    onTargetError: 'accept',
    hint: glossed('Today I … Then … In the end …', NO_GLOSS),
    maxTries: 2,
    fallback: {
      speaker: listener,
      intent: 'Ask one simple question about their day to get them started, kindly.',
    },
  });

export const S1_E1_PRACTICE = scene({
  id: 's1-e1-practice',
  kind: 'practice',
  title: 'Pass it on',
  place: 'bus-45',
  cast: ['pip', 'linh', 'bea'],
  summary:
    'Waiting for Bus 45. The learner tells the same story about their day three times: to Pip, to Linh, then to Bea before the next stop.',
  goal: 'Tell the same story three times, shorter and smoother each time.',
  canDos: ['short-story-with-a-point'],
  beats: [
    gen(
      'pip-asks',
      'pip',
      'Bus 45 is late. Ask the learner to tell you about their day while you wait: ninety seconds.',
      { ...N, example: 'Bus 45 is late. Tell me about your day while we wait! Ninety seconds.' },
    ),
    gen('pip-asks-visitor', 'pip', "Bus 45 is late. Ask about the learner's day: thirty seconds.", {
      ...V,
      constraints: [VISITOR_LINE],
      example: 'Tell me about your day! Thirty seconds.',
    }),
    learner('round-1', round('pip', seconds(90, { visitor: 30, neighbour: 75, regular: 60 }))),
    ui('mirror-1', { type: 'fluency_mirror', round: 1 }),
    gen(
      'linh-asks',
      'linh',
      'Pip told you they had a day worth hearing. Ask to hear it too: one minute.',
      {
        ...N,
        example: 'Pip says you had a busy day! Tell me too. One minute?',
      },
    ),
    gen(
      'linh-asks-visitor',
      'linh',
      "Ask to hear about the learner's day too: twenty-five seconds.",
      {
        ...V,
        constraints: [VISITOR_LINE],
        example: 'Tell me too! Twenty-five seconds.',
      },
    ),
    learner('round-2', round('linh', seconds(60, { visitor: 25, neighbour: 50, regular: 45 }))),
    ui('mirror-2', { type: 'fluency_mirror', round: 2 }),
    gen('bea-asks', 'bea', 'The bus arrives. Ask for the story before the next stop.', {
      ...N,
      example: "Morning, love! Go on then, tell me. You've got till the next stop.",
    }),
    gen('bea-asks-visitor', 'bea', 'The bus arrives. Ask for the story: twenty seconds.', {
      ...V,
      constraints: [VISITOR_LINE],
      example: 'Morning, love! Your day? Twenty seconds.',
    }),
    learner('round-3', round('bea', seconds(45, { visitor: 20, neighbour: 40, regular: 30 }))),
    ui('mirror-3', { type: 'fluency_mirror', round: 3 }),
    gen('bea-thanks', 'bea', 'Thank them warmly for the story.', {
      example: 'Cheers, love. Lovely story, that.',
    }),
  ],
});

export const S1_E1_VOICEMAIL = scene({
  id: 's1-e1-voicemail',
  kind: 'voicemail',
  title: 'Pip left you a voicemail',
  place: 'burrow',
  cast: ['pip'],
  summary:
    'Pip has big news: an interview at Hollowbrook on Thursday. Then it uses "Can I help?" slightly wrong, and the learner fixes it.',
  goal: 'Fix Pip\'s phrase: "Can I help you?"',
  phrases: ['can-i-help'],
  beats: [
    ui('voicemail', { type: 'voicemail', from: 'pip' }),
    rec('news', 's1-e1-10'),
    rec('oops', 's1-e1-vm-oops'),
    learner(
      'fix-pip',
      answer({
        listener: 'pip',
        expects: 'Corrects Pip: "Can I help you?"',
        phrases: ['can-i-help'],
        onTargetError: 'hint',
        hint: glossed("We say: 'Can I help you?'", viDesign('Mình nói là "Can I help you?"')),
        fallback: {
          speaker: 'pip',
          intent: 'Work it out yourself, happily: "Wait… Can I help you? Yes!"',
        },
      }),
    ),
    ui('leaf', { type: 'phrase_grows', phrase: 'can-i-help' }),
    rec('thanks', 's1-e1-vm-thanks'),
  ],
});

export const S1_E1_VOICEMAIL_VISITOR = scene({
  id: 's1-e1-voicemail-visitor',
  kind: 'voicemail',
  title: 'Pip left you a voicemail',
  place: 'burrow',
  cast: ['pip'],
  summary:
    'Pip has big news: an interview at Hollowbrook on Thursday. Then it uses "Can I help?" slightly wrong, and the learner reads the right words from a card.',
  goal: 'Fix Pip\'s phrase: "Can I help you?"',
  phrases: ['can-i-help'],
  beats: [
    ui('voicemail', { type: 'voicemail', from: 'pip' }),
    rec('news', 's1-e1-10'),
    rec('oops', 's1-e1-vm-oops'),
    learner(
      'fix-pip',
      // Pip thanks the learner next.
      visitorCards({
        listener: 'pip',
        choices: [card('Can I help you?', 'Mình giúp gì được cho bạn?')],
        accept: ['help you', 'can i help'],
        phrases: ['can-i-help'],
        praise: [],
        task: task(
          'Pip said it wrong. Read Pip the right words.',
          'Pip nói sai. Đọc câu đúng cho Pip nhé.',
        ),
      }),
    ),
    ui('leaf', { type: 'phrase_grows', phrase: 'can-i-help' }),
    rec('thanks', 's1-e1-vm-thanks'),
  ],
});
