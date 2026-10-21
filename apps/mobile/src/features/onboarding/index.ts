// Onboarding: the ferry, the AI disclosure, the roommate, the placement call, the residency card
// and notifications, and where an open of the app goes.
export {
  AgeStep,
  AiStep,
  CardStep,
  LanguageStep,
  NotificationsStep,
  PickStep,
  UnpackStep,
} from './steps';
export { MicPrePrompt, type MicPrePromptProps } from './unpack-screen';
export { chromeLanguageOf, launchTarget, type LaunchTarget, type Pace } from './flow';
export { onboardingStore, pacePreference, useOnboarding } from './use-onboarding';
export {
  HOME_ROUTE,
  ONBOARDING_ROUTES,
  PLACEMENT_SCENE_ID,
  placementCallHref,
  stepHref,
} from './routes';
