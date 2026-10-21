import type { PipSpecies } from '@yapling/art';
import { colours, corners, layout, motion, outline, stickerShadows, type } from '@yapling/theme';
import { StyleSheet, View } from 'react-native';

import {
  BackButton,
  FullRing,
  GlassSheet,
  KeepsakeFrame,
  StickerButton,
  Tag,
  Txt,
  useLocale,
} from '../../ui';
import { BurrowBackdrop, useStage } from '../burrow';
import { Face } from '../burrow/art';
import { artCharacter } from './art';
import type { Certificate, KeepsakeScreenCopy } from './keepsake-model';

export interface KeepsakeScreenProps {
  readonly certificate: Certificate;
  readonly copy: KeepsakeScreenCopy;
  readonly species: PipSpecies;
  readonly onHang: () => void;
  readonly onBack: () => void;
}

/** Where the design places things on its 390 × 844 burrow. */
const PLACE = {
  header: 96,
  frame: { top: 222, left: 56, width: 278 },
  /** Without the ring header the frame hangs higher, as the can-do keepsake shows it. */
  frameHigh: 96,
  pip: { top: 536, left: 116 },
  note: { top: 500, left: 20, maxWidth: 181 },
} as const;

const noteType = { ...type.speaker, size: 14.5, lineHeight: 1.15 };

/** The roommate's note beside the keepsake: a bubble with its tail corner at the bottom right. */
function NoteBubble({ text }: { text: string }) {
  const [tl, tr, br, bl] = corners.note;
  const shape = {
    borderTopLeftRadius: tl,
    borderTopRightRadius: tr,
    borderBottomRightRadius: br,
    borderBottomLeftRadius: bl,
    borderCurve: 'continuous',
  } as const;
  const lip = stickerShadows.button;
  return (
    <View>
      <View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          shape,
          { top: lip.y, bottom: -lip.y, left: lip.x, right: -lip.x, backgroundColor: lip.colour },
        ]}
      />
      <View
        style={[
          shape,
          {
            borderWidth: outline.regular,
            borderColor: colours.outline,
            backgroundColor: colours.surface,
            paddingVertical: 9,
            paddingHorizontal: 13,
          },
        ]}
      >
        <Txt variant={noteType}>{text}</Txt>
      </View>
    </View>
  );
}

/**
 * The keepsake: the roommate has drawn the certificate and hung it in the burrow ("Lan can now…",
 * the can-do, the witness and the day), with the full ring when the week is done. "Treo lên tường"
 * hangs it for good.
 */
export function KeepsakeScreen({
  certificate,
  copy,
  species,
  onHang,
  onBack,
}: KeepsakeScreenProps) {
  const { t } = useLocale();
  const { u, y } = useStage();
  const witness = certificate.witness ? artCharacter(certificate.witness) : null;
  // The frame keeps its drawn size; it hangs centred where the design hangs it.
  const frameLeft = u(PLACE.frame.left) + (u(PLACE.frame.width) - PLACE.frame.width) / 2;
  return (
    <BurrowBackdrop
      scene="burrow"
      timeOfDay="afternoon"
      species={species}
      cast={[{ character: 'pip', mood: 'proud', size: 150, ...PLACE.pip }]}
    >
      <BackButton onPress={onBack} accessibilityLabel={t('common.a11y.back')} style={styles.back} />
      {copy.ring ? (
        <View style={[styles.header, { top: y(PLACE.header) }]}>
          <FullRing label={copy.ring.label} />
          <View style={{ gap: 4, flex: 1 }}>
            <Tag
              label={copy.ring.week}
              fill={colours.secondary}
              size="medium"
              edge={outline.regular}
              tilt={-4}
            />
            <Txt variant="headline" accessibilityRole="header">
              {copy.ring.title}
            </Txt>
          </View>
        </View>
      ) : null}
      <View
        style={[
          styles.frame,
          { left: frameLeft, top: y(copy.ring ? PLACE.frame.top : PLACE.frameHigh) },
        ]}
      >
        <KeepsakeFrame
          heading={certificate.heading}
          canDo={certificate.canDo}
          witnessed={certificate.witnessed}
          hang
          {...(witness
            ? {
                witnessFace: (
                  <Face
                    character={witness}
                    species={species}
                    size={40}
                    background={colours.secondarySoft}
                  />
                ),
              }
            : {})}
        />
      </View>
      <View style={[styles.note, { top: y(PLACE.note.top), left: u(PLACE.note.left) }]}>
        <NoteBubble text={copy.roommateSays} />
      </View>
      <GlassSheet kind="bar" entrance={motion.screens.infoSheet}>
        {copy.ticked ? (
          <View style={styles.ticked}>
            <Tag label={copy.ticked.track} fill={colours.secondarySoft} />
            <Txt variant="rowTitle" style={{ flex: 1 }}>
              {copy.ticked.title}
            </Txt>
            <Txt variant="noteStrong" colour={colours.textMuted}>
              {copy.ticked.count}
            </Txt>
          </View>
        ) : null}
        <StickerButton label={copy.cta} onPress={onHang} haptic="success" />
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    zIndex: 2,
  },
  frame: { position: 'absolute', width: PLACE.frame.width, zIndex: 2 },
  note: {
    position: 'absolute',
    maxWidth: PLACE.note.maxWidth,
    zIndex: 3,
  },
  ticked: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 4 },
});
