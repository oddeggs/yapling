import { gen, rec, scene, ui } from '../build';
import { explain, hint, JOB_WORDS, N, turn, V, VISITOR_LINE } from './later-weeks';
import { card, task, visitorCards } from './visitor';

/*
 * Episode 2's real-week and practice calls (`season-1-script.md`, "Episode 2"): "Tell me about
 * yourself, for real" with Pip, and Teach the yapling with three words from the Hollowbrook poster.
 */

export const S1_E2_REAL_WEEK = scene({
  id: 's1-e2-real-week',
  kind: 'real_week',
  title: 'Tell me about yourself, for real',
  place: 'burrow',
  cast: ['pip'],
  summary:
    "No Sol today: Pip asks about the learner's own job or study, picking up what they said in week 1, then what they are good at and what they would love to do one day.",
  goal: 'Tell Pip about yourself for real: your work or study, a strength with an example.',
  canDos: ['tell-me-about-yourself', 'say-what-youre-good-at'],
  phrases: ['im-good-at', 'for-example', 'id-love-to'],
  beats: [
    rec('open', 's1-e2-rw-open', N),
    gen(
      'pip-asks',
      'pip',
      'From memory, pick up the job or study the learner gave in week 1 and ask about it; with nothing in memory, ask whether they work or study.',
      {
        ...N,
        example: 'Last week you said you work at a bank. What do you do there?',
        answer: turn({
          listener: 'pip',
          expects: 'Talks about their own work or study for 30 to 60 seconds.',
          canDo: 'tell-me-about-yourself',
          hint: hint("I'm … I work at … Every day, I …", 'Mình là … Mình làm ở … Mỗi ngày, mình …'),
          stuck: 'Ask one easy question about their day: "What do you do in the morning?"',
        }),
      },
    ),
    gen('pip-good-at', 'pip', 'Ask one question: what are they good at, at work or at home?', {
      ...N,
      example: 'What are you good at? At work, or at home?',
      answer: turn({
        listener: 'pip',
        expects: 'Says what they are good at, with an example if they can.',
        phrases: ['im-good-at', 'for-example'],
        canDo: 'say-what-youre-good-at',
        hint: hint("I'm good at … For example, …", 'Mình giỏi … Ví dụ, …'),
        stuck: 'Guess something kind from what they said, and ask if it is true.',
      }),
    }),
    gen(
      'pip-example',
      'pip',
      'If they gave no example, ask for one, eagerly. If they did, say it back, impressed, and ask for one more small one.',
      {
        ...N,
        example: 'Ooh, an example? Please?',
        answer: turn({
          listener: 'pip',
          expects: 'Gives an example: a moment in the past.',
          phrases: ['for-example'],
          hint: hint('For example, last week I …', 'Ví dụ, tuần trước mình …'),
          onTargetError: 'accept',
          stuck: 'Say that was a good one already, and write it down.',
        }),
      },
    ),
    gen('pip-dream', 'pip', 'Ask one dream question: what would they love to do one day?', {
      ...N,
      example: 'And one day? What would you love to do?',
      answer: turn({
        listener: 'pip',
        expects: 'Says what they would love to do one day.',
        phrases: ['id-love-to'],
        hint: hint("One day, I'd love to …", 'Một ngày nào đó, mình rất muốn …'),
        onTargetError: 'accept',
        stuck: 'Say your own dream (a map of every town), and say theirs can be a secret for now.',
      }),
    }),
    gen('pip-reads', 'pip', "Read back one line from your notebook, in the learner's own words.", {
      ...N,
      example: 'I wrote: good at numbers. For example, the shop budget!',
    }),
    rec('close', 's1-e2-rw-close', N),

    // At Visitor: three card turns about the learner, each modelled first by Pip.
    gen('pip-asks-visitor', 'pip', 'Ask the learner to tell you about them.', {
      ...V,
      constraints: [VISITOR_LINE],
      example: 'Tell me about you. Please?',
      answer: visitorCards({
        listener: 'pip',
        choices: [card("I'm a …", 'Mình là …'), card('I work at …', 'Mình làm ở …')],
        accept: JOB_WORDS,
        canDo: 'tell-me-about-yourself',
        praise: [],
        task: task(
          'Pip wants to know more about you. Pick a card, or say it in your own words.',
          'Pip muốn biết thêm về bạn. Chọn thẻ, hoặc nói bằng từ của bạn.',
        ),
      }),
    }),
    gen(
      'pip-likes-visitor',
      'pip',
      "Say the learner's job back, then say you like maps and ask what they like.",
      {
        ...V,
        constraints: [VISITOR_LINE],
        example: 'A teacher! Wow! I like maps. And you?',
        answer: visitorCards({
          listener: 'pip',
          choices: [
            card('I like music.', 'Mình thích âm nhạc.'),
            card('I like coffee.', 'Mình thích cà phê.'),
          ],
          accept: ['like'],
          praise: [],
        }),
      },
    ),
    gen('pip-good-visitor', 'pip', 'Say you are good at maps, and ask what they are good at.', {
      ...V,
      constraints: [VISITOR_LINE],
      example: "I'm good at maps. And you?",
      answer: visitorCards({
        listener: 'pip',
        choices: [
          card("I'm good at cooking.", 'Mình nấu ăn giỏi.'),
          card("I'm good at my job.", 'Mình làm tốt công việc của mình.'),
        ],
        accept: ['good'],
        phrases: ['im-good-at'],
        canDo: 'say-what-youre-good-at',
        praise: [],
      }),
    }),
    gen(
      'pip-reads-visitor',
      'pip',
      'Read your page back in three bits: their job, what they like, what they are good at.',
      { ...V, constraints: [VISITOR_LINE], example: 'Teacher. Likes music. Good at cooking!' },
    ),
  ],
});

export const S1_E2_PRACTICE = scene({
  id: 's1-e2-practice',
  kind: 'practice',
  title: 'Teach the yapling',
  place: 'burrow',
  cast: ['pip'],
  summary:
    'Pip copied the poster at Hollowbrook and has three words it does not know: deadline, team and shift. The learner explains each one.',
  goal: 'Explain three job words in simple English.',
  beats: [
    rec('open', 's1-e2-pr-open', N),
    ui('poster', { type: 'notebook', word: 'deadline' }, N),
    gen('guess-deadline', 'pip', 'Guess what "deadline" means, wrong and sweet.', {
      ...N,
      example: 'Deadline. Is it… a very tired line?',
      answer: explain(
        'deadline',
        'Explains what a deadline is.',
        "It's the last day to …",
        'Là ngày cuối cùng để …',
      ),
    }),
    gen(
      'guess-team',
      'pip',
      'Write deadline down in the learner\'s words, try it on your own life, then guess what "team" means.',
      {
        ...N,
        example: 'My snack deadline is now! And team? Is it tea for me?',
        answer: explain(
          'team',
          'Explains what a team is.',
          'A team is a group of people who …',
          'Team là một nhóm người cùng …',
        ),
      },
    ),
    gen('guess-shift', 'pip', 'Write team down, then guess what "shift" means, wrongly.', {
      ...N,
      example: 'Shift… like moving a big box?',
      answer: explain(
        'shift',
        'Explains what a shift is.',
        'A shift is the time when you …',
        'Ca làm là khoảng thời gian bạn …',
      ),
    }),
    gen('pip-reads', 'pip', 'Read your three notebook lines back, in the learner’s words.', {
      ...N,
      example: 'Deadline: the last day. Team: people together. Shift: work time.',
    }),
    rec('close', 's1-e2-pr-close', N),

    // At Visitor: two picture-word cards (deadline is left out).
    gen('open-visitor', 'pip', 'Say you have two words, and ask for help.', {
      ...V,
      constraints: [VISITOR_LINE],
      example: 'Two words. Help me, please?',
    }),
    ui('team-visitor', { type: 'notebook', word: 'team' }, V),
    gen('ask-team-visitor', 'pip', 'Ask what "team" is.', {
      ...V,
      constraints: [VISITOR_LINE],
      example: 'Team? What is a team?',
      answer: visitorCards({
        listener: 'pip',
        choices: [
          card("It's a group.", 'Là một nhóm.'),
          card("It's people. They work together.", 'Là những người làm việc cùng nhau.'),
        ],
        accept: ['group', 'people', 'together'],
        task: task(
          'Explain the word for Pip: pick a card.',
          'Giải thích từ cho Pip: chọn một thẻ.',
        ),
      }),
    }),
    ui('shift-visitor', { type: 'notebook', word: 'shift' }, V),
    gen('ask-shift-visitor', 'pip', 'Ask what "shift" is.', {
      ...V,
      constraints: [VISITOR_LINE],
      example: 'Shift? What is a shift?',
      answer: visitorCards({
        listener: 'pip',
        choices: [
          card("It's work time.", 'Là giờ làm.'),
          card("It's your work hours.", 'Là giờ làm việc của bạn.'),
        ],
        accept: ['work', 'time', 'hours'],
      }),
    }),
    gen('pip-reads-visitor', 'pip', 'Read your two notebook lines back.', {
      ...V,
      constraints: [VISITOR_LINE],
      example: 'Team: a group. Shift: work time!',
    }),
  ],
});
