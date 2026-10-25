import type { Stage } from '../director/world';

/*
 * The syllabus every story is written from: six stages (CEFR Pre-A1 to C1), 44 units in the
 * function order every major course shares, and what each stage allows (speed, cast, choices,
 * planning, the listening questions it asks). A unit is one story; its title is the line it
 * teaches. Sources are the CEFR Companion Volume (CV) and Pearson's GSE adult objectives; see
 * `reports/Speaking curriculum for story lessons.md`.
 */

export interface Unit {
  readonly id: string;
  readonly stage: Stage;
  /** The line the unit teaches, as its title ("How much is it?"). */
  readonly title: string;
  /** What the learner can do by the end, with its source. */
  readonly canDo: string;
  readonly fn: string;
  /** 3–5 target chunks: the companion models them, the learner uses them. */
  readonly chunks: readonly string[];
  /** The conversation strategy threaded through the unit, and its chunk. */
  readonly strategy: string;
}

export interface StageDials {
  /** How the characters speak. */
  readonly speech: string;
  /** Who may speak in a scene besides the companion. */
  readonly guests: 'none' | 'episode4' | 'one' | 'two';
  /** Most words in one character turn. */
  readonly turnWords: number;
  /** Two-choice offers: allowed as the way to ask, or only as a rescue. */
  readonly choices: 'allowed' | 'rescue';
  /** Seconds of planning offered before the hard task. */
  readonly planningSeconds: number;
  /** Characters talking to each other where the learner overhears. */
  readonly overheard: boolean;
  /** The listening questions this stage asks. */
  readonly listening: string;
  /** The learner's longest turn the stage asks for. */
  readonly longestTurn: string;
  /** Episodes in a story. */
  readonly episodes: 4 | 5;
}

export const STAGE_DIALS: Readonly<Record<Stage, StageDials>> = {
  visitor: {
    speech: 'very slow and clear, long pauses, repeats gladly; one short sentence a turn',
    guests: 'none',
    turnWords: 8,
    choices: 'allowed',
    planningSeconds: 0,
    overheard: false,
    listening: 'who? where? when? how much?',
    longestTurn: 'one or two prepared sentences',
    episodes: 4,
  },
  newcomer: {
    speech: 'slow and clear, simple sentences, helps when needed',
    guests: 'episode4',
    turnWords: 18,
    choices: 'rescue',
    planningSeconds: 15,
    overheard: false,
    listening: 'what happened first and next? do they agree? what is the main point?',
    longestTurn: 'a story as a simple list of points, 30–45 seconds',
    episodes: 5,
  },
  neighbour: {
    speech: 'clear, standard speed',
    guests: 'one',
    turnWords: 25,
    choices: 'rescue',
    planningSeconds: 30,
    overheard: true,
    listening: 'what will happen next? how does someone feel? what do they think?',
    longestTurn: 'a linear story with feelings, 60–90 seconds',
    episodes: 5,
  },
  regular: {
    speech: 'near-natural speed, light idiom, a guest pushes back once',
    guests: 'one',
    turnWords: 25,
    choices: 'rescue',
    planningSeconds: 30,
    overheard: true,
    listening: 'infer an opinion, spot a joke or a misunderstanding',
    longestTurn: 'retell in their own words or explain a problem, about 90 seconds',
    episodes: 5,
  },
  local: {
    speech: 'natural speed, interruptions allowed',
    guests: 'one',
    turnWords: 25,
    choices: 'rescue',
    planningSeconds: 0,
    overheard: true,
    listening: 'purpose, fact or opinion, exaggeration, mood',
    longestTurn: 'the personal significance of events in detail, about 2 minutes',
    episodes: 5,
  },
  voice: {
    speech: 'fast and natural, overlapping, loosely structured',
    guests: 'two',
    turnWords: 30,
    choices: 'rescue',
    planningSeconds: 0,
    overheard: true,
    listening: 'implied attitude, irony, relationships',
    longestTurn: 'integrated sub-themes with a conclusion, 2–3 minutes',
    episodes: 5,
  },
};

const u = (
  id: string,
  stage: Stage,
  title: string,
  canDo: string,
  fn: string,
  chunks: string[],
  strategy: string,
): Unit => ({ id, stage, title, canDo, fn, chunks, strategy });

export const UNITS: readonly Unit[] = [
  // Visitor (Pre-A1–A1)
  u(
    'V1',
    'visitor',
    'Hi, I’m…',
    'say and ask names, greet, spell your name (GSE 10, 12, 14)',
    'introducing yourself',
    ['Hi, I’m …', 'Nice to meet you.', 'What’s your name?', 'It’s …'],
    'Sorry? Again, please.',
  ),
  u(
    'V2',
    'visitor',
    'How much is it?',
    'ask the price and ask for food and drink (GSE 17, 19; CV A1 numbers, cost and time)',
    'buying',
    ['How much is …?', 'It’s …', 'One …, please.', 'Here you are.'],
    'say the number back to check',
  ),
  u(
    'V3',
    'visitor',
    'What time?',
    'tell the time and days, "next week", "last Friday" (GSE 16, 19, 25)',
    'time',
    ['What time is it?', 'At six.', 'On Monday.', 'See you at …'],
    'Slowly, please.',
  ),
  u(
    'V4',
    'visitor',
    'I’m a nurse',
    'say what you do, your family, where you live (GSE 19, 22; CV A1 describe yourself)',
    'personal information',
    ['I work at …', 'I live in …', 'Do you …?', 'And you?'],
    'answer, then ask back: And you?',
  ),
  u(
    'V5',
    'visitor',
    'I like tea',
    'say what you like, want, can and can’t (GSE 27, 28)',
    'likes and wants',
    ['I like …', 'I don’t like …', 'Can I have …?', 'I can’t …'],
    'I don’t know the word.',
  ),
  u(
    'V6',
    'visitor',
    'Can you help me?',
    'ask for help, say how you feel, simple places (GSE 27, 28, 29)',
    'asking for help',
    ['Can you help me?', 'Where is …?', 'I’m tired.', 'I’m lost.'],
    'Yes, I understand. / No, I don’t.',
  ),
  // Newcomer (A2–A2+)
  u(
    'N1',
    'newcomer',
    'Could I borrow that?',
    'make requests and ask to borrow (GSE 26, 30)',
    'requests',
    ['Could I have …?', 'Can I borrow …?', 'Sure, here you go.'],
    'checking understanding: So, …?',
  ),
  u(
    'N2',
    'newcomer',
    'Are you free on Friday?',
    'invite someone and arrange to meet (GSE 31, 37)',
    'invitations and arrangements',
    ['Are you free on …?', 'How about …?', 'Sounds good.', 'Sorry, I can’t. I’m …'],
    'thinking time: Mm, let me see.',
  ),
  u(
    'N3',
    'newcomer',
    'Can I speak to…?',
    'start and close a phone call, leave and take a message, book by phone (GSE 33, 36, 38)',
    'phone calls',
    ['Hi, it’s … calling.', 'Could you spell that?', 'Can you hold on?'],
    'ask someone to wait or spell',
  ),
  u(
    'N4',
    'newcomer',
    'Which way?',
    'give and follow directions with first, then, next (CV A2 giving information)',
    'directions',
    ['Go straight, then turn left.', 'It’s next to …', 'Did you say left?'],
    'repeat back to check',
  ),
  u(
    'N5',
    'newcomer',
    'There’s a problem',
    'point out something wrong, apologise, give an excuse (CV A2; GSE 31, 33)',
    'problems and apologies',
    ['Excuse me, there’s a problem with …', 'I’m so sorry, I …', 'No problem.'],
    'sorry plus a reason',
  ),
  u(
    'N6',
    'newcomer',
    'Guess what happened',
    'tell a story as a list of points (GSE 38, 40)',
    'telling a simple story',
    ['First … then … after that …', 'It was …', 'Really? What happened?'],
    'sequencing',
  ),
  u(
    'N7',
    'newcomer',
    'How’s it going?',
    'make small talk, give compliments, show interest (GSE 36, 37, 41)',
    'small talk',
    ['How’s it going?', 'I love your …', 'Oh really?', 'What about you?'],
    'active listening: uh-huh, right',
  ),
  u(
    'N8',
    'newcomer',
    'I don’t feel great',
    'describe basic symptoms and give simple advice (GSE 36, 39)',
    'health and advice',
    ['I’ve got a headache.', 'You should …', 'Why don’t you …?', 'Hope you feel better.'],
    'expressing sympathy',
  ),
  // Neighbour (B1)
  u(
    'B1',
    'neighbour',
    'So, how did it go?',
    'start, keep going and close a conversation (GSE 44, 46; CV B1 conversation)',
    'conversation',
    ['I see.', 'So how did you …?', 'Anyway, I’d better …'],
    'follow-up questions',
  ),
  u(
    'B2',
    'neighbour',
    'You won’t believe this',
    'tell an experience with feelings (GSE 45, 49)',
    'narrating',
    ['The funny thing was …', 'I was so …', 'In the end …'],
    'time connectors',
  ),
  u(
    'B3',
    'neighbour',
    'That’s true, but…',
    'give opinions, agree and disagree politely with reasons (GSE 45; CV B1 informal discussion)',
    'opinions',
    ['I think … because …', 'I’m not sure about that.', 'That’s true, but …'],
    'a reason every time',
  ),
  u(
    'B4',
    'neighbour',
    'I’m afraid there’s a problem',
    'complain and return something faulty (GSE 43; CV B1 goods and services)',
    'complaints',
    ['I’m afraid …', 'Could you …?', 'I’d like a refund.'],
    'polite but firm',
  ),
  u(
    'B5',
    'neighbour',
    'Here’s the thing',
    'explain a problem and what to do next (CV B1 goal-oriented co-operation; GSE 45, 46)',
    'problem solving',
    ['The main problem is …', 'What if we …?', 'That way …', 'What do you think?'],
    'inviting others’ views',
  ),
  u(
    'B6',
    'neighbour',
    'I’m calling about…',
    'report something unexpected by phone and make an appointment (CV B1 telecommunications; GSE 42)',
    'phone: reporting',
    ['I’m calling about …', 'The thing is …', 'Could you call me back?'],
    'confirming details',
  ),
  u(
    'B7',
    'neighbour',
    'Guess what?',
    'give news and react to good and bad news (GSE 44, 51)',
    'news',
    ['That’s great news!', 'Oh no, I’m sorry to hear that.', 'Guess what?'],
    'matching the feeling',
  ),
  u(
    'B8',
    'neighbour',
    'Tell me about yourself',
    'talk about your experience, plans and hopes in an interview (CV B1 interviewing; GSE 48)',
    'interviews',
    ['I’ve been working as … for …', 'One thing I’m proud of is …', 'I’d like to …'],
    'giving an example',
  ),
  // Regular (B1+)
  u(
    'R1',
    'regular',
    'What I mean is…',
    'deal with a misunderstanding and rephrase yourself (GSE 58)',
    'clarifying',
    ['What I mean is …', 'Sorry, I meant …', 'Let me put it another way.'],
    'self-repair',
  ),
  u(
    'R2',
    'regular',
    'It’s a kind of…',
    'describe something you can’t name (GSE 53, 55; CV B1 compensating)',
    'describing',
    ['It’s a kind of …', 'It’s something you use to …', 'What’s the word …?'],
    'circumlocution',
  ),
  u(
    'R3',
    'regular',
    'Sorry to interrupt',
    'interrupt politely and invite others in (GSE 52, 55)',
    'turn-taking',
    ['Sorry to interrupt, but …', 'Could I just say something?', 'What do you think, …?'],
    'turn-taking',
  ),
  u(
    'R4',
    'regular',
    'So we’ve agreed…',
    'compare options and reach an agreement (CV B1 co-operation; B1 Preliminary part 3)',
    'agreeing',
    ['Shall we …?', 'Either works for me.', 'So we’ve agreed to …'],
    'summarising',
  ),
  u(
    'R5',
    'regular',
    'Quick update',
    'give a work update and report others’ opinions (GSE 51)',
    'updates',
    ['Yesterday I …, today I’m …', 'One blocker is …', '… thinks …'],
    'signposting',
  ),
  u(
    'R6',
    'regular',
    'I’d love to, but…',
    'decline offers and requests politely (GSE 56)',
    'declining',
    ['That’s really kind, but …', 'Maybe another time.', 'I’d love to, but …'],
    'softening',
  ),
  u(
    'R7',
    'regular',
    'That must be hard',
    'express feelings and respond to others’ (GSE 51)',
    'feelings',
    ['I was really surprised that …', 'I know how you feel.', 'That must be …'],
    'empathy',
  ),
  u(
    'R8',
    'regular',
    'It started when…',
    'describe symptoms and unexpected events in order (GSE 54)',
    'incidents',
    ['It started when …', 'It hurts when I …', 'Suddenly …'],
    'sequencing an incident',
  ),
  // Local (B2–B2+)
  u(
    'L1',
    'local',
    'Here’s what happened',
    'describe a consumer problem and ask for a solution (GSE 59, 60)',
    'complaints in detail',
    ['I was told … but …', 'What I’d like is …'],
    'precise detail',
  ),
  u(
    'L2',
    'local',
    'Wouldn’t it make more sense…?',
    'build a reasoned argument (GSE 62)',
    'arguing a case',
    ['The main reason is …', 'On top of that …', 'Wouldn’t it make more sense to …?'],
    'building a case',
  ),
  u(
    'L3',
    'local',
    'Have you got a minute?',
    'handle an awkward situation and apologise properly (GSE 62)',
    'awkward conversations',
    ['Have you got a minute?', 'I feel bad about …', 'I owe you an apology.'],
    'opening gently',
  ),
  u(
    'L4',
    'local',
    'If I could just finish…',
    'gain time and keep your turn (GSE 64; CV B2 turn-taking)',
    'holding the floor',
    ['That’s a difficult question.', 'Bear with me.', 'If I could just finish …'],
    'holding the floor',
  ),
  u(
    'L5',
    'local',
    'It might have been…',
    'speculate about causes and what could have happened (GSE 64)',
    'speculating',
    ['It might have been …', 'If we hadn’t …', 'I doubt it was …'],
    'hedging',
  ),
  u(
    'L6',
    'local',
    'Meet in the middle',
    'negotiate a dispute and state the limits of a concession (CV B2; GSE 70, 73)',
    'negotiating',
    ['I can see where you’re coming from, but …', 'As long as …', 'That’s as far as we can go.'],
    'conceding and limiting',
  ),
  u(
    'L7',
    'local',
    'The funny thing is…',
    'tell a funny or interesting story with detail (GSE 59, 67)',
    'storytelling',
    ['So there I was …', 'And then, out of nowhere …', 'The funny thing is …'],
    'pacing a punchline',
  ),
  u(
    'L8',
    'local',
    'Tell me about a time when…',
    'answer interview questions with follow-ups and personal significance (CV B2; GSE 72)',
    'interviews',
    ['What I learned from that was …', 'Looking back …', 'Tell me about a time when …'],
    'the point of the story',
  ),
  // Voice (C1)
  u(
    'C1',
    'voice',
    'Can I jump in?',
    'join a fast conversation already under way (GSE 76, 81)',
    'entering',
    ['Sorry, can I jump in here?', 'Going back to what you said …'],
    'entering',
  ),
  u(
    'C2',
    'voice',
    'I take your point, but…',
    'disagree or criticise diplomatically (GSE 77; CV C1)',
    'diplomacy',
    ['I take your point, but …', 'Correct me if I’m wrong …', 'I wonder if …'],
    'tact',
  ),
  u(
    'C3',
    'voice',
    'Was that a joke?',
    'follow irony, humour and implied attitude, and joke back (GSE 71, 78)',
    'humour',
    ['Very funny.', 'You’re not serious?', 'Was that a joke?'],
    'reading the room',
  ),
  u(
    'C4',
    'voice',
    'Let’s take a decision',
    'frame a discussion, summarise and weigh views (CV C1 co-operation)',
    'chairing',
    ['Let’s start with …', 'So what I’m hearing is …', 'Let’s take a decision.'],
    'chairing',
  ),
  u(
    'C5',
    'voice',
    'The pitch',
    'present persuasively and handle interruptions (GSE 80; CV C1 addressing audiences)',
    'presenting',
    ['Here’s the opportunity …', 'Good question, and …'],
    'recovering from interruptions',
  ),
  u(
    'C6',
    'voice',
    'What I’m getting at…',
    'reformulate smoothly with vague and approximate language (GSE 76, 80)',
    'reformulating',
    ['What I’m getting at is …', 'sort of', 'more or less'],
    'invisible repair',
  ),
];

export const unitById = (id: string): Unit | undefined => UNITS.find((x) => x.id === id);

/** One episode of a unit's story: its job in the lesson, and what the scene does. */
export interface EpisodeJob {
  readonly n: number;
  readonly beat: string;
  readonly job: string;
  readonly listening: string;
  readonly speaking: string;
  readonly feedback: string;
}

export const EPISODES: readonly EpisodeJob[] = [
  {
    n: 1,
    beat: 'the problem lands',
    job: 'introduce the situation and model the target chunks so the learner notices them',
    listening: 'predict, then get the gist: what has gone wrong?',
    speaking:
      'a question the learner can surely answer about their own life first, then the target chunks in controlled use, framed honestly as rehearsal ("be my first customer")',
    feedback: 'specific praise only; at most one prompt on a target form',
  },
  {
    n: 2,
    beat: 'the first try',
    job: 'semi-controlled, personalised practice',
    listening: 'detail: the numbers, names and times the plan needs',
    speaking:
      'the learner uses the chunks for a small goal; an information gap from their own life or job',
    feedback: 'prompt in character on the 1–2 target forms; recast everything else',
  },
  {
    n: 3,
    beat: 'the turn',
    job: 'listening and the unit’s strategy',
    listening:
      'news arrives as audio (a voice message, a call, the companion reading something aloud): gist, then detail, then one inference question ("Is she upset?")',
    speaking: 'react to the news and use the unit’s strategy (check, clarify, ask to wait)',
    feedback: 'prompt the strategy if the learner skips it',
  },
  {
    n: 4,
    beat: 'the hard conversation',
    job: 'the free task, in the situation the learner said is hard',
    listening: 'understand the other speaker inside the task, at the stage’s speed',
    speaking:
      'a free task with a clear outcome (an agreement, a booking, a refund), after a moment to plan',
    feedback:
      'no corrections during the task; only natural requests to clarify; the companion remembers points for later',
  },
  {
    n: 5,
    beat: 'the payoff',
    job: 'report, look back at the language, review',
    listening: 'hear one of their own best lines said back',
    speaking:
      'retell what happened to someone who missed it, then once more, shorter; the payoff lands because of what they said',
    feedback: 'the look-back: two or three phrases, one strength, one thing to fix',
  },
];

/** The four-episode Visitor story merges the first two episodes. */
export function episodeJob(stage: Stage, n: number): EpisodeJob {
  const merged = STAGE_DIALS[stage].episodes === 4;
  const i = merged ? (n <= 1 ? 0 : n) : n - 1;
  const job = EPISODES[Math.min(EPISODES.length - 1, Math.max(0, i))];
  if (!job) throw new Error('no episodes');
  return job;
}
