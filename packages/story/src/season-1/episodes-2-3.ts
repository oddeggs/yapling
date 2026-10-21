import { answer, gen, learner, rec, scene, ui } from '../build';
import type { Episode, Fallback } from '../types';

/*
 * Episodes 2 and 3: metadata, recorded lines and outline beats from the script. The beats run
 * (every scene still ends), but their intents are first drafts to be written in full.
 */

const nudge = (speaker: Fallback['speaker'], intent: string): Fallback => ({ speaker, intent });

const pipStory = (id: string, summary: string, intent: string, phrases: readonly string[] = []) =>
  scene({
    id,
    kind: 'story',
    title: "Pip's story",
    place: 'burrow',
    cast: ['pip'],
    summary,
    goal: 'Listen to a short story.',
    phrases,
    draft: true,
    beats: [
      gen('story', 'pip', intent, { constraints: ['About 40 seconds, in simple sentences.'] }),
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
    'Talking about strengths with an example; answering "Tell me about yourself"; clarifying questions.',
  canDos: { life: 'say-what-youre-good-at', work: 'tell-me-about-yourself' },
  phrases: ['im-good-at', 'for-example', 'id-love-to', 'just-to-confirm'],
  realWeek: 'Bring your homework: paste your CV or a job post; Dex runs a short interview from it.',
  practice:
    'Teach the yapling: explain three job words Pip saw on the poster (deadline, team, shift).',
  stageScaling:
    'Regular+: Sol asks about a weakness and a time you solved a problem; Local+: Sol asks a hypothetical and interrupts to dig deeper.',
  lines: [
    's1-e2-01',
    's1-e2-02',
    's1-e2-03',
    's1-e2-04',
    's1-e2-05',
    's1-e2-06',
    's1-e2-07',
    's1-e2-08',
  ],
  cliffhanger: 's1-e2-07',
  recap: 's1-e2-08',
  draft: true,
  week: [
    { day: 1, scene: 's1-e2' },
    { day: 2, scene: 's1-e2-story' },
    { day: 2, scene: 's1-e2-postcard' },
    { day: 5, scene: 's1-e2-voicemail' },
  ],
  scenes: [
    scene({
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
      draft: true,
      beats: [
        rec('rehearse', 's1-e2-02'),
        learner(
          'ask-pip',
          answer({
            listener: 'pip',
            expects: 'Asks Pip an interview question, playing Sol.',
            onTargetError: 'accept',
            fallback: nudge('pip', 'Suggest a question: "Ask me: tell me about yourself?"'),
          }),
        ),
        gen(
          'pip-answers',
          'pip',
          "Answer one stage below the learner, with one mistake that matches the learner's own target error.",
          {
            answer: answer({
              listener: 'pip',
              expects: "Corrects Pip's mistake.",
              onTargetError: 'accept',
              fallback: nudge('pip', 'Notice your own mistake and fix it, a little proud.'),
            }),
          },
        ),
        gen('pip-thanks', 'pip', 'Thank the learner and promise to use their correction.'),
        rec('interview', 's1-e2-03'),
        gen('pip-interview', 'pip', "Answer Sol using the learner's suggested phrases."),
        rec('swap', 's1-e2-04'),
        learner(
          'about-yourself',
          answer({
            listener: 'sol',
            expects: 'Answers "Tell me about yourself".',
            canDo: 'tell-me-about-yourself',
            fallback: nudge('sol', 'Ask a smaller question: what do you do, and where?'),
          }),
        ),
        gen(
          'sol-strengths',
          'sol',
          'Ask one follow-up: what are you good at? Can you give an example?',
          {
            answer: answer({
              listener: 'sol',
              expects: 'Says what they are good at, with an example.',
              phrases: ['im-good-at', 'for-example'],
              canDo: 'say-what-youre-good-at',
              fallback: nudge('sol', 'Offer an easy start: "Maybe something at work, or at home?"'),
            }),
          },
        ),
        gen('sol-weakness', 'sol', 'Ask about a weakness, then a time they solved a problem.', {
          minStage: 'regular',
          answer: answer({
            listener: 'sol',
            expects: 'Names a weakness and what they do about it.',
            fallback: nudge('sol', 'Say it is a hard question, and move on kindly.'),
          }),
        }),
        rec('details', 's1-e2-05'),
        learner(
          'confirm',
          answer({
            listener: 'sol',
            expects: 'Confirms the details for Pip.',
            phrases: ['just-to-confirm'],
            fallback: nudge('sol', 'Repeat the details once, slowly.'),
          }),
        ),
        gen('sol-confirms', 'sol', 'Confirm the details back in a few words.'),
        rec('close', 's1-e2-06'),
      ],
    }),
    pipStory(
      's1-e2-story',
      'Pip tried on three outfits for the interview; the tie was "too much tie".',
      'Tell how you tried on three outfits for the interview; the tie was "too much tie".',
    ),
    scene({
      id: 's1-e2-postcard',
      kind: 'postcard',
      title: 'Postcard from Sol',
      place: 'burrow',
      cast: ['sol'],
      summary: 'Sol says hello before the interview, with a tip.',
      goal: 'Read and listen to a tip.',
      beats: [ui('postcard', { type: 'postcard', from: 'sol' }), rec('tip', 's1-e2-01')],
    }),
    scene({
      id: 's1-e2-voicemail',
      kind: 'voicemail',
      title: 'Pip left you a voicemail',
      place: 'burrow',
      cast: ['pip'],
      summary: 'Pip got the job, and a big, loud man wants to talk to Mei about coffee beans.',
      goal: 'Listen to the news.',
      beats: [ui('voicemail', { type: 'voicemail', from: 'pip' }), rec('news', 's1-e2-07')],
    }),
  ],
};

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
  realWeek: 'A real request or "no" you need to say this week, rehearsed with Dex.',
  practice: 'Pass it on: explain why the café matters to you in 90/60/45 seconds.',
  stageScaling:
    'Newcomer: one simple request, phrase hints after a pause; Local: interruptions and a mid-sentence change of mind; Voice: de-escalate and keep the relationship.',
  lines: [
    's1-e3-01',
    's1-e3-02',
    's1-e3-03',
    's1-e3-04',
    's1-e3-05',
    's1-e3-06',
    's1-e3-07',
    's1-e3-08',
  ],
  cliffhanger: 's1-e3-07',
  recap: 's1-e3-08',
  draft: true,
  week: [
    { day: 1, scene: 's1-e3' },
    { day: 2, scene: 's1-e3-story' },
    { day: 5, scene: 's1-e3-voicemail' },
  ],
  scenes: [
    scene({
      id: 's1-e3',
      kind: 'episode',
      title: 'Cheaper Beans',
      place: 'lantern-cafe',
      cast: ['hank', 'mei', 'pip'],
      summary:
        'At the café counter, Hank wants ten percent off his beans. The learner helps Mei say no kindly and offer something else.',
      goal: 'Say no politely and offer an alternative.',
      canDos: ['say-no-politely', 'push-back-offer-alternative'],
      phrases: ['sorry-we-cant', 'how-about', 'fair-point-but', 'deal'],
      draft: true,
      beats: [
        rec('hank-arrives', 's1-e3-01', { maxStage: 'regular' }),
        rec('hank-arrives-fast', 's1-e3-02', { minStage: 'local' }),
        rec('mei-panics', 's1-e3-03'),
        learner(
          'say-no',
          answer({
            listener: 'hank',
            expects: 'Says no to the discount, politely.',
            phrases: ['sorry-we-cant'],
            canDo: 'say-no-politely',
            fallback: nudge('mei', 'Whisper the words: "Sorry, we can\'t do that."'),
          }),
        ),
        gen('hank-pushes', 'hank', 'Push once: "Come on. Ten percent. Deal?"', {
          answer: answer({
            listener: 'hank',
            expects: 'Holds the no, kindly.',
            phrases: ['sorry-we-cant'],
            canDo: 'say-no-politely',
            fallback: nudge('hank', 'Grumble and wait to hear what else they have.'),
          }),
        }),
        rec('pip-idea', 's1-e3-04'),
        learner(
          'alternative',
          answer({
            listener: 'hank',
            expects: 'Offers an alternative (a free pastry, a loyalty card, faster delivery).',
            phrases: ['how-about'],
            canDo: 'push-back-offer-alternative',
            fallback: nudge('pip', 'Whisper an idea: "How about a free pastry?"'),
          }),
        ),
        gen('hank-objects', 'hank', 'Object once to the alternative.', {
          answer: answer({
            listener: 'hank',
            expects: 'Acknowledges and holds the offer.',
            phrases: ['fair-point-but'],
            canDo: 'push-back-offer-alternative',
            fallback: nudge('hank', 'Think it over out loud and start to come round.'),
          }),
        }),
        rec('hank-folds', 's1-e3-05'),
        rec('twist', 's1-e3-06'),
      ],
    }),
    pipStory(
      's1-e3-story',
      'Pip\'s first morning at Hollowbrook; Sol taught it what a "quick sync" is.',
      'Tell about your first morning at Hollowbrook and what a "quick sync" is. Use "Just to confirm…" once.',
      ['just-to-confirm'],
    ),
    scene({
      id: 's1-e3-voicemail',
      kind: 'voicemail',
      title: 'Mei left you a voicemail',
      place: 'burrow',
      cast: ['mei'],
      summary: 'Someone wants to buy the café building.',
      goal: 'Listen to the news.',
      beats: [
        ui('voicemail', { type: 'voicemail', from: 'mei' }),
        rec('news', 's1-e3-07'),
        ui('beep', { type: 'sfx', sound: 's1-sfx-voicemail-beep' }),
      ],
    }),
  ],
};
