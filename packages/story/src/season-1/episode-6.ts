import { gen, learner, rec, scene, seconds, ui } from '../build';
import type { Episode, GlossedText } from '../types';
import { S1_E6_REAL_WEEK } from './episode-6-calls';
import { hint, N, pipStory, postcards, turn, V, VISITOR_LINE, voicemail } from './later-weeks';
import { AGAIN_WORDS, card, task, THANKS, visitorCards } from './visitor';

/*
 * Episode 6, "The Town Meeting", and its week (`season-1-script.md`, "Episode 6"): the finale in
 * the square. The learner speaks for the café, answers Hank's question, and the town votes. A
 * Visitor builds a three-line speech one line at a time, then says it all together. The practice
 * call answers the six well-done postcards, each with a phrase from a different episode.
 */

const SPEECH = hint(
  "I'd like to say a few words. First, … Second, … Thank you.",
  'Tôi xin phép nói vài lời. Thứ nhất, … Thứ hai, … Xin cảm ơn.',
);

export const S1_E6_CALL = scene({
  id: 's1-e6',
  kind: 'episode',
  title: 'The Town Meeting',
  place: 'town-square',
  cast: ['mei', 'mags', 'pip', 'hank'],
  summary:
    'The whole town meets in the square to vote on selling the café building. The learner speaks for the café, answers one question from the floor, and thanks the town. The café stays.',
  goal: 'Give a short structured speech, answer a question, and thank the town.',
  canDos: ['speak-to-a-group', 'make-a-case-take-a-question'],
  phrases: ['a-few-words', 'first-second', 'great-question', 'thank-you-all'],
  beats: [
    rec('practise-offer', 's1-e6-08', N),
    learner(
      'practise-choice',
      turn({
        listener: 'pip',
        expects: 'Says yes to one practice run, or says they are ready to go.',
        hint: hint("Yes, please. / No, let's go!", 'Có, tập nhé. / Thôi, đi luôn!'),
        onTargetError: 'accept',
        maxTries: 2,
        stuck: 'Say "Let\'s just go. You\'re ready!"',
      }),
      N,
    ),
    gen(
      'pip-rehearse',
      'pip',
      'If the learner wanted to practise, invite one untimed run of the speech now. If not, say they are ready and ask them to say just the first line, once.',
      {
        ...N,
        example: 'Okay! Just once. Go when you like.',
        answer: turn({
          listener: 'pip',
          expects: 'Runs through the speech once, or says its first line.',
          phrases: ['a-few-words', 'first-second'],
          hint: SPEECH,
          onTargetError: 'accept',
          maxTries: 2,
          stuck: 'Say the first line together with them, and cheer.',
        }),
      },
    ),
    gen(
      'pip-good-thing',
      'pip',
      'Name one good thing about what they said, then go to the square.',
      {
        ...N,
        example: 'Your "first, second" was so clear. Let\'s go!',
      },
    ),
    ui('crowd', { type: 'sfx', sound: 's1-e6-sfx-crowd-murmur' }, N),
    rec('mags-opens', 's1-e6-11', N),
    rec('pip-whisper', 's1-e6-12', N),
    learner(
      'speech',
      turn({
        listener: 'mags',
        expects: 'Gives a short structured speech for the café: an opening, two reasons, thanks.',
        phrases: ['a-few-words', 'first-second'],
        canDo: 'speak-to-a-group',
        timer: seconds(60, { neighbour: 75, regular: 90 }),
        onTargetError: 'accept',
        hint: SPEECH,
        maxTries: 2,
        stuck: 'Whisper the start for them: "I\'d like to say a few words…"',
        by: 'pip',
      }),
      N,
    ),
    gen(
      'hank-question',
      'hank',
      'From the crowd, ask one friendly but real question, at Newcomer speed: why does one café matter?',
      {
        ...N,
        example: 'One café. Why does it matter?',
        answer: turn({
          listener: 'hank',
          expects: 'Answers the question, with a reason.',
          phrases: ['great-question', 'it-matters-because'],
          canDo: 'make-a-case-take-a-question',
          hint: hint(
            "That's a great question. It matters because …",
            'Câu hỏi hay quá. Điều đó quan trọng vì …',
          ),
          onTargetError: 'accept',
          stuck: 'Nod slowly and say "Fair enough. I see it."',
        }),
      },
    ),
    gen(
      'neighbour-question',
      'mags',
      'Take one more question from the floor: how will Mei pay the rent?',
      {
        minStage: 'neighbour',
        example: 'A second question: how will Ms Mei pay the rent?',
        answer: turn({
          listener: 'mags',
          expects: 'Answers the second question.',
          phrases: ['great-question'],
          canDo: 'make-a-case-take-a-question',
          hint: hint("That's a great question. …", 'Câu hỏi hay quá. …'),
          stuck: 'Thank them and say the town will help.',
        }),
      },
    ),
    gen(
      'regular-objection',
      'mags',
      "Raise the office's objection, formally: Big Bean pays more.",
      {
        minStage: 'regular',
        example: 'The office notes that Big Bean has offered more.',
        answer: turn({
          listener: 'mags',
          expects: 'Answers the objection and makes the case again.',
          phrases: ['fair-point-but', 'it-matters-because'],
          canDo: 'make-a-case-take-a-question',
          hint: hint("That's a fair point, but …", 'Cũng có lý, nhưng …'),
          stuck: 'Say the town has heard both sides, and move to the vote.',
        }),
      },
    ),
    gen(
      'local-rival',
      'mags',
      "Read out a rival speaker's case for the sale, in two sentences, and invite a response.",
      {
        minStage: 'local',
        example: 'A speaker for Big Bean says the town needs jobs. Your response?',
        answer: turn({
          listener: 'mags',
          expects: "Responds to the rival's case.",
          phrases: ['fair-point-but', 'first-second'],
          canDo: 'make-a-case-take-a-question',
          hint: hint(
            'I understand, but … First, … Second, …',
            'Tôi hiểu, nhưng … Thứ nhất, … Thứ hai, …',
          ),
          stuck: 'Say the town has heard both sides, and move to the vote.',
        }),
      },
    ),
    ui('cheer', { type: 'sfx', sound: 's1-e6-sfx-crowd-cheer' }, N),
    rec('vote', 's1-e6-03', N),
    rec('mei-thanks', 's1-e6-10', N),
    learner(
      'thank-town',
      turn({
        listener: 'mei',
        expects: 'Thanks the town.',
        phrases: ['thank-you-all'],
        hint: hint('Thank you all. …', 'Cảm ơn tất cả mọi người. …'),
        onTargetError: 'accept',
        maxTries: 2,
        stuck: 'Shout "Thank you all!" for both of you.',
        by: 'pip',
      }),
      N,
    ),
    rec('flags', 's1-e6-09', N),
    rec('hank-orders', 's1-e6-07', N),
    rec('boat', 's1-e6-05', N),

    // At Visitor: a three-line speech, one line at a time, then all together.
    ui('crowd-visitor', { type: 'sfx', sound: 's1-e6-sfx-crowd-murmur' }, V),
    rec('mags-opens-visitor', 's1-e6-visitor-mags', V),
    rec('pip-whisper-visitor', 's1-e6-visitor-pip', V),
    learner(
      'speech-hello-visitor',
      visitorCards({
        listener: 'mags',
        choices: [card('Hello, everyone.', 'Chào mọi người.')],
        accept: ['hello', 'hi', 'everyone'],
        canDo: 'speak-to-a-group',
        task: task(
          'A three-line speech. Say one line at a time.',
          'Bài phát biểu ba câu. Nói từng câu một.',
        ),
      }),
      V,
    ),
    learner(
      'speech-love-visitor',
      visitorCards({
        listener: 'mags',
        choices: [card("I love Mei's café.", 'Mình rất yêu quán của Mei.')],
        accept: ['love', 'like', 'café', 'cafe'],
        canDo: 'speak-to-a-group',
      }),
      V,
    ),
    learner(
      'speech-yes-visitor',
      visitorCards({
        listener: 'mags',
        choices: [card('Please say yes. Thank you!', 'Mọi người đồng ý nhé. Cảm ơn!')],
        accept: ['please', 'yes', 'thank'],
        canDo: 'speak-to-a-group',
      }),
      V,
    ),
    learner(
      'speech-all-visitor',
      visitorCards({
        listener: 'mags',
        choices: [
          card(
            "Hello, everyone. I love Mei's café. Please say yes. Thank you!",
            'Chào mọi người. Mình rất yêu quán của Mei. Mọi người đồng ý nhé. Cảm ơn!',
          ),
        ],
        accept: ['hello', 'café', 'cafe', 'yes', 'thank'],
        expects: 'Says all three lines in a row.',
        canDo: 'speak-to-a-group',
        task: task('Now say all three lines together.', 'Giờ nói cả ba câu liền nhau nhé.'),
      }),
      V,
    ),
    rec('hank-question-visitor', 's1-e6-visitor-hank', V),
    learner(
      'answer-hank-visitor',
      visitorCards({
        listener: 'hank',
        choices: [
          card("It's our café.", 'Đó là quán của chúng ta.'),
          card('Mei is our friend.', 'Mei là bạn của chúng ta.'),
        ],
        accept: ['our', 'friend', 'café', 'cafe', 'mei'],
        canDo: 'make-a-case-take-a-question',
        task: task(
          'Hank asks a question. Pick a card to answer.',
          'Hank hỏi một câu. Chọn thẻ để trả lời.',
        ),
      }),
      V,
    ),
    rec('hank-yes-visitor', 's1-e6-visitor-hank-yes', V),
    ui('cheer-visitor', { type: 'sfx', sound: 's1-e6-sfx-crowd-cheer' }, V),
    rec('vote-visitor', 's1-e6-visitor-mags-vote', V),
    rec('mei-thanks-visitor', 's1-e6-visitor-mei', V),
    learner(
      'thank-town-visitor',
      visitorCards({
        listener: 'mei',
        choices: [card('Thank you all!', 'Cảm ơn tất cả mọi người!')],
        accept: ['thank', 'all', 'everyone'],
        phrases: ['thank-you-all'],
      }),
      V,
    ),
    rec('flags-visitor', 's1-e6-visitor-flags', V),
    rec('boat-visitor', 's1-e6-visitor-boat', V),
  ],
});

/** One well-done postcard, played at the neighbour's pace, then the learner's answer. */
interface Reply {
  readonly from: 'linh' | 'mei' | 'sol' | 'hank' | 'nell' | 'bea';
  readonly line: string;
  readonly hint: GlossedText;
  readonly phrases: readonly string[];
  readonly visitor: GlossedText;
  readonly accept: readonly string[];
}

const REPLIES: readonly Reply[] = [
  {
    from: 'linh',
    line: 's1-e6-postcard-linh',
    hint: hint("That's a great question! …", 'Câu hỏi hay quá! …'),
    phrases: ['great-question'],
    visitor: card('Thank you!', 'Cảm ơn!'),
    accept: [...THANKS],
  },
  {
    from: 'mei',
    line: 's1-e6-postcard-mei',
    hint: hint('I think you should …', 'Mình nghĩ bạn nên …'),
    phrases: ['i-think-you-should'],
    visitor: card('A party! Yes!', 'Tiệc! Đồng ý!'),
    accept: ['party', 'yes'],
  },
  {
    from: 'sol',
    line: 's1-e6-postcard-sol',
    hint: hint(
      "I'd love to! Just to confirm: Friday?",
      'Mình rất muốn! Cho mình xác nhận lại: thứ Sáu nhé?',
    ),
    phrases: ['id-love-to', 'just-to-confirm'],
    visitor: card('Yes, please!', 'Có, cảm ơn nhé!'),
    accept: ['yes', 'please', 'love'],
  },
  {
    from: 'hank',
    line: 's1-e6-postcard-hank',
    hint: hint('Deal!', 'Chốt!'),
    phrases: ['deal'],
    visitor: card('Deal!', 'Chốt!'),
    accept: ['deal', 'yes', 'okay', 'ok'],
  },
  {
    from: 'nell',
    line: 's1-e6-postcard-nell',
    hint: hint('Good idea, and …', 'Ý hay đó, và …'),
    phrases: ['good-idea-and'],
    visitor: card('Good idea!', 'Ý hay đó!'),
    accept: ['good', 'idea'],
  },
  {
    from: 'bea',
    line: 's1-e6-postcard-bea',
    hint: hint(
      "Here's the thing: … It matters because …",
      'Chuyện là thế này: … Điều đó quan trọng vì …',
    ),
    phrases: ['heres-the-thing', 'it-matters-because'],
    visitor: card("I love Mei's café.", 'Mình rất yêu quán của Mei.'),
    accept: ['love', 'like', 'café', 'cafe'],
  },
];

const LIFESAVER = card('Sorry? Again, please.', 'Xin lỗi? Nói lại giúp mình nhé.');

export const S1_E6_PRACTICE = scene({
  id: 's1-e6-practice',
  kind: 'practice',
  title: 'Answer six postcards',
  place: 'burrow',
  cast: ['pip', 'linh', 'mei', 'sol', 'hank', 'nell', 'bea'],
  summary:
    "An accent warm-up: six neighbours sent well-done postcards. Each plays at the neighbour's own pace, and the learner answers it with a phrase from the season.",
  goal: 'Understand six neighbours at their natural pace, and answer each with a phrase.',
  beats: [
    gen('pip-opens', 'pip', 'Say there are six postcards, and you will answer them one by one.', {
      ...N,
      example: "Six postcards! Let's answer them, one by one.",
    }),
    gen('pip-opens-visitor', 'pip', 'Say there are six postcards to answer.', {
      ...V,
      constraints: [VISITOR_LINE],
      example: "Six postcards! Let's answer them!",
    }),
    ...REPLIES.flatMap((reply, i) => [
      rec(`postcard-${reply.from}`, reply.line),
      learner(
        `answer-${reply.from}`,
        turn({
          listener: reply.from,
          expects: `Answers ${reply.from === 'hank' ? "Hank's" : 'the'} postcard with a phrase from the season.`,
          phrases: reply.phrases,
          hint: reply.hint,
          onTargetError: 'accept',
          maxTries: 2,
          stuck: 'Say thanks for the answer, warmly, and go on.',
          by: 'pip',
        }),
        N,
      ),
      learner(
        `answer-${reply.from}-visitor`,
        // Asking again replays the postcard slower, and that answers the turn.
        visitorCards({
          listener: reply.from,
          choices: [reply.visitor, LIFESAVER],
          accept: [...reply.accept, ...AGAIN_WORDS],
          onReplay: 'replay_and_pass',
          phrases: [...reply.phrases.slice(0, 1), 'sorry-again-please'],
          ...(i === 0
            ? {
                task: task(
                  'The neighbours sent postcards. Listen, then pick a card to answer. Too fast? Say: Sorry? Again, please.',
                  'Hàng xóm gửi bưu thiếp. Nghe, rồi chọn thẻ để trả lời. Nghe không kịp thì nói: Sorry? Again, please.',
                ),
              }
            : {}),
        }),
        V,
      ),
    ]),
    gen('pip-closes', 'pip', 'Say six answers: everyone will be so happy.', {
      ...N,
      example: 'Six answers! Everyone will be so happy.',
    }),
    gen('pip-closes-visitor', 'pip', 'Cheer: six answers.', {
      ...V,
      constraints: [VISITOR_LINE],
      example: 'Six answers! Everyone is happy!',
    }),
  ],
});

export const S1_E6: Episode = {
  id: 's1-e6',
  number: 6,
  title: 'The Town Meeting',
  place: 'town-square',
  cast: ['mags', 'pip', 'hank', 'mei', 'linh', 'sol', 'nell', 'bea'],
  logline:
    'The whole town gathers in the square. You speak for the café, answer one question, and the town votes. Mei stays.',
  learningFocus:
    'A short structured speech; answering a question from the floor; thanking a group.',
  canDos: { life: 'speak-to-a-group', work: 'make-a-case-take-a-question' },
  phrases: ['a-few-words', 'first-second', 'great-question', 'thank-you-all'],
  realWeek:
    '"How did it go?": Pip asks about a real event you mentioned earlier in the season, or rehearses one coming up.',
  practice:
    'Accent warm-up: six neighbours send well-done postcards; answer each one with a phrase from the season.',
  stageScaling:
    'Neighbour: 75 s speech, two questions. Regular: 90 s, Mags raises an objection. Local+: a rival speaker argues for the sale and the learner responds.',
  lines: [
    's1-e6-08',
    's1-e6-11',
    's1-e6-12',
    's1-e6-03',
    's1-e6-10',
    's1-e6-09',
    's1-e6-07',
    's1-e6-05',
    's1-e6-visitor-mags',
    's1-e6-visitor-pip',
    's1-e6-visitor-hank',
    's1-e6-visitor-hank-yes',
    's1-e6-visitor-mags-vote',
    's1-e6-visitor-mei',
    's1-e6-visitor-flags',
    's1-e6-visitor-boat',
    's1-e6-rw-open',
    's1-e6-rw-close',
    ...REPLIES.map((r) => r.line),
    's1-e6-story-01',
    's1-e6-story-02',
    's1-e6-story-03',
    's1-e6-story-04',
    's1-e6-story-05',
    's1-e6-story-06',
    's1-e6-vm-bunting',
    's1-e6-06',
  ],
  cliffhanger: 's1-e6-05',
  recap: 's1-e6-06',
  draft: false,
  week: [
    { day: 1, scene: 's1-e6' },
    { day: 2, scene: 's1-e6-story' },
    { day: 2, scene: 's1-e6-postcards' },
    { day: 3, scene: 's1-e6-real-week' },
    { day: 4, scene: 's1-e6-practice' },
    { day: 5, scene: 's1-e6-voicemail' },
  ],
  scenes: [
    S1_E6_CALL,
    pipStory(
      {
        id: 's1-e6-story',
        title: 'The moon',
        summary:
          "The night before the meeting, Pip practised the learner's speech to the moon, and an owl asked who.",
        phrases: ['first-second'],
      },
      [
        's1-e6-story-01',
        's1-e6-story-02',
        's1-e6-story-03',
        's1-e6-story-04',
        's1-e6-story-05',
        's1-e6-story-06',
      ],
    ),
    postcards(
      {
        id: 's1-e6-postcards',
        title: 'Six postcards',
        summary:
          'Six well-done notes from Linh, Mei, Sol, Hank, Nell and Bea, each ending with something to answer.',
      },
      REPLIES.map((r) => [r.from, r.line] as const),
    ),
    S1_E6_REAL_WEEK,
    S1_E6_PRACTICE,
    voicemail({
      id: 's1-e6-voicemail',
      title: 'Pip left you a voicemail',
      summary:
        'The little flags in the square stay up for a whole week: Bunting Week starts next week.',
      from: 'pip',
      line: 's1-e6-vm-bunting',
    }),
  ],
};
