import {
  colours,
  controls,
  glass,
  palette,
  pill,
  radii,
  stickerShadows,
  translucent,
} from '@yapling/theme';
import { View } from 'react-native';

import { useLocale } from './locale';
import { MicButton, type MicState } from './mic-button';
import { Press } from './press';
import { GlassView, Sticker } from './surface';
import { FRAME_TEXT_MAX_SCALE, Txt } from './text';
import { typeExtras } from './type-extras';
import type { ViewStyleObject, ViewStyleProp } from './style';

export interface CallBarProps {
  readonly mic: MicState;
  /** Who is talking, for "PIP ĐANG NÓI" while the mic is `speaking`. */
  readonly speaker?: string;
  /** The scene is over: the exit becomes the primary button and the caption says so. */
  readonly sceneDone?: boolean;
  /** The exit's words ("Kết thúc cuộc gọi", "Xuống xe"). */
  readonly exitLabel: string;
  /** "Chờ chút" pressed: turn detection waits until "Tiếp tục". */
  readonly onHoldToggle?: () => void;
  readonly onExit?: () => void;
  readonly onTalkStart?: () => void;
  readonly onTalkEnd?: () => void;
  /** Hold-to-talk: the shortest hold that is a turn, shown as a ring filling around the mic. */
  readonly holdMs?: number;
  readonly style?: ViewStyleProp;
}

const SIDE = controls.callButton;
const BAR_H = controls.callBar.height;

/**
 * The bottom of every call: "Chờ chút" (give me a second), the mic with the turn's state under
 * it, and the way out. One layout serves every call.
 */
export function CallBar({
  mic,
  speaker,
  sceneDone = false,
  exitLabel,
  onHoldToggle,
  onExit,
  onTalkStart,
  onTalkEnd,
  holdMs,
  style,
}: CallBarProps) {
  const { t } = useLocale();
  const paused = mic === 'paused';
  const caption = paused
    ? t('call.mic.paused')
    : mic === 'listening'
      ? t('call.mic.listening')
      : mic === 'yourTurn'
        ? t('call.mic.yourTurn')
        : mic === 'speaking' && speaker
          ? t('call.mic.talking', { who: speaker })
          : sceneDone
            ? t('call.mic.sceneComplete')
            : '';
  return (
    <GlassView
      glass={glass.panel}
      radius={pill(BAR_H)}
      style={[
        {
          height: BAR_H,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 12,
        },
        style,
      ]}
    >
      <Press
        onPress={onHoldToggle}
        haptic="selection"
        accessibilityState={{ selected: paused }}
        style={{
          ...SIDE,
          borderRadius: pill(SIDE.height),
          borderWidth: 1,
          borderColor: translucent.glassEdge,
          backgroundColor: paused ? palette.ink : translucent.frost,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Txt
          maxFontSizeMultiplier={FRAME_TEXT_MAX_SCALE}
          variant="buttonSmall"
          colour={paused ? colours.textOnInk : colours.text}
        >
          {paused ? t('call.ready') : t('call.holdOn')}
        </Txt>
      </Press>
      <View style={{ alignItems: 'center', gap: 5 }}>
        <MicButton
          state={mic}
          accessibilityLabel={t('call.a11y.mic')}
          {...(onTalkStart ? { onTalkStart } : {})}
          {...(onTalkEnd ? { onTalkEnd } : {})}
          {...(holdMs ? { holdMs } : {})}
        />
        <Txt
          maxFontSizeMultiplier={FRAME_TEXT_MAX_SCALE}
          variant="micLabel"
          numberOfLines={1}
          accessibilityLiveRegion="polite"
          // The caption may run wider than the mic; it centres under it over the side buttons.
          style={{
            position: 'absolute',
            top: controls.mic.size + 5,
            width: 260,
            textAlign: 'center',
          }}
        >
          {caption}
        </Txt>
        {/* Holds the caption's line in the column so the mic sits where the design puts it. */}
        <Txt
          maxFontSizeMultiplier={FRAME_TEXT_MAX_SCALE}
          variant="micLabel"
          style={{ opacity: 0 }}
          importantForAccessibility="no"
        >
          {' '}
        </Txt>
      </View>
      <ExitButton label={exitLabel} primary={sceneDone} {...(onExit ? { onPress: onExit } : {})} />
    </GlassView>
  );
}

/** The call bar's way out: glass while the scene runs, the primary sticker once it's done. */
function ExitButton({
  label,
  primary,
  onPress,
}: {
  label: string;
  primary: boolean;
  onPress?: () => void;
}) {
  const text = (
    <Txt
      maxFontSizeMultiplier={FRAME_TEXT_MAX_SCALE}
      variant={typeExtras.callExit}
      align="center"
      numberOfLines={2}
    >
      {label}
    </Txt>
  );
  const box: ViewStyleObject = {
    ...SIDE,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
  };
  return (
    <Press onPress={onPress} haptic={primary ? 'success' : 'tap'} accessibilityLabel={label}>
      {primary ? (
        <Sticker
          shadow={stickerShadows.button}
          radius={pill(SIDE.height)}
          outline={controls.button.outline}
          fill={colours.accent}
          contentStyle={box}
        >
          {text}
        </Sticker>
      ) : (
        <View
          style={{
            ...box,
            borderRadius: pill(SIDE.height),
            borderWidth: 1,
            borderColor: translucent.glassEdge,
            backgroundColor: translucent.frost,
          }}
        >
          {text}
        </View>
      )}
    </Press>
  );
}

export interface ListenBarProps {
  readonly paused: boolean;
  readonly doneLabel: string;
  /** The story has finished: "Cảm ơn Pip" becomes the primary button. */
  readonly done: boolean;
  readonly onHoldToggle?: () => void;
  readonly onDone?: () => void;
}

/** The bar under a voice story: "Chờ chút" and the thank-you, no mic (nothing to fail). */
export function ListenBar({ paused, doneLabel, done, onHoldToggle, onDone }: ListenBarProps) {
  const { t } = useLocale();
  const h = controls.buttonListen.height;
  const glassButton: ViewStyleObject = {
    height: h,
    borderRadius: pill(h),
    borderWidth: 1,
    borderColor: translucent.glassEdge,
    alignItems: 'center',
    justifyContent: 'center',
  };
  return (
    <GlassView
      glass={glass.panel}
      radius={radii.sheetBar}
      style={{ flexDirection: 'row', gap: 10, padding: 12 }}
    >
      <Press
        onPress={onHoldToggle}
        haptic="selection"
        style={[
          { flex: 1 },
          glassButton,
          { backgroundColor: paused ? palette.ink : translucent.frost },
        ]}
      >
        <Txt
          maxFontSizeMultiplier={FRAME_TEXT_MAX_SCALE}
          variant="buttonGlass"
          colour={paused ? colours.textOnInk : colours.text}
        >
          {paused ? t('call.ready') : t('call.holdOn')}
        </Txt>
      </Press>
      <Press onPress={onDone} haptic={done ? 'success' : 'tap'} style={{ flex: 1.4 }}>
        {done ? (
          <Sticker
            shadow={stickerShadows.button}
            radius={pill(h)}
            outline={controls.button.outline}
            fill={colours.accent}
            contentStyle={{ height: h, alignItems: 'center', justifyContent: 'center' }}
          >
            <Txt maxFontSizeMultiplier={FRAME_TEXT_MAX_SCALE} variant="buttonGlass">
              {doneLabel}
            </Txt>
          </Sticker>
        ) : (
          <View style={[glassButton, { backgroundColor: translucent.frost }]}>
            <Txt maxFontSizeMultiplier={FRAME_TEXT_MAX_SCALE} variant="buttonGlass">
              {doneLabel}
            </Txt>
          </View>
        )}
      </Press>
    </GlassView>
  );
}
