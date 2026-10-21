import { colours, motion, radii } from '@yapling/theme';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';

import { CritterSlot } from './critter-slot';
import { useKeyframes } from './motion/play';
import { Txt } from './text';
import { typeExtras } from './type-extras';

export interface SeedPacketProps {
  /** The phrase, in English. */
  readonly phrase: string;
  /** Its Vietnamese gloss, written by hand. */
  readonly gloss: string;
  /** The packet (or sprout, leaf, bloom) from `@yapling/art`; a placeholder until then. */
  readonly art?: ReactNode;
}

/** A phrase of the week as a seed packet: the packet, the phrase and its hand-written gloss. */
export function SeedPacket({ phrase, gloss, art }: SeedPacketProps) {
  return (
    <View
      accessible
      accessibilityLabel={`${phrase}. ${gloss}`}
      style={{
        // Fills its cell, so packets side by side share the taller one's height.
        flexGrow: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingVertical: 6,
        paddingLeft: 6,
        paddingRight: 10,
        borderRadius: radii.tileLarge,
        backgroundColor: colours.surfaceAccent,
      }}
    >
      {art ?? <CritterSlot kind="object" size={36} />}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Txt variant={typeExtras.phrase}>{phrase}</Txt>
        <Txt variant="glossSmall" colour={colours.textGloss}>
          {gloss}
        </Txt>
      </View>
    </View>
  );
}

/** The week's phrases two by two, each row as tall as its taller packet (the design's grid). */
export function SeedPacketGrid({
  packets,
}: {
  packets: readonly (SeedPacketProps & { readonly id: string })[];
}) {
  const rows: (typeof packets)[number][][] = [];
  packets.forEach((packet, i) => {
    if (i % 2 === 0) rows.push([packet]);
    else rows[rows.length - 1]?.push(packet);
  });
  return (
    <View style={{ gap: 8 }}>
      {rows.map((row) => (
        <View key={row.map((p) => p.id).join()} style={{ flexDirection: 'row', gap: 8 }}>
          {row.map(({ id, ...packet }) => (
            <View key={id} style={{ flex: 1 }}>
              <SeedPacket {...packet} />
            </View>
          ))}
          {row.length === 1 ? <View style={{ flex: 1 }} /> : null}
        </View>
      ))}
    </View>
  );
}

export interface PhraseStageTileProps {
  readonly phrase: string;
  /** Where the phrase is ("Gói hạt", "Mầm"). */
  readonly stage: string;
  readonly art?: ReactNode;
  /** Pops the art in (a seed turning into a sprout); its place among the tiles staggers it. */
  readonly grow?: boolean;
  readonly index?: number;
}

/** A phrase standing in a row after a call: its object, the phrase and its stage. */
export function PhraseStageTile({
  phrase,
  stage,
  art,
  grow = false,
  index = 0,
}: PhraseStageTileProps) {
  const sprout = motion.screens.sprout;
  const pop = useKeyframes(
    { ...sprout, delayMs: sprout.delayMs + index * (sprout.staggerMs ?? 0) },
    { active: grow, trigger: grow },
  );
  return (
    <View
      accessible
      accessibilityLabel={`${phrase}. ${stage}`}
      style={{
        flex: 1,
        alignItems: 'center',
        gap: 3,
        paddingVertical: 8,
        paddingHorizontal: 2,
        borderRadius: radii.tileLarge,
        backgroundColor: colours.surfaceAccent,
      }}
    >
      <Animated.View style={[{ transformOrigin: '50% 100%' }, grow ? pop : null]}>
        {art ?? <CritterSlot kind="object" size={40} />}
      </Animated.View>
      <Txt variant={typeExtras.tileLabel} align="center">
        {phrase}
      </Txt>
      <Txt variant={typeExtras.tileStage} colour={colours.textMuted}>
        {stage}
      </Txt>
    </View>
  );
}
