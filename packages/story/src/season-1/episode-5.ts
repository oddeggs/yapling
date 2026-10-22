import { gen, learner, rec, scene, seconds, ui } from '../build';
import type { Answer, Episode, GlossedText } from '../types';
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
import { praiseFor } from './shared-lines';
import { card, task, THANKS, visitorCards } from './visitor';

/*
 * Episode 5, "The Petition", and its week (`season-1-script.md`, "Episode 5"). Pip rides Bus 45
 * collecting signatures and the learner pitches at each stop; Bea voices the passengers she
 * drives. Stop 3 is week 1's Pass it on with a point, so the after-call card can set the two
 * side by side. A Visitor reads one card line per stop, modelled by Bea first, and everyone signs.
 */

const stop = (
  frame: string,
  time: ReturnType<typeof seconds>,
  phrases: readonly string[],
): Answer =>
  turn({
    listener: 'bea',
    expects: 'Pitches the petition to the passenger within the time.',
    phrases,
    canDo: 'pitch-45s',
    timer: time,
    onTargetError: 'accept',
    hint: englishOnly(frame),
    maxTries: 2,
    stuck: 'Whisper a start for the learner: "Here\'s the thing: the café might close."',
    by: 'pip',
  });

const SIGN_CARDS = [
  card("Please sign. It's for Mei's café.", 'Ký giúp nhé. Là để giúp quán của Mei.'),
  card('Hello! Please sign.', 'Xin chào! Ký giúp nhé.'),
] as const;

/** A Visitor stop: two cards to read, Bea's line the model, and the timer ring. */
const visitorStop = (
  choices: readonly [GlossedText, GlossedText],
  accept: readonly string[],
  time: number,
  taskCard?: GlossedText,
): Answer => ({
  ...visitorCards({
    listener: 'bea',
    choices,
    accept,
    phrases: ['would-you-sign'],
    canDo: 'pitch-45s',
    model: 's1-e5-visitor-bea-model',
    praise: [],
    ...(taskCard === undefined ? {} : { task: taskCard }),
  }),
  timer: seconds(time),
});

export const S1_E5_CALL = scene({
  id: 's1-e5',
  kind: 'episode',
  title: 'The Petition',
  place: 'bus-45',
  cast: ['bea', 'pip'],
  summary:
    'On Bus 45, Pip collects signatures for the petition. At each stop the learner pitches it to a new passenger, shorter and better each time, and Bea signs last.',
  goal: 'Pitch the petition three times, shorter and better each time.',
  canDos: ['short-story-with-a-point', 'pitch-45s'],
  phrases: ['heres-the-thing', 'it-matters-because', 'would-you-sign', 'thanks-for-listening'],
  beats: [
    rec('board', 's1-e5-09', N),
    rec('pip-nervous', 's1-e5-08', N),
    gen('commuter', 'bea', 'Voice a sleepy, kind commuter: ask what the petition is for.', {
      ...N,
      constraints: ['You are a passenger now, not Bea.'],
      example: 'Mm? A petition? What for?',
      answer: stop(
        "Here's the thing: … It matters because … Would you sign?",
        seconds(90, { neighbour: 75, regular: 60 }),
        ['heres-the-thing', 'it-matters-because', 'would-you-sign'],
      ),
    }),
    gen('commuter-asks', 'bea', 'As the commuter, ask one simple question about the café.', {
      ...N,
      constraints: ['You are a passenger now, not Bea.'],
      example: 'Is the café nice?',
      answer: turn({
        listener: 'bea',
        expects: 'Answers the commuter.',
        hint: hint(
          'Yes! The kaya toast is the best in town.',
          'Có chứ! Bánh mì nướng kaya ở đó ngon nhất thị trấn.',
        ),
        onTargetError: 'accept',
        stuck: 'As the commuter, yawn, smile and say you will try it.',
      }),
    }),
    gen('commuter-signs', 'pip', 'The commuter signs. Count quietly, delighted.', {
      ...N,
      example: 'Seventy-one!',
    }),
    gen('local-objection-1', 'bea', 'As the commuter, raise one objection before signing.', {
      minStage: 'local',
      constraints: ['You are a passenger now, not Bea.'],
      example: 'But the big café is cheaper, no?',
      answer: turn({
        listener: 'bea',
        expects: 'Answers the objection and keeps the pitch.',
        phrases: ['fair-point-but'],
        hint: hint("That's a fair point, but …", 'Cũng có lý, nhưng …'),
        stuck: 'As the commuter, shrug and sign anyway.',
      }),
    }),
    gen('parent', 'bea', 'Voice a parent in a hurry: why should they sign?', {
      ...N,
      constraints: ['You are a passenger now, not Bea.'],
      example: 'Quickly, please. Why should I sign?',
      answer: stop(
        'It matters because … Would you sign? Thanks for listening!',
        seconds(60, { neighbour: 50, regular: 45 }),
        ['it-matters-because', 'thanks-for-listening'],
      ),
    }),
    gen('parent-signs', 'bea', 'As the parent, sign, already walking off.', {
      ...N,
      constraints: ['You are a passenger now, not Bea.'],
      example: 'Done. Good luck!',
    }),
    gen('voice-sceptic', 'bea', 'Voice a sceptical passenger who argues back once.', {
      minStage: 'voice',
      constraints: ['You are a passenger now, not Bea.'],
      example: 'One café? The town has others.',
      answer: turn({
        listener: 'bea',
        expects: 'Persuades the sceptic, calmly.',
        phrases: ['heres-the-thing', 'it-matters-because'],
        hint: hint("Here's the thing: …", 'Chuyện là thế này: …'),
        stuck: 'As the sceptic, grumble that it was a good answer, and sign.',
      }),
    }),
    gen('tourist', 'bea', 'Voice a tourist off a boat from the harbour: what café?', {
      ...N,
      constraints: ['You are a passenger now, not Bea.'],
      example: "I'm only visiting. What café?",
      answer: stop(
        "Here's the thing: the Lantern Café is the heart of the town. …",
        seconds(45, { neighbour: 40, regular: 30 }),
        ['heres-the-thing', 'it-matters-because'],
      ),
    }),
    gen('tourist-asks', 'bea', 'As the tourist, sign and ask the way to the café.', {
      ...N,
      constraints: ['You are a passenger now, not Bea.'],
      example: 'How do I get there?',
      answer: turn({
        listener: 'bea',
        expects: 'Gives the way to the café.',
        canDo: 'short-story-with-a-point',
        hint: hint(
          "Go along the harbour. It's next to the bus stop.",
          'Đi dọc bến cảng. Quán ở ngay cạnh trạm xe buýt.',
        ),
        onTargetError: 'accept',
        stuck: 'As the tourist, spot the café sign from the window. Say thanks.',
      }),
    }),
    rec('count', 's1-e5-03', N),
    rec('bea-signs', 's1-e5-04', N),
    learner(
      'thank-bea',
      turn({
        listener: 'bea',
        expects: 'Thanks Bea for listening.',
        phrases: ['thanks-for-listening'],
        hint: hint('Thanks for listening, Bea!', 'Cảm ơn Bea đã lắng nghe!'),
        onTargetError: 'accept',
        maxTries: 2,
        stuck: 'Say "Any time, love" and sign with a flourish.',
      }),
      N,
    ),
    rec('close', 's1-e5-10', N),
    ui('mirror', { type: 'fluency_mirror', round: 3 }, N),

    // At Visitor: one card line per stop, modelled by Bea; everyone signs.
    rec('board-visitor', 's1-e5-visitor-bea', V),
    rec('model-visitor', 's1-e5-visitor-bea-model', V),
    rec('pip-nervous-visitor', 's1-e5-visitor-pip', V),
    gen('commuter-visitor', 'bea', 'As a sleepy commuter, look up.', {
      ...V,
      constraints: [VISITOR_LINE, 'You are a passenger now, not Bea.'],
      example: 'Hm? Yes?',
      answer: visitorStop(
        SIGN_CARDS,
        ['sign', 'please', 'café', 'cafe'],
        20,
        task(
          'At each stop, read the card to one passenger. Everyone will sign.',
          'Mỗi trạm, đọc thẻ cho một hành khách. Ai cũng sẽ ký.',
        ),
      ),
    }),
    gen('commuter-signs-visitor', 'bea', 'As the commuter, sign.', {
      ...V,
      constraints: [VISITOR_LINE, 'You are a passenger now, not Bea.'],
      example: 'Okay! Here you go.',
      answer: visitorCards({
        listener: 'bea',
        choices: [card('Thank you!', 'Cảm ơn!')],
        accept: [...THANKS],
        praise: [],
      }),
    }),
    gen('parent-visitor', 'bea', 'As a parent in a hurry, say quick.', {
      ...V,
      constraints: [VISITOR_LINE, 'You are a passenger now, not Bea.'],
      example: 'Quick, please!',
      answer: visitorStop(SIGN_CARDS, ['sign', 'please', 'café', 'cafe'], 20),
    }),
    gen('parent-signs-visitor', 'bea', 'As the parent, sign and go.', {
      ...V,
      constraints: [VISITOR_LINE, 'You are a passenger now, not Bea.'],
      example: 'Done. Bye!',
    }),
    gen('tourist-visitor', 'bea', 'As a tourist, ask what café.', {
      ...V,
      constraints: [VISITOR_LINE, 'You are a passenger now, not Bea.'],
      example: 'What café?',
      answer: visitorStop(
        [
          card("Mei's café. It's very good.", 'Quán của Mei. Ngon lắm.'),
          card('The Lantern Café. Please sign.', 'Quán Lantern. Ký giúp nhé.'),
        ],
        ['café', 'cafe', 'mei', 'sign', 'good'],
        15,
      ),
    }),
    gen('tourist-signs-visitor', 'bea', 'As the tourist, sign and thank them.', {
      ...V,
      constraints: [VISITOR_LINE, 'You are a passenger now, not Bea.'],
      example: 'Okay! Thank you.',
    }),
    rec('count-visitor', 's1-e5-visitor-count', V),
    rec('bea-signs-visitor', 's1-e5-visitor-bea-signs', V),
    learner(
      'thank-bea-visitor',
      visitorCards({
        listener: 'bea',
        choices: [
          card('Thank you, Bea!', 'Cảm ơn Bea!'),
          card('Thanks for listening!', 'Cảm ơn bạn đã lắng nghe!'),
        ],
        accept: [...THANKS],
        phrases: ['thanks-for-listening'],
        praise: praiseFor('bea'),
      }),
      V,
    ),
    rec('close-visitor', 's1-e5-visitor-pip-100', V),
  ],
});

export const S1_E5_REAL_WEEK = scene({
  id: 's1-e5-real-week',
  kind: 'real_week',
  title: 'Your 60-second pitch',
  place: 'hollowbrook-office',
  cast: ['dex'],
  summary:
    'Dex helps the learner make a 60-second pitch about themselves, for a boss, a client or an interview, then try it once more with one thing added.',
  goal: 'Give a 60-second pitch about yourself, then make it better.',
  canDos: ['pitch-45s'],
  phrases: ['heres-the-thing', 'im-good-at', 'for-example', 'it-matters-because'],
  beats: [
    rec('open', 's1-e5-rw-open', N),
    gen('dex-who', 'dex', 'Ask who the pitch is for: a boss, a client, or an interview?', {
      ...N,
      example: 'Who is it for? A boss, a client, or an interview?',
      answer: turn({
        listener: 'dex',
        expects: 'Says who the pitch is for.',
        hint: hint(
          "It's for … (my boss / a client / an interview).",
          'Để nói với … (sếp / khách hàng / người phỏng vấn).',
        ),
        stuck: 'Pick an interview for them, kindly, and go on.',
      }),
    }),
    gen('dex-plays', 'dex', 'Play that person in one line, then give them sixty seconds.', {
      ...N,
      example: "I'm the manager. Sixty seconds. Go when you're ready.",
      answer: turn({
        listener: 'dex',
        expects: 'Gives a pitch about themselves within the time.',
        phrases: ['heres-the-thing', 'im-good-at', 'for-example', 'it-matters-because'],
        canDo: 'pitch-45s',
        timer: seconds(60, { neighbour: 50, regular: 45 }),
        onTargetError: 'accept',
        hint: hint(
          "Here's the thing: I'm … I'm good at … For example, … It matters because …",
          'Chuyện là thế này: mình là … Mình giỏi … Ví dụ, … Điều đó quan trọng vì …',
        ),
        maxTries: 2,
        stuck: 'Offer the first line: "Start with your name and your job."',
      }),
    }),
    gen(
      'dex-coaches',
      'dex',
      'Name one strong thing, and one thing to add: a number or an example.',
      {
        ...N,
        example: 'Strong start. Now add one number.',
        answer: turn({
          listener: 'dex',
          expects: 'Gives the pitch once more, with that one thing added.',
          phrases: ['heres-the-thing', 'for-example'],
          canDo: 'pitch-45s',
          timer: seconds(60, { neighbour: 50, regular: 45 }),
          onTargetError: 'accept',
          hint: hint('Same pitch, plus one number.', 'Như lúc nãy, thêm một con số.'),
          maxTries: 2,
          stuck: 'Say the first one was already good, and you will take it.',
        }),
      },
    ),
    rec('close', 's1-e5-rw-close', N),

    // At Visitor: week 1's self-introduction, now with "I'm good at".
    gen('dex-asks-visitor', 'dex', 'Say your name, and ask them to tell you about them.', {
      ...V,
      constraints: [VISITOR_LINE],
      example: "I'm Dex. Tell me about you!",
      answer: visitorCards({
        listener: 'dex',
        choices: [card("Hi, I'm {name}.", 'Xin chào, mình là {name}.')],
        accept: ['hi', 'hello', "i'm", 'i am', '{name}'],
        task: task('Introduce yourself: one line at a time.', 'Giới thiệu bản thân: từng câu một.'),
      }),
    }),
    learner(
      'job-visitor',
      visitorCards({
        listener: 'dex',
        choices: [card("I'm a …", 'Mình là …'), card('I work at …', 'Mình làm ở …')],
        accept: ["i'm a", 'i am a', "i'm an", 'i am an', 'i work', 'job', 'student', 'office'],
      }),
      V,
    ),
    learner(
      'good-at-visitor',
      visitorCards({
        listener: 'dex',
        choices: [card("I'm good at …", 'Mình giỏi …')],
        accept: ['good'],
        phrases: ['im-good-at'],
      }),
      V,
    ),
    learner(
      'all-visitor',
      visitorCards({
        listener: 'dex',
        choices: [
          card(
            "Hi, I'm {name}. I'm a … I'm good at …",
            'Xin chào, mình là {name}. Mình là … Mình giỏi …',
          ),
        ],
        accept: ['hi', "i'm", 'i am', 'good', '{name}'],
        expects:
          'Says all three lines in a row: hello and their name, their job, what they are good at.',
        canDo: 'pitch-45s',
        task: task('Now say all three lines together.', 'Giờ nói cả ba câu liền nhau nhé.'),
      }),
      V,
    ),
    gen('dex-great-visitor', 'dex', 'Say it was a great pitch.', {
      ...V,
      constraints: [VISITOR_LINE],
      example: 'Great pitch! Well done.',
    }),
  ],
});

const round = (
  listener: 'linh' | 'mei' | 'bea',
  frame: string,
  time: ReturnType<typeof seconds>,
): Answer =>
  turn({
    listener,
    expects: 'Tells the story of the petition ride, within the time.',
    canDo: 'short-story-with-a-point',
    timer: time,
    onTargetError: 'accept',
    hint: englishOnly(frame),
    maxTries: 2,
    stuck: 'Ask one simple question to get them started: "How did it start?"',
  });

const NEWCOMER_FRAME = 'First, … Then, … In the end, …';
const VISITOR_FRAME = 'We got a hundred names. / Bea signed last. / Mei is happy.';

export const S1_E5_PRACTICE = scene({
  id: 's1-e5-practice',
  kind: 'practice',
  title: 'Pass it on',
  place: 'bus-45',
  cast: ['pip', 'linh', 'mei', 'bea'],
  summary:
    "Linh and Mei weren't on the bus. The learner tells them the petition story, then Bea at the last stop: three times, less time each.",
  goal: 'Tell the petition story three times, shorter and smoother each time.',
  canDos: ['short-story-with-a-point'],
  beats: [
    rec('open', 's1-e5-pr-open', N),
    gen(
      'pip-asks-visitor',
      'pip',
      'Ask the learner to tell Linh the petition story: thirty seconds.',
      {
        ...V,
        constraints: [VISITOR_LINE],
        example: 'Tell Linh our story! Thirty seconds.',
      },
    ),
    learner(
      'round-1',
      round('linh', NEWCOMER_FRAME, seconds(90, { neighbour: 75, regular: 60 })),
      N,
    ),
    learner('round-1-visitor', round('linh', VISITOR_FRAME, seconds(30)), V),
    ui('mirror-1', { type: 'fluency_mirror', round: 1 }),
    gen('mei-asks', 'mei', 'Say Linh told you a bit, and ask to hear it too: one minute.', {
      ...N,
      example: 'Linh told me a bit. Tell me too? One minute.',
    }),
    gen('mei-asks-visitor', 'mei', 'Ask to hear the story too: twenty-five seconds.', {
      ...V,
      constraints: [VISITOR_LINE],
      example: 'Tell me too! Twenty-five seconds.',
    }),
    learner(
      'round-2',
      round('mei', NEWCOMER_FRAME, seconds(60, { neighbour: 50, regular: 45 })),
      N,
    ),
    learner('round-2-visitor', round('mei', VISITOR_FRAME, seconds(25)), V),
    ui('mirror-2', { type: 'fluency_mirror', round: 2 }),
    gen('bea-asks', 'bea', 'At the last stop: their turn, before the next stop.', {
      ...N,
      example: 'Your turn, love. Before the next stop!',
    }),
    gen('bea-asks-visitor', 'bea', 'Ask for the story: twenty seconds.', {
      ...V,
      constraints: [VISITOR_LINE],
      example: 'Your turn, love! Twenty seconds.',
    }),
    learner(
      'round-3',
      round('bea', NEWCOMER_FRAME, seconds(45, { neighbour: 40, regular: 30 })),
      N,
    ),
    learner('round-3-visitor', round('bea', VISITOR_FRAME, seconds(20)), V),
    ui('mirror-3', { type: 'fluency_mirror', round: 3 }),
    rec('close', 's1-e5-pr-close', N),
    gen('pip-close-visitor', 'pip', 'Cheer: three friends heard the story.', {
      ...V,
      constraints: [VISITOR_LINE],
      example: 'Three friends! Great story!',
    }),
  ],
});

export const S1_E5: Episode = {
  id: 's1-e5',
  number: 5,
  title: 'The Petition',
  place: 'bus-45',
  cast: ['bea', 'pip'],
  logline:
    'Pip rides Bus 45 collecting signatures. At each stop you have a few seconds to convince a passenger. "Pass it on" becomes the story.',
  learningFocus:
    'Short persuasive pitch; telling a story with a point; adapting the same message to different listeners.',
  canDos: { life: 'short-story-with-a-point', work: 'pitch-45s' },
  phrases: ['heres-the-thing', 'it-matters-because', 'would-you-sign', 'thanks-for-listening'],
  realWeek: 'Your own 60-second self-pitch (for work, a client or an interview), with Dex.',
  practice:
    "Pass it on on Bus 45: tell the petition story to Linh and Mei, who weren't on the bus, then to Bea (90/60/45 s).",
  stageScaling:
    'Times: Newcomer 90/60/45 s · Neighbour 75/50/40 · Regular 60/45/30 · Local adds an objection at every stop · Voice adds a sceptical passenger who argues back.',
  lines: [
    's1-e5-09',
    's1-e5-08',
    's1-e5-03',
    's1-e5-04',
    's1-e5-10',
    's1-e5-visitor-bea',
    's1-e5-visitor-bea-model',
    's1-e5-visitor-pip',
    's1-e5-visitor-count',
    's1-e5-visitor-bea-signs',
    's1-e5-visitor-pip-100',
    's1-e5-rw-open',
    's1-e5-rw-close',
    's1-e5-pr-open',
    's1-e5-pr-close',
    's1-e5-story-01',
    's1-e5-story-02',
    's1-e5-story-03',
    's1-e5-story-04',
    's1-e5-story-05',
    's1-e5-story-06',
    's1-e5-11',
    's1-e5-06',
    's1-e5-12',
  ],
  cliffhanger: 's1-e5-06',
  recap: 's1-e5-12',
  draft: false,
  // Pip's story moves to day 2, with the postcard, so day 3 is the real-week call.
  week: [
    { day: 1, scene: 's1-e5' },
    { day: 2, scene: 's1-e5-story' },
    { day: 2, scene: 's1-e5-postcard' },
    { day: 3, scene: 's1-e5-real-week' },
    { day: 4, scene: 's1-e5-practice' },
    { day: 5, scene: 's1-e5-voicemail' },
  ],
  scenes: [
    S1_E5_CALL,
    pipStory(
      {
        id: 's1-e5-story',
        title: 'The street light',
        summary:
          'Before Bus 45, Pip practised its pitch on a street light. The light did not sign, but a bird listened.',
        phrases: ['heres-the-thing'],
      },
      [
        's1-e5-story-01',
        's1-e5-story-02',
        's1-e5-story-03',
        's1-e5-story-04',
        's1-e5-story-05',
        's1-e5-story-06',
      ],
    ),
    postcards(
      {
        id: 's1-e5-postcard',
        title: 'Postcard from Bea',
        summary: 'Bea says when Bus 45 leaves, and asks for the best story.',
      },
      [['bea', 's1-e5-11']],
    ),
    S1_E5_REAL_WEEK,
    S1_E5_PRACTICE,
    voicemail({
      id: 's1-e5-voicemail',
      title: 'Mei left you a voicemail',
      summary:
        'A hundred names: the town will vote on Saturday, and Mei asks the learner to speak.',
      from: 'mei',
      line: 's1-e5-06',
    }),
  ],
};
