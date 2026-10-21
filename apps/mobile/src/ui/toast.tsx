import { colours, layout, motion, outline, radii, stickerShadows } from '@yapling/theme';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FullWindowOverlay } from 'react-native-screens';

import { CritterSlot } from './critter-slot';
import { haptics, type HapticName } from './haptics';
import { totalMs } from './motion/keyframes';
import { useKeyframes } from './motion/play';
import { Sticker } from './surface';
import { Txt } from './text';
import { typeExtras } from './type-extras';

export interface ToastSpec {
  readonly text: string;
  /** The little picture at the start (a seed packet, the roommate's face) from `@yapling/art`. */
  readonly art?: ReactNode;
  /** Played as it drops in. */
  readonly haptic?: HapticName;
}

interface Shown extends ToastSpec {
  readonly id: number;
}

const ToastContext = createContext<((toast: ToastSpec) => void) | null>(null);

/** Shows a toast under the status bar: `const toast = useToast(); toast({ text, art })`. */
export function useToast(): (toast: ToastSpec) => void {
  const show = useContext(ToastContext);
  if (show === null) throw new Error('useToast needs a ToastHost');
  return show;
}

/** The toast's card: an ink-edged white sticker with a picture and a line. */
export function ToastCard({ text, art }: ToastSpec) {
  return (
    <Sticker
      shadow={stickerShadows.sheet}
      radius={radii.bubble}
      outline={outline.regular}
      fill={colours.surface}
      style={{ maxWidth: TOAST_MAX_WIDTH }}
      contentStyle={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingVertical: 8,
        paddingLeft: 8,
        paddingRight: 16,
      }}
    >
      <View style={{ width: 34, height: 44, alignItems: 'center', justifyContent: 'center' }}>
        {art ?? <CritterSlot kind="object" size={33} />}
      </View>
      <Txt variant={typeExtras.toast} style={{ flexShrink: 1 }}>
        {text}
      </Txt>
    </Sticker>
  );
}

/** The widest a toast grows before its line wraps. */
const TOAST_MAX_WIDTH = 330;

/** One toast dropping in, holding and lifting away (all one motion token), then gone. */
function DroppingToast({ toast, onDone }: { toast: Shown; onDone: (id: number) => void }) {
  const insets = useSafeAreaInsets();
  const drop = useKeyframes(motion.screens.toast, { trigger: toast.id });
  useEffect(() => {
    const gone = setTimeout(() => onDone(toast.id), totalMs(motion.screens.toast));
    return () => clearTimeout(gone);
  }, [toast.id, onDone]);
  return (
    <Animated.View
      pointerEvents="none"
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={[
        {
          position: 'absolute',
          left: 0,
          right: 0,
          // Just under the status bar, as the design's 58 sits under its 54-point bar.
          top: Math.max(layout.topBar, insets.top + layout.topBar - 54),
          alignItems: 'center',
          zIndex: 35,
        },
        drop,
      ]}
    >
      <ToastCard text={toast.text} {...(toast.art ? { art: toast.art } : {})} />
    </Animated.View>
  );
}

/** Holds the toast layer over every screen; one toast at a time, the newest replacing the last. */
export function ToastHost({ children }: { readonly children: ReactNode }) {
  const [toast, setToast] = useState<Shown | null>(null);
  const next = useRef(0);
  const show = useCallback((spec: ToastSpec) => {
    next.current += 1;
    if (spec.haptic) haptics.play(spec.haptic);
    setToast({ ...spec, id: next.current });
  }, []);
  const done = useCallback((id: number) => {
    setToast((current) => (current?.id === id ? null : current));
  }, []);
  return (
    <ToastContext.Provider value={show}>
      {children}
      {toast ? (
        // Over everything, calls and sheets included: native modals sit above the app's own views.
        <FullWindowOverlay>
          <DroppingToast key={toast.id} toast={toast} onDone={done} />
        </FullWindowOverlay>
      ) : null}
    </ToastContext.Provider>
  );
}
