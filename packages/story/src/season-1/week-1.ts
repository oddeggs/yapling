import { answer, gen, learner, rec, scene, seconds, ui } from '../build';
import { glossed, NO_GLOSS, viDesign, viDraft } from '../gloss';

/*
 * The rest of Episode 1's week: Pip's voice story and Linh's postcard (nothing to fail, no live
 * minutes), the real-week call (teach Pip to introduce yourself at work), the first Pass it on on
 * Bus 45, and the cliffhanger voicemail with Pip's slightly wrong phrase to fix.
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
        example:
          'At Hollowbrook, I have to say who I am. How do people introduce themselves at work?',
      },
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
    ),
    gen(
      'pip-notes',
      'pip',
      "Celebrate what got better (shorter, clearer) and write the learner's introduction in your notebook.",
      { example: "Shorter and clearer! I'm writing that down." },
    ),
  ],
});

/** Pass it on: one story, three listeners, less time each round (4/3/2). No first-language help. */
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
      { example: 'Bus 45 is late. Tell me about your day while we wait! Ninety seconds.' },
    ),
    learner('round-1', round('pip', seconds(90, { neighbour: 75, regular: 60 }))),
    ui('mirror-1', { type: 'fluency_mirror', round: 1 }),
    gen(
      'linh-asks',
      'linh',
      'Pip told you they had a day worth hearing. Ask to hear it too: one minute.',
      {
        example: 'Pip says you had a busy day! Tell me too. One minute?',
      },
    ),
    learner('round-2', round('linh', seconds(60, { neighbour: 50, regular: 45 }))),
    ui('mirror-2', { type: 'fluency_mirror', round: 2 }),
    gen('bea-asks', 'bea', 'The bus arrives. Ask for the story before the next stop.', {
      example: "Morning, love! Go on then, tell me. You've got till the next stop.",
    }),
    learner('round-3', round('bea', seconds(45, { neighbour: 40, regular: 30 }))),
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
