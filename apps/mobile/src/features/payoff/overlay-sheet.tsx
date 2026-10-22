import { colours, glass, motion, palette, translucent, type Glass } from '@yapling/theme';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { GlassView, Press, useKeyframes } from '../../ui';

/*
 * A sheet that rises over the screen it was opened from: the screen dims, the paper glass rises
 * from the bottom with its handle, and a tap above it, the handle or VoiceOver's escape closes it.
 * The "Khó quá" sheet and "Thử nhanh hơn?" use it.
 */

/** Paper glass at 96 % over a strong blur, as the design's choice sheets. */
const sheetGlass: Glass = {
  ...glass.panel,
  fill: 'rgba(251,250,253,0.96)',
  blur: 30,
  border: { width: 1, colour: 'rgba(255,255,255,0.95)' },
};

/** The screen under a choice sheet dims a little more than under the Me sheet. */
const DIM = 'rgba(23,19,28,0.3)';
const INSET = 8;
const RADIUS = 42;

export interface OverlaySheetProps {
  readonly onClose: () => void;
  readonly closeLabel: string;
  /** Pins the sheet's top edge (a tall sheet); otherwise it hugs its content. */
  readonly top?: number;
  readonly children: ReactNode;
}

export function OverlaySheet({ onClose, closeLabel, top, children }: OverlaySheetProps) {
  const rise = useKeyframes(motion.screens.infoSheet);
  return (
    <View
      style={[StyleSheet.absoluteFill, { zIndex: 20 }]}
      accessibilityViewIsModal
      onAccessibilityEscape={onClose}
    >
      <Press
        onPress={onClose}
        haptic={null}
        accessibilityLabel={closeLabel}
        style={[StyleSheet.absoluteFill, { backgroundColor: DIM }]}
      />
      <GlassView
        glass={sheetGlass}
        radius={RADIUS}
        style={[
          {
            position: 'absolute',
            left: INSET,
            right: INSET,
            bottom: INSET,
            paddingTop: 12,
            paddingHorizontal: 18,
            paddingBottom: 16,
            gap: 10,
          },
          top !== undefined ? { top } : null,
          rise,
        ]}
      >
        <Press
          onPress={onClose}
          haptic={null}
          accessibilityLabel={closeLabel}
          hitSlop={12}
          style={{ alignSelf: 'center' }}
        >
          <View style={{ width: 40, height: 5, borderRadius: 3, backgroundColor: palette.line }} />
        </Press>
        {children}
      </GlassView>
    </View>
  );
}

/** The quiet way out at the bottom of a sheet ("Để sau", "Quay lại"): white, a faint ink edge. */
export const quietButton = {
  height: 48,
  borderRadius: 24,
  borderWidth: 1.5,
  borderColor: translucent.inkBorder,
  backgroundColor: colours.surface,
  alignItems: 'center',
  justifyContent: 'center',
} as const;
