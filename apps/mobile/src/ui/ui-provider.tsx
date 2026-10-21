import type { Language } from '@yapling/i18n';
import type { ReactNode } from 'react';

import { LocaleProvider } from './locale';
import { ReduceMotionProvider } from './motion/reduce-motion';
import { ToastHost } from './toast';

/**
 * Everything a screen of the kit needs above it: the chrome's language (Vietnamese until the
 * profile says otherwise), Reduce Motion, and the toast layer.
 */
export function UiProvider({
  language,
  reduceMotion,
  children,
}: {
  /** The profile's first language, once there is a profile. */
  readonly language?: Language | undefined;
  /** Fixes Reduce Motion for a subtree (the kit's switch); the system setting otherwise. */
  readonly reduceMotion?: boolean | undefined;
  readonly children: ReactNode;
}) {
  return (
    <ReduceMotionProvider forced={reduceMotion}>
      <LocaleProvider language={language}>
        <ToastHost>{children}</ToastHost>
      </LocaleProvider>
    </ReduceMotionProvider>
  );
}
