import type { ConfigContext, ExpoConfig } from 'expo/config';

/** Two variants installed side by side: dev builds and the store app. */
export type AppVariant = 'dev' | 'prd';

export interface VariantConfig {
  name: string;
  bundleIdentifier: string;
  scheme: string;
  /** The API when `API_BASE` is unset; undefined until the variant has a deployed host. */
  apiBase: string | undefined;
}

const IOS_DEPLOYMENT_TARGET = '17.0';

/** The app's background, shown behind the first frame and every screen until the theme takes over. */
export const BACKGROUND = '#FBFAFD';

/**
 * The fonts embedded natively, so the first frame already has them: `@yapling/theme`'s font faces,
 * each registered under its PostScript name (the file name). `tools/fonts` copies them here and
 * checks this list.
 */
export const FONT_FILES = [
  'Lexend-Medium.ttf',
  'Lexend-SemiBold.ttf',
  'Lexend-Bold.ttf',
  'Lexend-ExtraBold.ttf',
  'Lexend-Black.ttf',
  'KithfieldHand-Bold.ttf',
] as const;

/**
 * Usage strings iOS shows when the app first asks. Calls are spoken: the microphone carries the
 * learner's voice, and speech recognition turns it into the words the critter answers.
 */
export const USAGE = {
  microphone: 'Yapling uses the microphone so you can talk with your critter roommate.',
  speechRecognition:
    'Yapling uses speech recognition so your critter roommate can understand what you say.',
} as const;

export const VARIANTS: Record<AppVariant, VariantConfig> = {
  dev: {
    name: 'Yapling Dev',
    bundleIdentifier: 'studio.oddeggs.yapling.dev',
    // Its own scheme, so links open the right app when both are installed.
    scheme: 'yapling-dev',
    // `wrangler dev` on this Mac, which the simulator reaches as its own localhost.
    apiBase: 'http://127.0.0.1:8787/api',
  },
  prd: {
    name: 'Yapling',
    bundleIdentifier: 'studio.oddeggs.yapling',
    scheme: 'yapling',
    apiBase: undefined,
  },
};

/** Unset means dev, for local work; every EAS profile names its variant. */
export function resolveVariant(raw: string | undefined): AppVariant {
  if (!isSet(raw)) return 'dev';
  if (raw === 'dev' || raw === 'prd') return raw;
  throw new Error(`APP_VARIANT must be dev or prd, not "${raw}"`);
}

/** Settings read from the environment; unset or empty means the variant's default. */
export interface BuildEnv {
  /** The EAS project id. Without it the build is not linked to EAS and takes no updates. */
  easProjectId: string | undefined;
  /** Points the app at another API, such as `wrangler dev` on this Mac. */
  apiBase: string | undefined;
}

const isSet = (value: string | undefined): value is string => value !== undefined && value !== '';

/** The app's config for one variant. iPhone only, portrait; React Native runs the New Architecture only. */
export function buildConfig(
  config: ConfigContext['config'],
  appVariant: AppVariant,
  { easProjectId, apiBase }: BuildEnv,
): ExpoConfig {
  const variant = VARIANTS[appVariant];
  const api = isSet(apiBase) ? apiBase : variant.apiBase;
  return {
    ...config,
    name: variant.name,
    slug: 'yapling',
    scheme: variant.scheme,
    version: '0.1.0',
    platforms: ['ios'],
    orientation: 'portrait',
    userInterfaceStyle: 'light',
    backgroundColor: BACKGROUND,
    ...(isSet(easProjectId)
      ? {
          // A build only takes updates made from the same native code.
          runtimeVersion: { policy: 'fingerprint' },
          updates: { url: `https://u.expo.dev/${easProjectId}` },
        }
      : { updates: { enabled: false, checkAutomatically: 'NEVER' } }),
    ios: {
      bundleIdentifier: variant.bundleIdentifier,
      deploymentTarget: IOS_DEPLOYMENT_TARGET,
      // iPhone only at launch: on iPad it runs as the iPhone app, so portrait stays the only orientation.
      supportsTablet: false,
      config: { usesNonExemptEncryption: false },
      infoPlist: {
        NSMicrophoneUsageDescription: USAGE.microphone,
        NSSpeechRecognitionUsageDescription: USAGE.speechRecognition,
      },
    },
    plugins: [
      'expo-router',
      ['expo-splash-screen', { backgroundColor: BACKGROUND }],
      ['expo-font', { fonts: FONT_FILES.map((file) => `./assets/fonts/${file}`) }],
      // The call's audio graph. Background audio keeps a live call going when the screen locks; the
      // microphone string is set above, so the plugin leaves it alone.
      [
        'react-native-audio-api',
        { iosBackgroundMode: true, androidForegroundService: false, androidPermissions: [] },
      ],
    ],
    experiments: {
      typedRoutes: true,
    },
    extra: {
      ...config.extra,
      appVariant,
      ...(api === undefined ? {} : { apiBase: api }),
      ...(isSet(easProjectId) ? { eas: { projectId: easProjectId } } : {}),
    },
  };
}

// React Native's globals type `process` loosely; this file runs in Node, where each value is a string.
const env = process.env as Partial<Record<string, string>>;

export default ({ config }: ConfigContext): ExpoConfig =>
  buildConfig(config, resolveVariant(env['APP_VARIANT']), {
    easProjectId: env['EAS_PROJECT_ID'],
    apiBase: env['API_BASE'],
  });
