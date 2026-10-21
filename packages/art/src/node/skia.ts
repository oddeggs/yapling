import { createRequire } from 'node:module';

import type { SkiaApi } from '../skia/api';

/** React Native Skia's web build: the same `Skia` API as the phone, running on CanvasKit. */
export const SKIA_WEB_PATH = './lib/commonjs/skia/web';
/** React Native Skia's enums (checked against this package's copies in the tests). */
export const SKIA_TYPES_PATH = './lib/commonjs/skia/types';

const own = createRequire(import.meta.url);

/** Requires one of React Native Skia's files, naming the path if a Skia upgrade moved it. */
export function requireFromSkia<T>(path: string): T {
  try {
    return createRequire(own.resolve('@shopify/react-native-skia/package.json'))(path) as T;
  } catch (e) {
    throw new Error(
      `@yapling/art: could not load ${path} from @shopify/react-native-skia; its web build ` +
        'has moved. Update SKIA_WEB_PATH and SKIA_TYPES_PATH in packages/art/src/node/skia.ts.',
      { cause: e },
    );
  }
}

let loading: Promise<SkiaApi> | null = null;

/** The `Skia` API over `canvaskit-wasm` (the CanvasKit build React Native Skia pins). */
export function loadNodeSkia(): Promise<SkiaApi> {
  loading ??= (async () => {
    const init = own('canvaskit-wasm') as () => Promise<unknown>;
    const canvasKit = await init();
    const web = requireFromSkia<{ JsiSkApi?: (ck: unknown) => SkiaApi }>(SKIA_WEB_PATH);
    if (typeof web.JsiSkApi !== 'function') {
      throw new Error(`@yapling/art: ${SKIA_WEB_PATH} no longer exports JsiSkApi`);
    }
    return web.JsiSkApi(canvasKit);
  })();
  return loading;
}
