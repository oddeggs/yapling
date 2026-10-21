import { callMotion, critterMotion, screenMotion, screenTransitions } from './animations';
import { transitions } from './transitions';

export * from './animations';
export * from './easing';
export * from './keyframes';
export * from './transitions';
export { hubKeyframes } from './keyframes/hub.generated';
export { screenKeyframes } from './keyframes/screens.generated';
export { sharedKeyframes } from './keyframes/shared.generated';

/** Every motion token, by where it plays: `motion.screens.toast`, `motion.critter.idle.excited`. */
export const motion = {
  screenTransitions,
  screens: screenMotion,
  call: callMotion,
  critter: critterMotion,
  transitions,
} as const;
