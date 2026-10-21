import * as Haptics from 'expo-haptics';

/**
 * The app's haptics by what they mean, so every screen feels the same:
 * - `tap`: a control lands (buttons, chips, the mic press).
 * - `selection`: a choice changes (a language chip, a toggle).
 * - `success`: something was earned (a fix, a ring filling, a keepsake hung).
 * - `yourTurn`: the character has finished and the mic is the learner's: a firm beat, then a soft one.
 * - `sparkle`: three light ticks, as the sparkles burst around "You fixed it".
 */
export type HapticName = 'tap' | 'selection' | 'success' | 'yourTurn' | 'sparkle';

/** One beat of a pattern: when it plays (ms from the start) and how. */
export type Beat =
  | { readonly at: number; readonly kind: 'impact'; readonly style: Haptics.ImpactFeedbackStyle }
  | {
      readonly at: number;
      readonly kind: 'notify';
      readonly type: Haptics.NotificationFeedbackType;
    }
  | { readonly at: number; readonly kind: 'selection' };

const { Light, Medium, Rigid, Soft } = Haptics.ImpactFeedbackStyle;

export const hapticPatterns: Readonly<Record<HapticName, readonly Beat[]>> = {
  tap: [{ at: 0, kind: 'impact', style: Light }],
  selection: [{ at: 0, kind: 'selection' }],
  success: [{ at: 0, kind: 'notify', type: Haptics.NotificationFeedbackType.Success }],
  yourTurn: [
    { at: 0, kind: 'impact', style: Rigid },
    { at: 120, kind: 'impact', style: Soft },
  ],
  sparkle: [
    { at: 0, kind: 'impact', style: Light },
    { at: 60, kind: 'impact', style: Light },
    { at: 120, kind: 'impact', style: Medium },
  ],
};

let enabled = true;

const playBeat = (beat: Beat): Promise<void> => {
  switch (beat.kind) {
    case 'impact':
      return Haptics.impactAsync(beat.style);
    case 'notify':
      return Haptics.notificationAsync(beat.type);
    case 'selection':
      return Haptics.selectionAsync();
  }
};

/**
 * Plays haptic patterns: `haptics.play('yourTurn')`. Never throws: the simulator or a phone
 * without a motor stays silent. Reduce Motion leaves haptics on; the learner's setting may not.
 */
export const haptics = {
  play(name: HapticName): void {
    if (!enabled) return;
    for (const beat of hapticPatterns[name]) {
      const fire = () => void playBeat(beat).catch(() => undefined);
      if (beat.at === 0) fire();
      else setTimeout(fire, beat.at);
    }
  },
  setEnabled(on: boolean): void {
    enabled = on;
  },
  isEnabled(): boolean {
    return enabled;
  },
};
