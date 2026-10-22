import { gen, learner, rec, scene, ui } from '../build';
import type { Episode } from '../types';
import {
  englishOnly,
  explain,
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
import { card, task, visitorCards } from './visitor';

/*
 * Episode 4, "The Plan", and its week (`season-1-script.md`, "Episode 4"). The town meets at Nell's
 * inn and the learner chairs it. Arjun stays off-mic: Nell reads out his note. A Visitor opens the
 * meeting, asks two neighbours "What do you think?" and reacts, and Nell sums up for them. The
 * practice call starts with the listening checkpoint for Nell's move-in: the time on her postcard.
 */

const GOOD_IDEA = [
  card('Good idea!', 'Ý hay đó!'),
  card('I like it!', 'Mình thích ý này!'),
] as const;
const GOOD_IDEA_WORDS = ['good', 'idea', 'like'];

export const S1_E4_CALL = scene({
  id: 's1-e4',
  kind: 'episode',
  title: 'The Plan',
  place: 'lantern-inn',
  cast: ['nell', 'mei', 'pip', 'bea', 'linh'],
  summary:
    "In the back room of Nell's inn, the town meets to save the café from Big Bean. The learner runs the meeting so everyone gets a turn and the town leaves with one plan.",
  goal: 'Ask for ideas, agree and disagree kindly, move the meeting on, and sum up the plan.',
  canDos: ['agree-disagree-kindly', 'keep-a-meeting-moving'],
  phrases: ['what-do-you-think', 'good-idea-and', 'lets-hear-from', 'to-sum-up'],
  beats: [
    rec('big-bean', 's1-e4-07', N),
    rec('open', 's1-e4-01', N),
    rec('pip-you', 's1-e4-02', N),
    learner(
      'open-meeting',
      turn({
        listener: 'nell',
        expects: 'Opens the meeting and gives the first person (Bea) a turn.',
        phrases: ['lets-hear-from', 'what-do-you-think'],
        canDo: 'keep-a-meeting-moving',
        hint: hint(
          "Hello, everyone. Let's hear from Bea. What do you think?",
          'Chào mọi người. Mời Bea nói trước nhé. Bea nghĩ sao?',
        ),
        stuck: 'Start it off kindly: "Right. Bea, you first?"',
      }),
      N,
    ),
    gen('bea-idea', 'bea', 'Offer one idea, short and cheerful: a cake sale on the bus.', {
      ...N,
      example: 'A cake sale on the bus!',
      answer: turn({
        listener: 'bea',
        expects: "Agrees and adds to Bea's idea, then asks Nell.",
        phrases: ['good-idea-and', 'what-do-you-think'],
        canDo: 'agree-disagree-kindly',
        hint: hint('Good idea, and … Nell, what do you think?', 'Ý hay đó, và … Nell thấy sao?'),
        stuck: 'Say you will bake, and pass it to Nell yourself.',
      }),
    }),
    rec('arjun-note', 's1-e4-08', N),
    gen('nell-view', 'nell', 'Give your own view in one line.', {
      ...N,
      example: 'And the office must listen to us.',
    }),
    gen(
      'mei-tired',
      'mei',
      'Offer a tired idea the learner can gently disagree with: just pay double and work nights.',
      {
        ...N,
        example: 'Maybe I just pay double. I can work nights.',
        answer: turn({
          listener: 'mei',
          expects: 'Disagrees gently, and offers another idea.',
          phrases: ['how-about'],
          canDo: 'agree-disagree-kindly',
          hint: hint('I see, but … How about …?', 'Mình hiểu, nhưng … Hay là … nhé?'),
          stuck: 'Hear yourself, shake your head and say "No, you\'re right. That\'s too much."',
        }),
      },
    ),
    gen('neighbour-bea-agrees', 'bea', "Answer the disagreement too: say Mei can't work nights.", {
      minStage: 'neighbour',
      example: "Mei, love, you can't work nights too.",
    }),
    gen(
      'regular-clash',
      'nell',
      "Disagree with Bea's cake sale (too small), so two neighbours disagree and the learner mediates.",
      {
        minStage: 'regular',
        example: 'A cake sale is too small, Bea.',
        answer: turn({
          listener: 'nell',
          expects: 'Mediates between Nell and Bea, kindly.',
          phrases: ['good-idea-and', 'fair-point-but'],
          canDo: 'agree-disagree-kindly',
          hint: hint("That's a fair point, but … Both ideas …", 'Cũng có lý, nhưng … Cả hai ý …'),
          stuck: 'Laugh and say both can happen.',
        }),
      },
    ),
    gen(
      'bea-goose',
      'bea',
      'Talk too long, cheerfully, about a passenger and a goose (about 25 words), then stop for breath.',
      {
        ...N,
        constraints: ['The one long turn in this call: about 25 words, then a breath.'],
        example:
          'Oh, and once a goose got on my bus! A man said it was his. The goose said nothing. And then…',
        answer: turn({
          listener: 'bea',
          expects: 'Moves the meeting on, kindly, to Linh.',
          phrases: ['lets-hear-from'],
          canDo: 'keep-a-meeting-moving',
          hint: hint("Thanks, Bea. Let's hear from Linh.", 'Cảm ơn Bea. Giờ mời Linh nói nhé.'),
          stuck: 'Notice the time yourself, laugh, and hand over to Linh.',
        }),
      },
    ),
    rec('linh-idea', 's1-e4-03', N),
    learner(
      'sum-up',
      turn({
        listener: 'nell',
        expects: 'Sums up the plan.',
        phrases: ['to-sum-up'],
        canDo: 'keep-a-meeting-moving',
        hint: hint(
          'So, to sum up: a petition. A hundred names.',
          'Vậy, tóm lại: một bản kiến nghị. Một trăm chữ ký.',
        ),
        stuck: 'Offer the start: "So, to sum up… a petition?"',
      }),
      N,
    ),
    gen('nell-jobs', 'nell', 'Check the summary and hand out jobs: Pip gets the names.', {
      ...N,
      example: 'Pip, you get the names. Bus 45 goes everywhere.',
    }),
    rec('close', 's1-e4-04', N),

    // At Visitor: open the meeting, ask two neighbours, react; Nell sums up.
    rec('big-bean-visitor', 's1-e4-visitor-mei', V),
    rec('open-visitor', 's1-e4-visitor-nell', V),
    learner(
      'hello-visitor',
      visitorCards({
        listener: 'nell',
        choices: [card('Hello, everyone!', 'Chào mọi người!')],
        accept: ['hello', 'hi', 'everyone'],
        canDo: 'keep-a-meeting-moving',
        task: task(
          'You run the meeting. Say hello to everyone first.',
          'Bạn chủ trì cuộc họp. Chào mọi người trước nhé.',
        ),
      }),
      V,
    ),
    learner(
      'ask-bea-visitor',
      visitorCards({
        listener: 'bea',
        choices: [card('Bea, what do you think?', 'Bea nghĩ sao?')],
        accept: ['think', 'what', 'bea'],
        phrases: ['what-do-you-think'],
        canDo: 'keep-a-meeting-moving',
        praise: [],
        task: task('Ask each person what they think.', 'Hỏi ý kiến từng người.'),
      }),
      V,
    ),
    rec('bea-idea-visitor', 's1-e4-visitor-bea', V),
    learner(
      'react-bea-visitor',
      visitorCards({
        listener: 'bea',
        choices: GOOD_IDEA,
        accept: GOOD_IDEA_WORDS,
        phrases: ['good-idea-and'],
        canDo: 'agree-disagree-kindly',
        praise: praiseFor('bea'),
      }),
      V,
    ),
    learner(
      'ask-linh-visitor',
      visitorCards({
        listener: 'linh',
        choices: [card('Linh, what do you think?', 'Linh nghĩ sao?')],
        accept: ['think', 'what', 'linh'],
        phrases: ['what-do-you-think'],
        canDo: 'keep-a-meeting-moving',
        praise: [],
      }),
      V,
    ),
    rec('linh-idea-visitor', 's1-e4-visitor-linh', V),
    learner(
      'react-linh-visitor',
      visitorCards({
        listener: 'linh',
        choices: GOOD_IDEA,
        accept: GOOD_IDEA_WORDS,
        phrases: ['good-idea-and'],
        canDo: 'agree-disagree-kindly',
      }),
      V,
    ),
    rec('sum-up-visitor', 's1-e4-visitor-nell-sum', V),
    learner(
      'agree-visitor',
      visitorCards({
        listener: 'nell',
        choices: [
          card('Okay!', 'Được!'),
          card('Yes! Thank you, everyone.', 'Vâng! Cảm ơn mọi người.'),
        ],
        accept: ['okay', 'ok', 'yes', 'thank'],
      }),
      V,
    ),
    rec('close-visitor', 's1-e4-visitor-mei-thanks', V),
  ],
});

export const S1_E4_REAL_WEEK = scene({
  id: 's1-e4-real-week',
  kind: 'real_week',
  title: 'Speak up in your meeting',
  place: 'hollowbrook-office',
  cast: ['dex'],
  summary:
    'Dex helps the learner rehearse one point for a real meeting this week: he plays the chair, then a colleague with one fair doubt.',
  goal: 'Make one point in a real meeting, and answer one doubt.',
  phrases: ['fair-point-but'],
  beats: [
    rec('open', 's1-e4-rw-open', N),
    gen(
      'dex-asks',
      'dex',
      'Ask one question: is there a meeting this week, and what is one thing they want to say there?',
      {
        ...N,
        example: "Do you have a meeting this week? What's one thing you want to say?",
        answer: turn({
          listener: 'dex',
          expects: 'Says when the meeting is, what it is about, and the point they want to make.',
          hint: hint(
            'On … I have a meeting about … I want to say …',
            'Vào … mình có cuộc họp về … Mình muốn nói …',
          ),
          stuck: 'Offer a common one: a team meeting about the week. Take it.',
        }),
      },
    ),
    gen('dex-chair', 'dex', 'Play the chair of that meeting and invite them to add something.', {
      ...N,
      example: "Okay, we're in the meeting. Anything to add?",
      answer: turn({
        listener: 'dex',
        expects: 'Makes their point in the meeting.',
        phrases: ['i-think-you-should'],
        hint: hint(
          'Can I add something? I think we should …',
          'Cho mình góp một ý nhé? Mình nghĩ chúng ta nên …',
        ),
        stuck: 'Step out of the role and offer the start: "Can I add something?"',
      }),
    }),
    gen('dex-doubt', 'dex', 'As a colleague, raise one fair doubt about the point.', {
      ...N,
      example: "Hmm. Isn't that a bit slow?",
      answer: turn({
        listener: 'dex',
        expects: 'Agrees a little, and holds the point.',
        phrases: ['fair-point-but'],
        hint: hint("That's a fair point, but …", 'Bạn nói cũng có lý, nhưng …'),
        stuck: 'Say "Fair enough, let\'s try it," as the colleague.',
      }),
    }),
    gen(
      'dex-coaches',
      'dex',
      'Step out of the role: name one strong thing, and one thing to try (shorter, or a number).',
      { ...N, example: 'Clear point. Next time, add one number.' },
    ),
    rec('close', 's1-e4-rw-close', N),

    // At Visitor: Dex runs a tiny meeting; three card turns from the episode.
    gen('dex-opens-visitor', 'dex', 'Say your name: meeting time, will they start?', {
      ...V,
      constraints: [VISITOR_LINE],
      example: "I'm Dex. Meeting time! You start?",
      answer: visitorCards({
        listener: 'dex',
        choices: [card('Hello, everyone!', 'Chào mọi người!')],
        accept: ['hello', 'hi', 'everyone'],
      }),
    }),
    gen('dex-idea-visitor', 'dex', 'Give your idea: lunch at twelve.', {
      ...V,
      constraints: [VISITOR_LINE],
      example: 'My idea: lunch at twelve.',
      answer: visitorCards({
        listener: 'dex',
        choices: GOOD_IDEA,
        accept: GOOD_IDEA_WORDS,
        phrases: ['good-idea-and'],
      }),
    }),
    gen('dex-ask-visitor', 'dex', 'Ask for their idea.', {
      ...V,
      constraints: [VISITOR_LINE],
      example: 'Your idea?',
      answer: visitorCards({
        listener: 'dex',
        choices: [
          card('Coffee at three?', 'Ba giờ uống cà phê nhé?'),
          card("Let's start at nine.", 'Mình bắt đầu lúc chín giờ nhé.'),
        ],
        accept: ['coffee', 'start', 'three', 'nine', '3', '9'],
        task: task('Add one idea. Pick a card.', 'Bạn góp một ý. Chọn một thẻ.'),
      }),
    }),
    gen('dex-close-visitor', 'dex', 'Say good idea, and thank everyone.', {
      ...V,
      constraints: [VISITOR_LINE],
      example: 'Good idea! Thank you, everyone.',
    }),
  ],
});

export const S1_E4_PRACTICE = scene({
  id: 's1-e4-practice',
  kind: 'practice',
  title: "Nell's time, then two words",
  place: 'burrow',
  cast: ['pip'],
  summary:
    "Pip forgot the time on Nell's postcard, so the learner tells it (a listening check), then explains two words Pip doesn't know: petition and signature.",
  goal: "Say the time Nell's postcard gave, then explain two words in simple English.",
  beats: [
    rec('open', 's1-e4-pr-open', N),
    learner(
      'nell-time',
      // The listening check: an answer without "four" hears Nell's postcard again.
      turn({
        listener: 'pip',
        expects: "Says the time on Nell's postcard: after four.",
        accept: ['four', '4'],
        model: 's1-e4-postcard-nell',
        hint: englishOnly('She said: after …'),
        praise: [],
        stuck: 'Say "After four, I think!" and go on.',
      }),
      N,
    ),
    gen('ask-petition', 'pip', 'Say "after four", then ask what a petition is.', {
      ...N,
      example: 'After four! Okay. But first… what is a petition?',
      answer: explain(
        'petition',
        'Explains what a petition is.',
        "It's a paper. People sign it to ask for …",
        'Là một tờ giấy. Mọi người ký vào đó để đề nghị …',
      ),
    }),
    ui('petition', { type: 'notebook', word: 'petition' }, N),
    gen('ask-signature', 'pip', 'Write it in the learner\'s words, then ask about "signature".', {
      ...N,
      example: 'Petition: got it. And signature?',
      answer: explain(
        'signature',
        'Explains what a signature is.',
        "It's your name, written by you.",
        'Là tên của bạn, do chính bạn viết.',
      ),
    }),
    gen('try-signature', 'pip', 'Try a signature out loud, with a star, and ask if that is one.', {
      ...N,
      example: 'P, I, P… and a star? Is that a signature?',
      answer: turn({
        listener: 'pip',
        expects: 'Says yes, that is its signature.',
        hint: hint("Yes! That's your signature.", 'Đúng rồi! Đó là chữ ký của Pip.'),
        onTargetError: 'accept',
        maxTries: 2,
        stuck: 'Decide happily that it is, and write it down.',
      }),
    }),
    ui('signature', { type: 'notebook', word: 'signature' }, N),
    rec('close', 's1-e4-pr-close', N),

    // At Visitor: the time, as in Chapter 4; then two picture-word cards.
    gen('ask-time-visitor', 'pip', "Ask what time Nell's postcard said.", {
      ...V,
      constraints: [VISITOR_LINE],
      example: "Nell's postcard! What time?",
      answer: visitorCards({
        listener: 'pip',
        choices: [card('At four.', 'Lúc bốn giờ.'), card('At nine.', 'Lúc chín giờ.')],
        accept: ['four', '4'],
        model: 's1-e4-postcard-nell',
        recast: 'At four.',
        task: task(
          "Listen to Nell's postcard again, then pick the time.",
          'Nghe lại bưu thiếp của Nell, rồi chọn giờ.',
        ),
      }),
    }),
    ui('petition-visitor', { type: 'notebook', word: 'petition' }, V),
    gen('ask-petition-visitor', 'pip', 'Ask what a petition is.', {
      ...V,
      constraints: [VISITOR_LINE],
      example: 'Petition? What is it?',
      answer: visitorCards({
        listener: 'pip',
        choices: [
          card("It's names on paper.", 'Là tên mọi người trên một tờ giấy.'),
          card('People sign it.', 'Mọi người ký vào đó.'),
        ],
        accept: ['names', 'name', 'paper', 'sign'],
        task: task(
          'Explain the word for Pip: pick a card.',
          'Giải thích từ cho Pip: chọn một thẻ.',
        ),
      }),
    }),
    ui('signature-visitor', { type: 'notebook', word: 'signature' }, V),
    gen('ask-signature-visitor', 'pip', 'Ask what a signature is.', {
      ...V,
      constraints: [VISITOR_LINE],
      example: 'Signature? What is it?',
      answer: visitorCards({
        listener: 'pip',
        choices: [
          card("It's your name.", 'Là tên của bạn.'),
          card('You write your name.', 'Bạn tự viết tên mình.'),
        ],
        accept: ['name', 'write'],
      }),
    }),
    gen('got-it-visitor', 'pip', 'Say you got it, and thank them.', {
      ...V,
      constraints: [VISITOR_LINE],
      example: 'Got it! Thank you!',
    }),
  ],
});

export const S1_E4: Episode = {
  id: 's1-e4',
  number: 4,
  title: 'The Plan',
  place: 'lantern-inn',
  cast: ['nell', 'mei', 'bea', 'pip', 'linh'],
  logline:
    "The town gathers at Nell's inn to save the café. You chair the chat so everyone gets a turn and the town leaves with one plan.",
  learningFocus:
    'Asking for opinions, agreeing and adding, disagreeing gently, summarising. Work: keeping a meeting moving.',
  canDos: { life: 'agree-disagree-kindly', work: 'keep-a-meeting-moving' },
  phrases: ['what-do-you-think', 'good-idea-and', 'lets-hear-from', 'to-sum-up'],
  realWeek:
    'Speaking up in one of your real meetings: rehearse one point you want to make, with Dex.',
  practice:
    "First the listening check for Nell's move-in (the time on her postcard), then Teach the yapling: petition and signature.",
  stageScaling:
    'Neighbour: Mei and Bea both answer the disagreement. Regular+: two characters disagree with each other and the learner mediates. Local+: a time limit and an interruption.',
  lines: [
    's1-e4-07',
    's1-e4-01',
    's1-e4-02',
    's1-e4-08',
    's1-e4-03',
    's1-e4-04',
    's1-e4-visitor-mei',
    's1-e4-visitor-nell',
    's1-e4-visitor-bea',
    's1-e4-visitor-linh',
    's1-e4-visitor-nell-sum',
    's1-e4-visitor-mei-thanks',
    's1-e4-rw-open',
    's1-e4-rw-close',
    's1-e4-pr-open',
    's1-e4-pr-close',
    's1-e4-story-01',
    's1-e4-story-02',
    's1-e4-story-03',
    's1-e4-story-04',
    's1-e4-story-05',
    's1-e4-story-06',
    's1-e4-postcard-nell',
    's1-e4-05',
    's1-e4-09',
  ],
  cliffhanger: 's1-e4-05',
  recap: 's1-e4-09',
  draft: false,
  week: [
    { day: 1, scene: 's1-e4' },
    { day: 2, scene: 's1-e4-story' },
    { day: 2, scene: 's1-e4-postcard' },
    { day: 3, scene: 's1-e4-real-week' },
    { day: 4, scene: 's1-e4-practice' },
    { day: 5, scene: 's1-e4-voicemail' },
  ],
  scenes: [
    S1_E4_CALL,
    pipStory(
      {
        id: 's1-e4-story',
        title: 'The poster',
        summary:
          "Pip made a poster for the petition and asked Nell what she thought. It had three f's in CAFÉ.",
        phrases: ['what-do-you-think'],
      },
      [
        's1-e4-story-01',
        's1-e4-story-02',
        's1-e4-story-03',
        's1-e4-story-04',
        's1-e4-story-05',
        's1-e4-story-06',
      ],
    ),
    postcards(
      {
        id: 's1-e4-postcard',
        title: 'Postcard from Nell',
        summary:
          'Nell, from the Lantern Inn: the petition papers are ready at her desk after four.',
      },
      [['nell', 's1-e4-postcard-nell']],
    ),
    S1_E4_REAL_WEEK,
    S1_E4_PRACTICE,
    voicemail({
      id: 's1-e4-voicemail',
      title: 'Nell left you a voicemail',
      summary: 'A hundred signatures by Friday, and Pip has never spoken to strangers.',
      from: 'nell',
      line: 's1-e4-05',
    }),
  ],
};
