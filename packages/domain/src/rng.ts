/**
 * A random source: a function returning a float in [0, 1). The learning model never calls
 * `Math.random`; callers pass a seeded source so every pick can be replayed.
 */
export type Rng = () => number;

/** A small seeded generator (mulberry32). The same seed gives the same sequence. */
export const seededRng = (seed: number): Rng => {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
};

/** One item of a non-empty list, chosen by the random source; undefined for an empty list. */
export const pick = <T>(items: readonly T[], rng: Rng): T | undefined => {
  if (items.length === 0) return undefined;
  const index = Math.min(items.length - 1, Math.floor(rng() * items.length));
  return items[index];
};
