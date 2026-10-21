import { answer, gen, learner, rec, scene, seconds, ui } from '../build';
import type { Episode, Fallback } from '../types';

/*
 * Episodes 4 to 6: metadata, recorded lines and outline beats from the script. The beats run
 * (every scene still ends), but their intents are first drafts to be written in full.
 */

const nudge = (speaker: Fallback['speaker'], intent: string): Fallback => ({ speaker, intent });

const pipStory = (id: string, summary: string, intent: string) =>
  scene({
    id,
    kind: 'story',
    title: "Pip's story",
    place: 'burrow',
    cast: ['pip'],
    summary,
    goal: 'Listen to a short story.',
    draft: true,
    beats: [
      gen('story', 'pip', intent, { constraints: ['About 40 seconds, in simple sentences.'] }),
    ],
  });

const voicemail = (id: string, from: 'mei' | 'nell', line: string, summary: string) =>
  scene({
    id,
    kind: 'voicemail',
    title: from === 'mei' ? 'Mei left you a voicemail' : 'Nell left you a voicemail',
    place: 'burrow',
    cast: [from],
    summary,
    goal: 'Listen to the news.',
    beats: [ui('voicemail', { type: 'voicemail', from }), rec('news', line)],
  });

export const S1_E4: Episode = {
  id: 's1-e4',
  number: 4,
  title: 'The Plan',
  place: 'lantern-inn',
  cast: ['nell', 'mei', 'arjun', 'bea', 'pip', 'linh'],
  logline:
    "The town gathers at Nell's inn to save the café. You chair the chat so everyone gets a turn and the town leaves with one plan.",
  learningFocus:
    'Asking for opinions, agreeing and adding, disagreeing gently, summarising. Work: keeping a meeting moving.',
  canDos: { life: 'agree-disagree-kindly', work: 'keep-a-meeting-moving' },
  phrases: ['what-do-you-think', 'good-idea-and', 'lets-hear-from', 'to-sum-up'],
  realWeek: 'Speaking up in one of your real meetings: rehearse one point you want to make.',
  practice: 'Teach the yapling: Pip doesn\'t understand "petition"; explain it, then "signature".',
  stageScaling:
    'Regular+: two characters disagree with each other and the learner mediates; Local+: the meeting has a time limit and someone interrupts.',
  lines: ['s1-e4-01', 's1-e4-02', 's1-e4-03', 's1-e4-04', 's1-e4-05', 's1-e4-06'],
  cliffhanger: 's1-e4-05',
  recap: 's1-e4-06',
  draft: true,
  week: [
    { day: 1, scene: 's1-e4' },
    { day: 2, scene: 's1-e4-story' },
    { day: 5, scene: 's1-e4-voicemail' },
  ],
  scenes: [
    scene({
      id: 's1-e4',
      kind: 'episode',
      title: 'The Plan',
      place: 'lantern-inn',
      cast: ['nell', 'pip', 'bea', 'arjun', 'mei', 'linh'],
      summary:
        "In the back room of Nell's inn, the town meets to save the café. The learner runs the meeting.",
      goal: 'Ask for ideas, agree and disagree kindly, and sum up the plan.',
      canDos: ['agree-disagree-kindly', 'keep-a-meeting-moving'],
      phrases: ['what-do-you-think', 'good-idea-and', 'lets-hear-from', 'to-sum-up'],
      draft: true,
      beats: [
        rec('open', 's1-e4-01'),
        rec('pip-you', 's1-e4-02'),
        learner(
          'open-meeting',
          answer({
            listener: 'nell',
            expects: 'Opens the meeting and asks people for ideas.',
            phrases: ['what-do-you-think', 'lets-hear-from'],
            canDo: 'keep-a-meeting-moving',
            fallback: nudge('nell', 'Start it off: "Right, who\'s got an idea?"'),
          }),
        ),
        gen('bea-idea', 'bea', 'Offer one short idea: a bake sale on the bus.'),
        gen('arjun-idea', 'arjun', 'Offer one short idea, as a voice on the phone: a market day.'),
        gen('mei-idea', 'mei', 'Say quietly that you just want to keep your café.'),
        gen('nell-idea', 'nell', 'Say the town needs something the landlord cannot ignore.', {
          answer: answer({
            listener: 'nell',
            expects:
              'Reacts to two ideas: one agreement with an addition, one gentle disagreement.',
            phrases: ['good-idea-and'],
            canDo: 'agree-disagree-kindly',
            fallback: nudge('nell', 'Pick one idea and ask the learner what they like about it.'),
          }),
        }),
        gen('talks-too-long', 'bea', 'Talk too long about the bake sale, cheerfully.', {
          answer: answer({
            listener: 'bea',
            expects: 'Moves the meeting on, gently.',
            phrases: ['lets-hear-from'],
            canDo: 'keep-a-meeting-moving',
            fallback: nudge('bea', 'Notice the time yourself and hand over, laughing.'),
          }),
        }),
        rec('linh-idea', 's1-e4-03'),
        learner(
          'sum-up',
          answer({
            listener: 'nell',
            expects: 'Sums up the plan.',
            phrases: ['to-sum-up'],
            canDo: 'keep-a-meeting-moving',
            fallback: nudge('nell', 'Offer the start: "So, to sum up… a petition?"'),
          }),
        ),
        gen(
          'nell-assigns',
          'nell',
          'Check the summary and assign Pip to signatures; Bus 45 goes everywhere.',
        ),
        rec('close', 's1-e4-04'),
      ],
    }),
    pipStory(
      's1-e4-story',
      'Pip made a poster for the meeting; it spelled "café" with three f\'s.',
      'Tell how you made a poster for the meeting and spelled "café" with three f\'s.',
    ),
    voicemail(
      's1-e4-voicemail',
      'nell',
      's1-e4-05',
      'A hundred signatures by Friday, and Pip has never spoken to strangers.',
    ),
  ],
};

const stop = (id: string, listener: 'bea' | 'pip', time: ReturnType<typeof seconds>) =>
  learner(
    id,
    answer({
      listener,
      expects: 'Pitches the petition to the passenger within the time.',
      phrases: ['heres-the-thing', 'it-matters-because', 'would-you-sign'],
      canDo: 'pitch-45s',
      timer: time,
      onTargetError: 'accept',
      fallback: nudge('pip', 'Whisper a start: "Here\'s the thing: the café might close."'),
    }),
  );

export const S1_E5: Episode = {
  id: 's1-e5',
  number: 5,
  title: 'The Petition',
  place: 'bus-45',
  cast: ['bea', 'pip'],
  logline:
    'Pip rides Bus 45 collecting signatures. At each stop you have 45 seconds to convince a passenger.',
  learningFocus:
    'Short persuasive pitch; telling a story with a point; adapting the same message to different listeners.',
  canDos: { life: 'short-story-with-a-point', work: 'pitch-45s' },
  phrases: ['heres-the-thing', 'it-matters-because', 'would-you-sign', 'thanks-for-listening'],
  realWeek: 'Your own 60-second self-pitch (for work, a client, or an interview).',
  practice: 'Pass it on: the café pitch at 90/60/45 seconds, building up for the bus.',
  stageScaling:
    'Times: Newcomer 90/60/45 s · Neighbour 75/50/40 · Regular 60/45/30 · Local adds an objection at every stop · Voice adds a sceptical passenger who argues back.',
  lines: ['s1-e5-01', 's1-e5-02', 's1-e5-03', 's1-e5-04', 's1-e5-05', 's1-e5-06', 's1-e5-07'],
  cliffhanger: 's1-e5-06',
  recap: 's1-e5-07',
  draft: true,
  week: [
    { day: 1, scene: 's1-e5' },
    { day: 2, scene: 's1-e5-postcard' },
    { day: 3, scene: 's1-e5-story' },
    { day: 5, scene: 's1-e5-voicemail' },
  ],
  scenes: [
    scene({
      id: 's1-e5',
      kind: 'episode',
      title: 'The Petition',
      place: 'bus-45',
      cast: ['bea', 'pip'],
      summary:
        'On Bus 45, Pip collects signatures. At each stop the learner pitches the petition to a new passenger.',
      goal: 'Pitch the petition three times, shorter and better each time.',
      canDos: ['short-story-with-a-point', 'pitch-45s'],
      phrases: ['heres-the-thing', 'it-matters-because', 'would-you-sign', 'thanks-for-listening'],
      draft: true,
      beats: [
        rec('board', 's1-e5-02'),
        stop('stop-1', 'bea', seconds(90, { neighbour: 75, regular: 60 })),
        gen('commuter', 'bea', 'Voice a sleepy commuter: ask one simple question, then sign.', {
          answer: answer({
            listener: 'bea',
            expects: 'Answers the commuter.',
            onTargetError: 'accept',
            fallback: nudge('bea', 'The commuter yawns, signs anyway and smiles.'),
          }),
        }),
        stop('stop-2', 'bea', seconds(60, { neighbour: 50, regular: 45 })),
        gen('parent', 'bea', 'Voice a busy parent: "Quickly, what\'s in it for me?"', {
          answer: answer({
            listener: 'bea',
            expects: 'Adapts the pitch for someone in a hurry.',
            phrases: ['it-matters-because'],
            onTargetError: 'accept',
            fallback: nudge('bea', 'The parent laughs, signs and hurries off.'),
          }),
        }),
        stop('stop-3', 'bea', seconds(45, { neighbour: 40, regular: 30 })),
        gen(
          'tourist',
          'bea',
          'Voice a tourist from the harbour: sign, then ask the way to the café.',
          {
            answer: answer({
              listener: 'bea',
              expects: 'Gives directions to the café.',
              phrases: ['thanks-for-listening'],
              onTargetError: 'accept',
              fallback: nudge('bea', 'The tourist spots the café sign from the window. Thanks!'),
            }),
          },
        ),
        rec('count', 's1-e5-03'),
        rec('bea-signs', 's1-e5-04'),
        rec('close', 's1-e5-05'),
      ],
    }),
    scene({
      id: 's1-e5-postcard',
      kind: 'postcard',
      title: 'Postcard from Bea',
      place: 'burrow',
      cast: ['bea'],
      summary: 'Bea says when Bus 45 leaves.',
      goal: 'Read and listen.',
      beats: [ui('postcard', { type: 'postcard', from: 'bea' }), rec('note', 's1-e5-01')],
    }),
    pipStory(
      's1-e5-story',
      'Pip practised its pitch on a lamp post. The lamp post did not sign.',
      'Tell how you practised your pitch on a lamp post, which did not sign.',
    ),
    voicemail(
      's1-e5-voicemail',
      'mei',
      's1-e5-06',
      'A hundred names: the town will vote on Saturday, and Mei asks the learner to speak.',
    ),
  ],
};

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
    '"How did it go?" on a real event from the season, or a final rehearsal for one coming up.',
  practice:
    'Accent warm-up: short messages from every neighbour, at their natural speed for your stage.',
  stageScaling:
    'Neighbour: 75 s speech, two questions. Regular: 90 s, the heron raises an objection. Local+: a rival speaker argues for the sale and the learner responds.',
  lines: ['s1-e6-01', 's1-e6-02', 's1-e6-03', 's1-e6-04', 's1-e6-05', 's1-e6-06'],
  cliffhanger: 's1-e6-05',
  recap: 's1-e6-06',
  draft: true,
  week: [
    { day: 1, scene: 's1-e6' },
    { day: 3, scene: 's1-e6-story' },
  ],
  scenes: [
    scene({
      id: 's1-e6',
      kind: 'episode',
      title: 'The Town Meeting',
      place: 'town-square',
      cast: ['mags', 'pip', 'hank', 'mei'],
      summary:
        'The town meets in the square to vote on selling the café building. The learner speaks for the café and answers one question.',
      goal: 'Give a short structured speech, answer a question, and thank the town.',
      canDos: ['speak-to-a-group', 'make-a-case-take-a-question'],
      phrases: ['a-few-words', 'first-second', 'great-question', 'thank-you-all'],
      draft: true,
      beats: [
        ui('crowd', { type: 'sfx', sound: 's1-e6-sfx-crowd-murmur' }),
        rec('proposal', 's1-e6-01'),
        rec('pip-whisper', 's1-e6-02'),
        learner(
          'speech',
          answer({
            listener: 'mags',
            expects: 'Gives a short structured speech for the café.',
            phrases: ['a-few-words', 'first-second'],
            canDo: 'speak-to-a-group',
            timer: seconds(60, { neighbour: 75, regular: 90 }),
            onTargetError: 'accept',
            fallback: nudge('pip', 'Whisper the start: "I\'d like to say a few words…"'),
          }),
        ),
        gen(
          'hank-question',
          'hank',
          'From the crowd, ask: "Why should the office care about one café?"',
          {
            answer: answer({
              listener: 'hank',
              expects: 'Answers the question.',
              phrases: ['great-question'],
              canDo: 'make-a-case-take-a-question',
              onTargetError: 'accept',
              fallback: nudge('mei', 'Call out one reason from the crowd, warmly.'),
            }),
          },
        ),
        ui('cheer', { type: 'sfx', sound: 's1-e6-sfx-crowd-cheer' }),
        rec('vote', 's1-e6-03'),
        rec('mei-thanks', 's1-e6-04'),
        learner(
          'thank-town',
          answer({
            listener: 'mei',
            expects: 'Thanks the group.',
            phrases: ['thank-you-all'],
            onTargetError: 'accept',
            fallback: nudge('pip', 'Shout "Thank you all!" for both of you.'),
          }),
        ),
        gen('hank-orders', 'hank', 'Order "the full price, fifty kilos. Don\'t tell anyone."'),
        rec('boat', 's1-e6-05'),
      ],
    }),
    pipStory(
      's1-e6-story',
      "Pip couldn't sleep; it practised your speech to the moon.",
      "Tell how you couldn't sleep and practised the learner's speech to the moon.",
    ),
  ],
};
