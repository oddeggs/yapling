/* Shared context: the real beats, the prior transcript per beat, and what the listener last said. */
import { readFileSync } from 'node:fs';
export const REPO = '/Users/kbm5pro/oddeggs/yapling';
const CALLS = '/private/tmp/claude-501/-Users-kbm5pro-oddeggs/eae76967-c50c-4f0d-b25b-ae645191084a/scratchpad/calls';
export const story = await import(`${REPO}/packages/story/src/index.ts`);

const load = (f: string) => JSON.parse(readFileSync(`${CALLS}/${f}.json`, 'utf8')).lines as any[];
const calls: Record<string, any[]> = { call_4ccb: load('call_4ccb'), call_edd4: load('call_edd4') };

export const E1 = story.findScene('s1-e1');
export const UNPACK = story.findScene('s1-pro-unpack');
const PLACEMENT = new Set(['ask-work', 'ask-day', 'ask-free-time', 'ask-goal']);
export const sceneOf = (beat: string) => (PLACEMENT.has(beat) ? UNPACK : E1);

export const TARGETS = [
  { id: 'final_s', description: 'drops the -s on he/she/it verbs (she have, he go)' },
  { id: 'past_ed', description: 'uses the present tense for the past (yesterday I go, yesterday you look)' },
];

const line = (speaker: string, text: string, beatId: string) =>
  speaker === 'learner'
    ? { speaker, text, at: 0, turn: 1, words: [], beatId, outcome: 'fine', phrasesUsed: [], canDo: null, targetId: null, correctionFixed: null }
    : { speaker, text, beatId };

/** A clean placement chat up to each box. */
const placementPrior: Record<string, any[]> = (() => {
  const intro = line('pip', "This is it. Our burrow! It's… mostly boxes. One box left! Help me unpack?", 'intro');
  const q1 = line('pip', 'Ooh, this box says WORK! What do you do for work?', 'ask-work');
  const a1 = line('learner', "I'm a teacher.", 'ask-work');
  const q2 = line('pip', "A teacher! What's a normal day like for you?", 'ask-day');
  const a2 = line('learner', 'In the morning I teach, and at night I mark homework.', 'ask-day');
  const q3 = line('pip', 'This box is all snacks and games. What do you like to do after work?', 'ask-free-time');
  const a3 = line('learner', 'I like reading.', 'ask-free-time');
  const q4 = line('pip', 'Last box! What do you want to get better at, in English?', 'ask-goal');
  return {
    'ask-work': [intro, q1],
    'ask-day': [intro, q1, a1, q2],
    'ask-free-time': [intro, q1, a1, q2, a2, q3],
    'ask-goal': [intro, q1, a1, q2, a2, q3, a3, q4],
  };
})();

/** The transcript before the learner's turn on `beat`. */
export function priorFor(beat: string, src = ''): any[] {
  if (PLACEMENT.has(beat)) return placementPrior[beat]!;
  const lines = src.includes('edd4') ? calls.call_edd4 : calls.call_4ccb;
  const i = lines.findIndex((l) => l.beatId === beat && l.speaker === 'learner');
  if (i < 0) throw new Error(`no learner line for ${beat}`);
  return lines.slice(0, i).map((l) => (l.speaker === 'learner' ? { ...l, outcome: l.outcome ?? 'fine' } : l));
}

/** The beat's answer (what we hoped) and listener. */
export function answerOf(beat: string): { expects: string; listener: string } {
  const scene = sceneOf(beat);
  const b = scene.beats.find((x: any) => x.id === beat);
  if (!b?.answer) throw new Error(`no answer on ${beat}`);
  return { expects: b.answer.expects, listener: b.answer.listener };
}

/** The line just before the learner's turn, as "Name: text". */
export function lastLineFor(beat: string, src = ''): string {
  const prior = priorFor(beat, src);
  const l = [...prior].reverse().find((x) => x.speaker !== 'learner');
  return `${story.CAST[l.speaker].name}: ${l.text}`;
}
