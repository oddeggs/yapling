import { colours } from '@yapling/theme';
import { router } from 'expo-router';
import { createContext, useContext, type ReactNode } from 'react';
import { View } from 'react-native';
import { GestureDetector, useLongPressGesture, useTapGesture } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import { useRelay } from '../../ui/motion/relay';
import { Txt } from '../../ui/text';
import { useKnockInputs } from '../knocks/knocks-provider';
import { now, useDebugClock } from './debug-clock';
import { devToolsEnabled } from './dev-tools';
import { openMenuOnce } from './menu-once';
import { dayOf, testLearnerOf } from './test-learner';

/** Clears the learner's local data (the data layer's reset); the test menu clears its own. */
export type ResetLocalData = () => Promise<void>;

const ResetContext = createContext<ResetLocalData | null>(null);

/** The data layer's reset, for the test menu's reset button. */
export const useResetLocalData = (): ResetLocalData | null => useContext(ResetContext);

export const DEV_MENU_PATH = '/devmenu';

/** Opens the test menu, unless it is open already. */
const openMenu = () => openMenuOnce(() => router.push(DEV_MENU_PATH));

/**
 * Wraps the app in the test builds: a three-finger tap anywhere opens the test menu, as does a
 * long press on the build label in the bottom corner. In the store app it is only its children.
 */
export function DevMenuHost({
  onReset,
  children,
}: {
  /** Clears the learner's local data; the data layer provides it. */
  readonly onReset?: ResetLocalData;
  readonly children: ReactNode;
}) {
  if (!devToolsEnabled) return children;
  return (
    <ResetContext.Provider value={onReset ?? null}>
      <ThreeFingerTap>{children}</ThreeFingerTap>
      <BuildLabel />
    </ResetContext.Provider>
  );
}

function ThreeFingerTap({ children }: { readonly children: ReactNode }) {
  const open = useRelay(openMenu);
  const tap = useTapGesture({
    minPointers: 3,
    onActivate: () => {
      'worklet';
      scheduleOnRN(open);
    },
  });
  return (
    <GestureDetector gesture={tap}>
      <View style={{ flex: 1 }} collapsable={false}>
        {children}
      </View>
    </GestureDetector>
  );
}

/** "dev · day 3", small in the bottom corner; the debug clock's day when it has moved. */
function BuildLabel() {
  const insets = useSafeAreaInsets();
  const clock = useDebugClock();
  const day = dayOf(testLearnerOf(useKnockInputs(), Date.now()), now());
  const open = useRelay(openMenu);
  const press = useLongPressGesture({
    minDuration: 600,
    onActivate: () => {
      'worklet';
      scheduleOnRN(open);
    },
  });
  const moved = clock.offsetMs !== 0 || clock.cameBackAfterAway;
  return (
    <View
      pointerEvents="box-none"
      style={{ position: 'absolute', left: 0, bottom: Math.max(insets.bottom - 18, 2) }}
    >
      <GestureDetector gesture={press}>
        <View
          accessibilityLabel="Test menu"
          accessibilityHint="Long press to open"
          style={{ paddingHorizontal: 10, paddingVertical: 4 }}
        >
          <Txt variant="note" colour={moved ? colours.accent : colours.textMuted}>
            {`dev · day ${day}${clock.cameBackAfterAway ? ' · away' : ''}`}
          </Txt>
        </View>
      </GestureDetector>
    </View>
  );
}
