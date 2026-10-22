import type { Species } from '../critter';
import { NO_TUNE, type Tune } from './pose';

/**
 * Per-species amounts on top of the acts as written (1 = as written), from each species' contact
 * sheets; the reasons are in `MOTION.md`.
 */
export const TUNING: Readonly<Partial<Record<Species, Partial<Tune>>>> = {};

/** The species' tuning, every amount filled in. */
export function tuneOf(species: Species): Tune {
  return { ...NO_TUNE, ...TUNING[species] };
}
