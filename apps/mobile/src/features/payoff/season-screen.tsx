import type { PipSpecies } from '@yapling/art';
import { colours, layout, motion, outline, type } from '@yapling/theme';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import {
  BackButton,
  GlassSheet,
  KeepsakeFrame,
  StickerButton,
  Tag,
  Txt,
  useKeyframes,
  useLocale,
} from '../../ui';
import { BurrowBackdrop, useStage } from '../burrow';
import { Face } from '../burrow/art';
import { NoteBubble } from './keepsake-screen';
import type { SeasonKeepsake } from './wrap-model';

/*
 * The season keepsake: the roommate has drawn the café's little sign, Mei has signed it, and it is
 * stamped "Season One" like the residency card. Built from the keepsake screen's pieces.
 */

/** Where things sit on the design's 390 × 844 burrow, as the keepsake screen places them. */
const PLACE = {
  header: 96,
  frame: { top: 196, left: 56, width: 278 },
  note: { top: 500, left: 20, maxWidth: 181 },
  pip: { top: 536, left: 116, size: 150 },
  mei: { top: 470, left: 250, size: 120 },
} as const;

const stampType = { ...type.aiTag, size: 10, weight: 900 as const, lineHeight: 1.15 };

/** The round "SEASON ONE" stamp pressed onto the frame's corner. */
function Stamp({ text }: { text: string }) {
  const press = useKeyframes({ ...motion.screens.roundPop, delayMs: 1500 });
  return (
    <Animated.View style={[styles.stampAt, press]} importantForAccessibility="no-hide-descendants">
      <View style={styles.stamp}>
        <Txt variant={stampType} align="center">
          {text.replace(' ', '\n')}
        </Txt>
      </View>
    </Animated.View>
  );
}

export function SeasonScreen({
  keepsake,
  species,
  onHang,
  onBack,
}: {
  keepsake: SeasonKeepsake;
  species: PipSpecies;
  onHang: () => void;
  onBack: () => void;
}) {
  const { t } = useLocale();
  const { u, y } = useStage();
  const { certificate } = keepsake;
  const frameLeft = u(PLACE.frame.left) + (u(PLACE.frame.width) - PLACE.frame.width) / 2;
  return (
    <BurrowBackdrop
      scene="burrow"
      timeOfDay="evening"
      species={species}
      cast={[
        { character: 'mei', mood: 'happy', ...PLACE.mei },
        { character: 'pip', mood: 'proud', ...PLACE.pip },
      ]}
    >
      <BackButton onPress={onBack} accessibilityLabel={t('common.a11y.back')} style={styles.back} />
      <View style={[styles.header, { top: y(PLACE.header) }]}>
        <Tag
          label={keepsake.tag}
          fill={colours.highlight}
          size="medium"
          edge={outline.regular}
          tilt={-4}
        />
        <Txt variant="headline" accessibilityRole="header">
          {keepsake.title}
        </Txt>
      </View>
      <View style={[styles.frame, { left: frameLeft, top: y(PLACE.frame.top) }]}>
        <KeepsakeFrame
          heading={certificate.heading}
          canDo={certificate.canDo}
          witnessed={certificate.witnessed}
          hang
          witnessFace={
            <Face character="mei" species={species} size={40} background={colours.secondarySoft} />
          }
        />
        <Stamp text={keepsake.stamp} />
      </View>
      <View style={[styles.note, { top: y(PLACE.note.top), left: u(PLACE.note.left) }]}>
        <NoteBubble text={keepsake.roommateSays} />
      </View>
      <GlassSheet kind="bar" entrance={motion.screens.infoSheet}>
        <StickerButton label={keepsake.cta} onPress={onHang} haptic="success" />
      </GlassSheet>
    </BurrowBackdrop>
  );
}

const styles = StyleSheet.create({
  back: { position: 'absolute', top: layout.topBar, left: layout.marginScreen, zIndex: 3 },
  header: {
    position: 'absolute',
    left: layout.marginTitle,
    right: layout.marginTitle,
    gap: 6,
    alignItems: 'flex-start',
    zIndex: 2,
  },
  frame: { position: 'absolute', width: PLACE.frame.width, zIndex: 2 },
  note: { position: 'absolute', maxWidth: PLACE.note.maxWidth, zIndex: 3 },
  stampAt: { position: 'absolute', right: -14, bottom: -26 },
  stamp: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: outline.bold,
    borderColor: colours.outline,
    backgroundColor: colours.surface,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '-12deg' }],
  },
});
