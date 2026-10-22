import type { Species } from '../critter';
import { NO_TUNE, type Tune } from './pose';

/**
 * Per-species amounts on top of the acts as written (1 = as written), from each species' contact
 * sheets; the reasons are in `MOTION.md`.
 */
export const TUNING: Readonly<Partial<Record<Species, Partial<Tune>>>> = {
  // Horns, not ears: they barely perk or sway. Heavy: a lower hop, a firmer landing.
  bison: { ears: 0.3, hop: 0.75, squash: 0.8 },
  // Stocky: a lower hop and a firmer landing.
  bulldog: { hop: 0.85, squash: 0.85 },
  // Big round ears swing wide arcs at the acts' amounts.
  koala: { ears: 0.7 },
  // Its eyes nearly fill the face: a smaller turn keeps them inside the outline.
  tarsier: { yaw: 0.8 },
};

/** The species' tuning, every amount filled in. */
export function tuneOf(species: Species): Tune {
  return { ...NO_TUNE, ...TUNING[species] };
}
