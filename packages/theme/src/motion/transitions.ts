/**
 * The prototype's CSS transitions (a value easing to its new state), for
 * `withTiming(value, { duration: durationMs, easing: Easing.bezier(...easing) })`.
 */
import { cssEasing, curves, type Easing } from './easing';

export interface Transition {
  readonly durationMs: number;
  readonly easing: Easing;
}

const t = (durationMs: number, easing: Easing): Transition => ({ durationMs, easing });

export const transitions = {
  /** A toggle's knob sliding across (quiet hours). */
  toggle: t(200, cssEasing.ease),
  /** The picked roommate lifting above its name tile, or settling back. */
  roommateLift: t(450, curves.pop),
  /** A fluency-mirror bar filling to its round's Flow. */
  barFill: t(800, cssEasing.ease),
  /** The mic swelling while it records, and back. */
  micPress: t(150, cssEasing.ease),
} as const satisfies Record<string, Transition>;
