import type { TurnMode } from '@yapling/contracts';
import { controls, pill, translucent } from '@yapling/theme';
import { useCallback, useEffect, type ReactNode } from 'react';
import { AccessibilityInfo } from 'react-native';
import { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';

import { useTurnMode } from '../../data';
import type { CallBarProps } from '../../ui/call-bar';
import { useLocale } from '../../ui/locale';
import type { MicState } from '../../ui/mic-button';
import { Press } from '../../ui/press';
import { FRAME_TEXT_MAX_SCALE, Txt } from '../../ui/text';
import { Toggle } from '../../ui/toggle';
import { useToast } from '../../ui/toast';
import type { CallState } from '../../voice/call-state';
import type { VoiceEngine } from '../../voice/engine';
import { MIN_HOLD_MS } from '../../voice/turns';

/*
 * Holding the mic or hands-free, in a call: the "Rảnh tay" switch over the call bar (a frost pill
 * with the app's toggle, apart from the mic so a press meant for it can't flip it), and what the
 * call bar does in each mode. The choice is the learner's preference: it carries to the next call.
 */

/** "Rảnh tay": the switch, off while the learner is mid-answer. */
export function TurnModeSwitch({
  engine,
  state,
  art,
}: {
  engine: VoiceEngine | null;
  state: CallState;
  /** The roommate's face, on the toast that says what changed. */
  art: ReactNode;
}) {
  const { t } = useLocale();
  const toast = useToast();
  const { setTurnMode } = useTurnMode();
  const on = state.turnMode === 'hands_free';
  const busy = state.talkHeld || state.learnerSpeaking || state.turnOpen;
  const held = useSharedValue(0);
  const squeeze = useAnimatedStyle(() => ({ transform: [{ scale: 1 - 0.04 * held.get() }] }));
  const flip = useCallback(() => {
    if (!engine) return;
    const next: TurnMode = on ? 'hold_to_talk' : 'hands_free';
    engine.setTurnMode(next);
    void setTurnMode(next).catch(() => undefined);
    toast({ text: t(next === 'hands_free' ? 'call.handsFree.on' : 'call.handsFree.off'), art });
  }, [engine, on, setTurnMode, t, toast, art]);
  return (
    <Press
      onPress={flip}
      haptic="selection"
      disabled={busy || !engine}
      held={held}
      accessibilityRole="switch"
      accessibilityState={{ checked: on, disabled: busy }}
      accessibilityLabel={t('call.a11y.handsFree')}
      hitSlop={(controls.minHitTarget - controls.choice.height) / 2}
      style={[
        {
          alignSelf: 'flex-start',
          height: controls.choice.height,
          paddingLeft: 13,
          paddingRight: 5,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          borderRadius: pill(controls.choice.height),
          borderWidth: 1.5,
          borderColor: translucent.inkBorderSoft,
          backgroundColor: translucent.frostStrong,
          opacity: busy ? 0.6 : 1,
        },
        squeeze,
      ]}
    >
      <Txt maxFontSizeMultiplier={FRAME_TEXT_MAX_SCALE} variant="chip">
        {t('call.handsFree')}
      </Txt>
      <Toggle on={on} />
    </Press>
  );
}

/**
 * The call bar's mic for the turn mode: held for two seconds to talk, or (hands-free) tapped to say
 * "I'm done", with the voice level on its bars and its own words under it. A hands-free turn with
 * no words is said there quietly (and read out under VoiceOver), not as a tip.
 */
export function useMicBar(
  engine: VoiceEngine | null,
  state: CallState,
  view: { readonly mic: MicState; readonly notHeardQuietly: boolean },
): Partial<CallBarProps> {
  const { t } = useLocale();
  const notHeard = view.notHeardQuietly ? t('call.mic.handsFreeNotHeard') : null;
  useEffect(() => {
    if (notHeard === null) return;
    void AccessibilityInfo.isScreenReaderEnabled().then((on) => {
      if (on) AccessibilityInfo.announceForAccessibility(notHeard);
    });
  }, [notHeard]);
  if (state.turnMode === 'hold_to_talk') {
    return {
      onTalkStart: () => engine?.pressTalk(),
      onTalkEnd: () => engine?.releaseTalk(),
      holdMs: MIN_HOLD_MS,
    };
  }
  const caption =
    notHeard ??
    (view.mic === 'listening'
      ? t('call.mic.handsFreeTalking')
      : view.mic === 'yourTurn'
        ? t('call.mic.handsFree')
        : null);
  return {
    onTap: () => void engine?.endTurnNow(),
    micLabel: t('call.a11y.micHandsFree'),
    ...(engine ? { level: engine.level.value } : {}),
    ...(caption !== null ? { caption } : {}),
  };
}
