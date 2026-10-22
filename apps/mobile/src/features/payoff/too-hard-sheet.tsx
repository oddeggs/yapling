import type { Stage } from '@yapling/contracts';
import type { ReactNode } from 'react';
import { colours, outline, radii, stickerShadows, type, type TypeStyle } from '@yapling/theme';
import { View } from 'react-native';
import { Canvas, Group, Path } from '@shopify/react-native-skia';

import { Press, Sticker, Txt, useLocale } from '../../ui';
import { Face } from '../burrow/art';
import { OverlaySheet, quietButton } from './overlay-sheet';

/*
 * "Khó quá": two kind ways out and no shame. "Nói chậm hơn" keeps the learner where they are with
 * slower voices; "Tập với Linh trước" practises with Linh first (a Newcomer becomes a Visitor, a
 * Visitor plays a Settling-in chapter again). Opened from the after-call card and the Me sheet.
 */

export type TooHardChoice = 'slower' | 'practise';

const sheetType = {
  title: { ...type.sheetTitle, size: 28, lineHeight: 1.15 },
  sub: { ...type.body, size: 13.5, lineHeight: null },
  optionTitle: { ...type.episodeTitle, tracking: -0.02, lineHeight: null },
  optionSub: { ...type.rowSub, size: 13, lineHeight: 1.3 },
  note: { ...type.handWelcome, lineHeight: 1.25 },
} as const satisfies Record<string, TypeStyle>;

/** The dial's needle leaning back (slower) or forward (faster), in the design's 24-point box. */
const NEEDLE = { slow: 'M12 17L7.5 11.5', fast: 'M12 17L16.5 11.5' } as const;

/** A speed dial: a half circle and its needle, drawn once at `size`. */
export function Dial({
  size,
  speed,
  colour = colours.outline,
}: {
  size: number;
  speed: keyof typeof NEEDLE;
  colour?: string;
}) {
  return (
    <Canvas style={{ width: size, height: size }} pointerEvents="none">
      <Group transform={[{ scale: size / 24 }]}>
        {['M3.5 17a8.5 8.5 0 0 1 17 0', NEEDLE[speed]].map((d) => (
          <Path
            key={d}
            path={d}
            style="stroke"
            strokeWidth={2.6}
            strokeCap="round"
            color={colour}
          />
        ))}
      </Group>
    </Canvas>
  );
}

function Option({
  icon,
  title,
  sub,
  onPress,
}: {
  icon: ReactNode;
  title: string;
  sub: string;
  onPress: () => void;
}) {
  return (
    <Press onPress={onPress} accessibilityRole="button" accessibilityLabel={`${title}. ${sub}`}>
      <Sticker
        shadow={stickerShadows.button}
        radius={radii.bubble}
        outline={outline.regular}
        fill={colours.surface}
        contentStyle={{
          minHeight: 84,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          paddingVertical: 12,
          paddingLeft: 12,
          paddingRight: 14,
        }}
      >
        {icon}
        <View style={{ flex: 1, gap: 2 }}>
          <Txt variant={sheetType.optionTitle}>{title}</Txt>
          <Txt variant={sheetType.optionSub} colour={colours.textBody}>
            {sub}
          </Txt>
        </View>
      </Sticker>
    </Press>
  );
}

/** Lines a sheet opened in a call says instead (it stays in the call; the scene keeps its place). */
export interface TooHardCopy {
  readonly slowerSub: string;
  readonly practiseSub: string;
  readonly back: string;
}

export interface TooHardSheetProps {
  readonly stage: Stage;
  readonly onChoose: (choice: TooHardChoice) => void;
  readonly onClose: () => void;
  readonly copy?: TooHardCopy;
}

export function TooHardSheet({ stage, onChoose, onClose, copy }: TooHardSheetProps) {
  const { t } = useLocale();
  const circle = {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: outline.regular,
    borderColor: colours.outline,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  } as const;
  return (
    <OverlaySheet onClose={onClose} closeLabel={t('common.a11y.close')}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Sticker
          shadow={{ x: 2, y: 4, colour: colours.outline }}
          radius={radii.row}
          outline={outline.bold}
          fill={colours.secondarySoft}
          style={{ transform: [{ rotate: '-5deg' }] }}
          contentStyle={{ width: 52, height: 52, overflow: 'hidden' }}
        >
          <Face character="linh" mood="warm" size={52} background={colours.secondarySoft} />
        </Sticker>
        <View style={{ flex: 1 }}>
          <Txt variant={sheetType.title} accessibilityRole="header">
            {t('payoff.tooHard.title')}
          </Txt>
          <Txt variant={sheetType.sub} colour={colours.textMuted}>
            {t('payoff.tooHard.sub')}
          </Txt>
        </View>
      </View>
      <View style={{ gap: 10, marginTop: 4 }}>
        <Option
          icon={
            <View style={[circle, { backgroundColor: colours.secondarySoft }]}>
              <Dial size={24} speed="slow" />
            </View>
          }
          title={t('payoff.tooHard.slower')}
          sub={copy?.slowerSub ?? t('payoff.tooHard.slowerSub')}
          onPress={() => onChoose('slower')}
        />
        <Option
          icon={
            <View style={circle}>
              <Face character="linh" size={42} background={colours.successSoft} />
            </View>
          }
          title={t('payoff.tooHard.linh')}
          sub={
            copy?.practiseSub ??
            t(
              stage === 'visitor'
                ? 'payoff.tooHard.linhSubVisitor'
                : 'payoff.tooHard.linhSubNewcomer',
            )
          }
          onPress={() => onChoose('practise')}
        />
      </View>
      <Sticker
        shadow={stickerShadows.sheet}
        radius={radii.aiTag}
        outline={outline.regular}
        fill={colours.surfacePaper}
        style={{ marginTop: 6, transform: [{ rotate: '-1.5deg' }] }}
        contentStyle={{ paddingVertical: 14, paddingHorizontal: 16 }}
      >
        <Txt variant={sheetType.note}>{t('payoff.tooHard.note')}</Txt>
      </Sticker>
      <Press onPress={onClose} accessibilityRole="button" style={[quietButton, { marginTop: 4 }]}>
        <Txt variant="buttonGlass">{copy?.back ?? t('payoff.tooHard.back')}</Txt>
      </Press>
    </OverlaySheet>
  );
}
