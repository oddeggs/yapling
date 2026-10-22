import { colours, outline, radii, type, type TypeStyle } from '@yapling/theme';
import { View } from 'react-native';

import { useLocale } from '../../ui/locale';
import { Press } from '../../ui/press';
import { StickerButton } from '../../ui/sticker-button';
import { Txt } from '../../ui/text';
import { OverlaySheet, quietButton } from '../payoff/overlay-sheet';
import { CritterFace } from './call-art';

/*
 * "Rời cuộc gọi?": the place and the time so far, "Khó quá?" (slower voices, or practise with Linh
 * first), "Tiếp tục gọi" and "Rời đi". It rises over the call when the learner taps the way out.
 */

const exitType = {
  title: { ...type.sheetTitle, size: 26, lineHeight: 1.2 },
  sub: { ...type.body, size: 14.5, lineHeight: 1.4 },
  rowTitle: { ...type.button, size: 17 },
  rowSub: { ...type.rowSub, size: 12.5 },
  chevron: { ...type.button, size: 20 },
} as const satisfies Record<string, TypeStyle>;

export interface ExitSheetProps {
  /** "Quán Lantern · 02:40." */
  readonly where: string;
  readonly onTooHard: () => void;
  readonly onStay: () => void;
  readonly onLeave: () => void;
}

export function ExitSheet({ where, onTooHard, onStay, onLeave }: ExitSheetProps) {
  const { t } = useLocale();
  return (
    <OverlaySheet onClose={onStay} closeLabel={t('call.exit.stay')}>
      <Txt variant={exitType.title} accessibilityRole="header">
        {t('call.exit.title')}
      </Txt>
      <Txt variant={exitType.sub} colour={colours.textBody}>
        {where}
      </Txt>
      <Press
        onPress={onTooHard}
        haptic="selection"
        accessibilityRole="button"
        accessibilityLabel={`${t('call.exit.tooHard')} ${t('call.exit.tooHardSub')}`}
        style={{
          marginTop: 2,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          paddingVertical: 12,
          paddingLeft: 10,
          paddingRight: 14,
          borderRadius: radii.bubbleSmall,
          borderWidth: outline.regular,
          borderColor: colours.outline,
          backgroundColor: colours.surface,
        }}
      >
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: radii.tile,
            borderWidth: outline.regular,
            borderColor: colours.outline,
            overflow: 'hidden',
            transform: [{ rotate: '-4deg' }],
          }}
        >
          <CritterFace character="linh" species="redpanda" size={39} fill={colours.secondarySoft} />
        </View>
        <View style={{ flex: 1 }}>
          <Txt variant={exitType.rowTitle}>{t('call.exit.tooHard')}</Txt>
          <Txt variant={exitType.rowSub} colour={colours.textMuted}>
            {t('call.exit.tooHardSub')}
          </Txt>
        </View>
        <Txt variant={exitType.chevron} colour={colours.textMuted} importantForAccessibility="no">
          ›
        </Txt>
      </Press>
      <StickerButton
        label={t('call.exit.stay')}
        onPress={onStay}
        haptic="selection"
        style={{ marginTop: 4 }}
      />
      <Press onPress={onLeave} accessibilityRole="button" style={quietButton}>
        <Txt variant="buttonGlass">{t('call.exit.leave')}</Txt>
      </Press>
    </OverlaySheet>
  );
}
