import { settlingSceneId } from '@yapling/domain';
import type { Href } from 'expo-router';

import type { OnboardingStep } from './flow';

/*
 * Where onboarding goes. The call screen and the burrow belong to other features: their paths are
 * the agreed names, kept here so the integration only has to check this file.
 */

/** A path as an href (some of these routes belong to other features). */
const href = (path: string): Href => path;

/** Each step's screen. */
export const ONBOARDING_ROUTES = {
  language: '/onboarding',
  age: '/onboarding/age',
  ai: '/onboarding/ai',
  level: '/onboarding/level',
  pick: '/onboarding/pick',
  unpack: '/onboarding/unpack',
  card: '/onboarding/card',
  notifications: '/onboarding/notifications',
} as const satisfies Record<Exclude<OnboardingStep, 'done'>, string>;

/** The burrow, where onboarding ends (Linh knocks there on the first evening). */
export const HOME_ROUTE: Href = href('/(home)');

/** The call screen. */
export const CALL_ROUTE = '/(call)/call';

/** The day-one unpacking chat: the placement call (`@yapling/story`'s prologue scene). */
export const PLACEMENT_SCENE_ID = 's1-pro-unpack';

/**
 * The placement call. `next` asks the call screen to go on to the residency card when the call
 * ends (with `callId` when it has one) instead of the post-call card.
 */
export const placementCallHref = (fixtures?: string): Href => ({
  pathname: CALL_ROUTE,
  params: {
    scene: PLACEMENT_SCENE_ID,
    next: ONBOARDING_ROUTES.card,
    ...(fixtures !== undefined ? { fixtures } : {}),
  },
});

/**
 * A Visitor's first evening after onboarding: Linh at the door (the microphone asked first when
 * iOS hasn't asked yet), then Settling in's first chapter as a live call.
 */
export const KNOCK_ROUTE = '/onboarding/knock';

/** Settling in's first chapter: Linh's knock, "Hello". */
export const FIRST_CHAPTER_SCENE_ID = settlingSceneId(1);

/**
 * Linh's knock as a live call. No `next`: when it ends the call screen shows its own after-call
 * card, which goes on to the burrow.
 */
export const firstChapterHref = (fixtures?: string): Href => ({
  pathname: CALL_ROUTE,
  params: { scene: FIRST_CHAPTER_SCENE_ID, ...(fixtures !== undefined ? { fixtures } : {}) },
});

export const knockHref = (): Href => href(KNOCK_ROUTE);

export const stepHref = (step: Exclude<OnboardingStep, 'done'>): Href =>
  href(ONBOARDING_ROUTES[step]);
