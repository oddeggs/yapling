import Constants from 'expo-constants';

/**
 * The learner-test tools (the time-travel menu, the build label) exist in development builds and
 * in the dev variant (`APP_VARIANT=dev`, the build learners test), never in the store app.
 */
export const devToolsEnabled: boolean =
  __DEV__ || Constants.expoConfig?.extra?.['appVariant'] === 'dev';
