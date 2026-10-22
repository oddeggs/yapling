import type { Mood } from '../critter';
import type { Pair, Point } from './parts';

/**
 * The moods the rig moves: their eyes blink and their paws are not held to the face. The others
 * keep today's drawing (its idle and its blink): `laugh` and `warm` have arcs of joy for eyes, `shy`
 * holds its cheeks and `think` its chin, over the face, where the rig has no arm to move them by.
 * A test cuts every species in every mood and holds this list to what cuts.
 */
export const RIG_MOODS = [
  'happy',
  'excited',
  'surprised',
  'confused',
  'listen',
  'proud',
  'worried',
  'sleepy',
  'patient',
  'wave',
] as const satisfies readonly Mood[];

const RIGGED: ReadonlySet<Mood> = new Set(RIG_MOODS);

/** Whether a critter in `mood` is drawn by the rig. */
export function usesRig(mood: Mood): boolean {
  return RIGGED.has(mood);
}

/**
 * Which paws the mood holds up (a wave, a scratch, both up for joy), from where the generator put
 * them over the floor (`ground`), in rig units of `unit` points: paws at rest sit about 40 above
 * it, raised ones over 100.
 */
export function raisedPaws(ground: Point, paws: Pair<Point>, unit: number): [boolean, boolean] {
  const up = (p: Point) => ground.y - p.y > 75 * unit;
  return [up(paws[0]), up(paws[1])];
}
