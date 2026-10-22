import type { PipSpecies } from '@yapling/art';
import { colours, outline, type, type TypeStyle } from '@yapling/theme';
import { Text, View } from 'react-native';

import { Press, StickerButton, Txt, useLocale } from '../../ui';
import { Face } from '../burrow/art';
import { OverlaySheet, quietButton } from '../payoff/overlay-sheet';

/*
 * "Thử nhanh hơn?": what moving up changes (the usual pace, the read-aloud cards gone, "Chậm thôi"
 * any time), how to come back, and "Thử luôn" / "Để sau".
 */

const fasterType = {
  title: { ...type.sheetTitle, size: 26, lineHeight: 1.15 },
  body: { ...type.body, size: 14.5, lineHeight: 1.45 },
  back: { ...type.noteStrong, lineHeight: 1.4 },
} as const satisfies Record<string, TypeStyle>;

export interface FasterSheetProps {
  readonly roommateSpecies: PipSpecies;
  readonly onConfirm: () => void;
  readonly onClose: () => void;
}

export function FasterSheet({ roommateSpecies, onConfirm, onClose }: FasterSheetProps) {
  const { t } = useLocale();
  const slower = t('me.faster.slowerPill');
  // The body names the "Chậm thôi" pill in bold, where the sentence puts it.
  const [before, after = ''] = t('me.faster.body', { slower: '\u0000' }).split('\u0000');
  return (
    <OverlaySheet onClose={onClose} closeLabel={t('common.a11y.close')}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View
          style={{
            width: 54,
            height: 54,
            borderRadius: 27,
            borderWidth: outline.regular,
            borderColor: colours.outline,
            overflow: 'hidden',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Face
            character="pip"
            species={roommateSpecies}
            mood="excited"
            size={50}
            background={colours.accentSoft}
          />
        </View>
        <Txt variant={fasterType.title} accessibilityRole="header" style={{ flex: 1 }}>
          {t('me.faster.title')}
        </Txt>
      </View>
      <Txt variant={fasterType.body} colour={colours.textBody}>
        {before}
        <Text style={{ fontWeight: '800', color: colours.text }}>{slower}</Text>
        {after}
      </Txt>
      <Txt variant={fasterType.back} colour={colours.textMuted}>
        {t('me.faster.back')}
      </Txt>
      <StickerButton
        label={t('me.faster.confirm')}
        onPress={onConfirm}
        haptic="success"
        style={{ marginTop: 4 }}
      />
      <Press onPress={onClose} accessibilityRole="button" style={quietButton}>
        <Txt variant="buttonGlass">{t('me.faster.later')}</Txt>
      </Press>
    </OverlaySheet>
  );
}
