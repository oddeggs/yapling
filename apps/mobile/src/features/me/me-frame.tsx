import { colours, glass, layout, motion, palette, type Glass } from '@yapling/theme';
import type { ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GlassView, Press, useKeyframes } from '../../ui';

/** The Me sheet's glass: paper at 86 % over a stronger blur than an info sheet's. */
const meGlass: Glass = { ...glass.panel, fill: 'rgba(251,250,253,0.86)', blur: 30 };

/** The scene beneath dims a little while the sheet is up. */
const DIM = 'rgba(23,19,28,0.12)';
const RADIUS = 40;

export interface MeFrameProps {
  readonly onClose: () => void;
  readonly closeLabel: string;
  /** Kept still at the bottom, under the scrolling content (a confirm's buttons). */
  readonly footer?: ReactNode;
  readonly children: ReactNode;
}

/**
 * The Me sheet's frame: a tall glass sheet rising from the bottom edge over the dimmed burrow,
 * with its handle. Tapping above it, the handle, or VoiceOver's escape closes it.
 */
export function MeFrame({ onClose, closeLabel, footer, children }: MeFrameProps) {
  const insets = useSafeAreaInsets();
  const rise = useKeyframes(motion.screens.infoSheet);
  return (
    <View
      style={{ flex: 1, backgroundColor: DIM }}
      accessibilityViewIsModal
      onAccessibilityEscape={onClose}
    >
      <Press
        onPress={onClose}
        haptic={null}
        accessibilityLabel={closeLabel}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: layout.topBar }}
      />
      <GlassView
        glass={meGlass}
        radius={RADIUS}
        style={[
          {
            position: 'absolute',
            left: 6,
            right: 6,
            top: layout.topBar,
            // The bottom corners sit past the screen's edge: the sheet runs off the bottom.
            bottom: -RADIUS,
            paddingBottom: RADIUS,
          },
          rise,
        ]}
      >
        <Press
          onPress={onClose}
          haptic={null}
          accessibilityLabel={closeLabel}
          hitSlop={12}
          style={{ alignSelf: 'center', paddingTop: 10, paddingBottom: 12, paddingHorizontal: 20 }}
        >
          <View style={{ width: 40, height: 5, borderRadius: 3, backgroundColor: palette.line }} />
        </Press>
        <ScrollView
          style={{ flex: 1 }}
          automaticallyAdjustKeyboardInsets
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingBottom: footer ? 16 : insets.bottom + 24,
            gap: 12,
          }}
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
        {footer ? (
          <View style={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 8, gap: 8 }}>
            {footer}
          </View>
        ) : null}
      </GlassView>
    </View>
  );
}

/** A white card with a hairline edge, holding rows (the can-do groups, the settings rows). */
export function RowsCard({ children }: { children: ReactNode }) {
  return (
    <View
      style={{
        borderRadius: 18,
        backgroundColor: colours.surface,
        borderWidth: 2,
        borderColor: colours.border,
        overflow: 'hidden',
      }}
    >
      {children}
    </View>
  );
}
