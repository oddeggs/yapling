// Onboarding: the ferry, the AI disclosure, the level question, the roommate, the placement call,
// the residency card (a Visitor's too) and notifications, a Visitor's first knock, and where an
// open of the app goes.
export {
  AgeStep,
  AiStep,
  CardStep,
  KnockStep,
  LanguageStep,
  LevelStep,
  NotificationsStep,
  PickStep,
  PickStepOrLevel,
  UnpackStep,
} from './steps';
export { MicPrePrompt, type MicPrePromptProps } from './unpack-screen';
export { chromeLanguageOf, launchTarget, type LaunchTarget, type Pace } from './flow';
export {
  flushPendingStage,
  onboardingStore,
  pacePreference,
  requestStage,
  useOnboarding,
} from './use-onboarding';
export {
  FIRST_CHAPTER_SCENE_ID,
  HOME_ROUTE,
  KNOCK_ROUTE,
  ONBOARDING_ROUTES,
  firstChapterHref,
  PLACEMENT_SCENE_ID,
  placementCallHref,
  stepHref,
} from './routes';
