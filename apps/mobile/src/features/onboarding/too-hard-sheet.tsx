import type { PipSpecies } from '@yapling/art';
import { Canvas, Path, Skia } from '@shopify/react-native-skia';
import { colours, outline, stickerShadows, type } from '@yapling/theme';
import type { ReactNode } from 'react';
import { View } from 'react-native';

import { Press, Sticker, Txt, useLocale } from '../../ui';
import { Face } from '../burrow';
import { useTopShift } from './art';
import { ModalSheet, QuietButton } from './sheets';

/*
 * "Khó quá" from the residency card: no shame, two ways on. "Nói chậm hơn" keeps the learner where
 * they are with slower voices; "Tập với Linh trước" makes them a Visitor and opens Settling in
 * first. Linh's note says the café will wait.
 */

const SHEET_TOP = 206;

/** The slow-gauge glyph, as the design draws it in a 24-point box. */
const GAUGE = [
  Skia.Path.MakeFromSVGString('M3.5 17a8.5 8.5 0 0 1 17 0'),
  Skia.Path.MakeFromSVGString('M12 17L7.5 11.5'),
];

export interface TooHardSheetProps {
  readonly species: PipSpecies;
  readonly busy: boolean;
  readonly onSlower: () => void;
  readonly onLinh: () => void;
  readonly onClose: () => void;
}

export function TooHardSheet({ busy, onSlower, onLinh, onClose }: TooHardSheetProps) {
  const { t } = useLocale();
  const shift = useTopShift();
  return (
    <ModalSheet
      onClose={onClose}
      closeLabel={t('common.a11y.close')}
      scrim={0.3}
      top={SHEET_TOP + shift}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Sticker
          shadow={{ x: 2, y: 4, colour: colours.outline }}
          radius={18}
          outline={outline.bold}
          fill={colours.secondarySoft}
          style={{ transform: [{ rotate: '-5deg' }] }}
          contentStyle={{ width: 58, height: 58, overflow: 'hidden' }}
        >
          <Face character="linh" mood="warm" size={58} background={colours.secondarySoft} />
        </Sticker>
        <View style={{ flex: 1 }}>
          <Txt variant={{ ...type.sheetTitle, lineHeight: 1.15 }} accessibilityRole="header">
            {t('onboarding.tooHard.title')}
          </Txt>
          <Txt variant={{ ...type.body, size: 13.5 }} colour={colours.textMuted}>
            {t('onboarding.tooHard.sub')}
          </Txt>
        </View>
      </View>
      <Option
        icon={
          <View
            style={{
              width: 46,
              height: 46,
              borderRadius: 23,
              backgroundColor: colours.secondarySoft,
              borderWidth: outline.regular,
              borderColor: colours.outline,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Canvas style={{ width: 24, height: 24 }}>
              {GAUGE.map((p, i) =>
                p ? (
                  <Path
                    key={i}
                    path={p}
                    color={colours.outline}
                    style="stroke"
                    strokeWidth={2.6}
                    strokeCap="round"
                  />
                ) : null,
              )}
            </Canvas>
          </View>
        }
        title={t('onboarding.tooHard.slower')}
        sub={t('onboarding.tooHard.slowerSub')}
        disabled={busy}
        onPress={onSlower}
        style={{ marginTop: 4 }}
      />
      <Option
        icon={
          <View
            style={{
              width: 46,
              height: 46,
              borderRadius: 23,
              overflow: 'hidden',
              borderWidth: outline.regular,
              borderColor: colours.outline,
            }}
          >
            <Face character="linh" size={46} background={colours.successSoft} />
          </View>
        }
        title={t('onboarding.tooHard.linh')}
        sub={t('onboarding.tooHard.linhSub')}
        disabled={busy}
        onPress={onLinh}
      />
      <Sticker
        shadow={{ x: 0, y: 5, colour: colours.outline }}
        radius={6}
        outline={outline.regular}
        fill={colours.surfacePaper}
        style={{ marginTop: 6, transform: [{ rotate: '-1.5deg' }] }}
        contentStyle={{ paddingVertical: 14, paddingHorizontal: 16 }}
      >
        <Txt variant={{ ...type.postcard, lineHeight: 1.25 }}>{t('onboarding.tooHard.note')}</Txt>
      </Sticker>
      <QuietButton
        label={t('onboarding.tooHard.back')}
        onPress={onClose}
        style={{ marginTop: 'auto' }}
      />
    </ModalSheet>
  );
}

function Option({
  icon,
  title,
  sub,
  disabled,
  onPress,
  style,
}: {
  icon: ReactNode;
  title: string;
  sub: string;
  disabled: boolean;
  onPress: () => void;
  style?: { marginTop: number };
}) {
  return (
    <Press
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${sub}`}
      style={style}
    >
      <Sticker
        shadow={stickerShadows.button}
        radius={22}
        outline={outline.regular}
        fill={colours.surface}
        contentStyle={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          minHeight: 84,
          paddingVertical: 12,
          paddingLeft: 12,
          paddingRight: 14,
        }}
      >
        {icon}
        <View style={{ flex: 1, gap: 2 }}>
          <Txt variant={{ ...type.episodeTitle, tracking: -0.02 }}>{title}</Txt>
          <Txt variant={{ ...type.body, size: 13, lineHeight: 1.3 }} colour={colours.textBody}>
            {sub}
          </Txt>
        </View>
      </Sticker>
    </Press>
  );
}
