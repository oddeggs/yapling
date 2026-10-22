import { gen, rec, scene } from '../build';
import { hint, N, turn, V, VISITOR_LINE } from './later-weeks';
import { card, task, visitorCards } from './visitor';

/*
 * Episode 6's real-week call (`season-1-script.md`, "Episode 6"): "How did it go?" with Pip, about
 * a real moment the learner mentioned this season.
 */

export const S1_E6_REAL_WEEK = scene({
  id: 's1-e6-real-week',
  kind: 'real_week',
  title: 'How did it go?',
  place: 'burrow',
  cast: ['pip'],
  summary:
    'Pip asks about one real thing the learner mentioned this season (a "no", a meeting, a pitch), how it went, and what is coming up next.',
  goal: 'Tell Pip how a real moment went, and what is next.',
  beats: [
    rec('open', 's1-e6-rw-open', N),
    gen(
      'pip-asks',
      'pip',
      "From memory, ask about one real thing the learner mentioned this season (week 3's no, week 4's meeting, week 5's pitch): how did it go? With nothing in memory, ask if something big is coming up for them.",
      {
        ...N,
        example: 'In week three, you had to say no at work. How did it go?',
        answer: turn({
          listener: 'pip',
          expects: 'Says how it went, in the past tense.',
          hint: hint(
            'It went well. I said … / It was hard, because …',
            'Ổn lắm. Mình đã nói … / Hơi khó, vì …',
          ),
          stuck: 'Say it sounds brave either way, and ask what they said.',
        }),
      },
    ),
    gen('pip-follow-up', 'pip', 'One follow-up: what did they say?', {
      ...N,
      example: 'What did they say?',
      answer: turn({
        listener: 'pip',
        expects: 'Says what the other person said, and what they did next.',
        hint: hint('They said … Then I …', 'Họ nói … Sau đó mình …'),
        onTargetError: 'accept',
        stuck: 'Say "Wow" and write it in your notebook.',
      }),
    }),
    gen(
      'pip-next',
      'pip',
      "Ask what's next: anything coming up? Offer a 30-second rehearsal if they want one.",
      {
        ...N,
        example: "What's next? Anything coming up?",
        answer: turn({
          listener: 'pip',
          expects: 'Says what is coming up next week, and rehearses it if they like.',
          hint: hint('Next week, I have to …', 'Tuần sau, mình phải …'),
          onTargetError: 'accept',
          stuck: 'Say a quiet week is good too, and cheer.',
        }),
      },
    ),
    rec('close', 's1-e6-rw-close', N),

    // At Visitor: three card turns about this week, Pip modelling first.
    gen('pip-week-visitor', 'pip', 'Say your week was very good, and ask about theirs.', {
      ...V,
      constraints: [VISITOR_LINE],
      example: 'My week: very good! Your week?',
      answer: visitorCards({
        listener: 'pip',
        choices: [card('A good week.', 'Một tuần vui.'), card('A busy week.', 'Một tuần bận rộn.')],
        accept: ['good', 'busy', 'week'],
        task: task(
          'Pip asks about your week. Pick a card.',
          'Pip hỏi về tuần của bạn. Chọn một thẻ.',
        ),
      }),
    }),
    gen('pip-flags-visitor', 'pip', 'Say you like the flags, and ask what they like.', {
      ...V,
      constraints: [VISITOR_LINE],
      example: 'I like the flags. And you?',
      answer: visitorCards({
        listener: 'pip',
        choices: [
          card('I like the café.', 'Mình thích quán cà phê.'),
          card('I like my job.', 'Mình thích công việc của mình.'),
        ],
        accept: ['like'],
      }),
    }),
    gen('pip-tomorrow-visitor', 'pip', 'Say you work tomorrow, and ask about them.', {
      ...V,
      constraints: [VISITOR_LINE],
      example: 'Tomorrow I work. And you?',
      answer: visitorCards({
        listener: 'pip',
        choices: [
          card('I work tomorrow.', 'Mai mình đi làm.'),
          card('I rest tomorrow.', 'Mai mình nghỉ.'),
        ],
        accept: ['work', 'rest', 'tomorrow'],
        praise: [],
      }),
    }),
    gen('pip-writes-visitor', 'pip', 'Say you are writing it down.', {
      ...V,
      constraints: [VISITOR_LINE],
      example: 'Writing it down!',
    }),
  ],
});
