import type { Progress } from '@yapling/contracts';
import { isRingFull } from '@yapling/domain';

import { ONBOARDING_STEPS, type OnboardingStep } from '../features/onboarding/flow';
import { FUNNEL_EVENTS, type FunnelStep } from './events';

/*
 * The first-week funnel, read from what the app already knows rather than from taps, so a step
 * counts only once the learner's data says it happened: install → first language picked on the
 * splash → placement call done → first episode call done → a full weekly ring (the keepsake) →
 * back on day 8 or later. Each step is sent once per install.
 */

export const FUNNEL_STEPS = [
  'install',
  'language',
  'placement',
  'firstEpisode',
  'ringFull',
  'day8',
] as const satisfies readonly FunnelStep[];

/** The day the funnel's last step waits for. */
export const BACK_DAY = 8;

export interface FunnelInputs {
  /** The furthest onboarding step reached on this phone. */
  readonly onboardingStep: OnboardingStep;
  /** The learner's progress; null before there is one. */
  readonly progress: Pick<Progress, 'weeks'> | null;
  /** Today's day since install on the app's clock (day 1 is the install day); null unknown. */
  readonly dayIndex: number | null;
}

const reachedOnboarding = (step: OnboardingStep, at: OnboardingStep) =>
  ONBOARDING_STEPS.indexOf(step) >= ONBOARDING_STEPS.indexOf(at);

/** The funnel steps the learner has reached, in funnel order. */
export function reachedSteps({ onboardingStep, progress, dayIndex }: FunnelInputs): FunnelStep[] {
  const weeks = progress?.weeks ?? [];
  const reached: Record<FunnelStep, boolean> = {
    install: true,
    // The splash's "continue" moves onboarding to the age check.
    language: reachedOnboarding(onboardingStep, 'age'),
    // The placement call's end moves onboarding to the residency card.
    placement: reachedOnboarding(onboardingStep, 'card'),
    // Each week's ring opens with its episode.
    firstEpisode: weeks.some((week) => week.slots[0]?.status === 'done'),
    ringFull: weeks.some(isRingFull),
    day8: dayIndex !== null && dayIndex >= BACK_DAY,
  };
  return FUNNEL_STEPS.filter((step) => reached[step]);
}

/** The reached steps not sent yet, in funnel order. */
export function stepsToSend(reached: readonly FunnelStep[], sent: readonly FunnelStep[]) {
  return reached.filter((step) => !sent.includes(step));
}

/** A step's event and its place in the funnel (1-based). */
export const funnelEventOf = (step: FunnelStep) => ({
  event: FUNNEL_EVENTS[step],
  funnelStep: FUNNEL_STEPS.indexOf(step) + 1,
});
