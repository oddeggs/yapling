import { colours, controls, glass, outline, pill } from '@yapling/theme';
import type { ReactNode } from 'react';
import { View } from 'react-native';

import { AiTag } from './chip';
import { CritterSlot } from './critter-slot';
import { GlassView } from './surface';
import { FRAME_TEXT_MAX_SCALE, Txt } from './text';
import { typeExtras } from './type-extras';
import type { ViewStyleProp } from './style';

export interface SpeakerPillProps {
  /** Who is on the call. */
  readonly name: string;
  /** The AI tag's text, from the catalogue. Every character wears it. */
  readonly aiTag: string;
  /** Where they are ("Quán Lantern · sau quầy"). */
  readonly place: string;
  /** Their face from `@yapling/art`; a placeholder until then. */
  readonly face?: ReactNode;
  /** The episode, at the right ("S1 · E1"). */
  readonly episode?: string;
  readonly style?: ViewStyleProp;
}

const { height: H, face: FACE } = controls.topPill;
const EPISODE_H = 30;

/** The top of a call: a glass pill with the speaker's face, name, AI tag and place. */
export function SpeakerPill({ name, aiTag, place, face, episode, style }: SpeakerPillProps) {
  return (
    <View
      style={[
        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
        style,
      ]}
    >
      <GlassView
        glass={glass.panel}
        radius={pill(H)}
        style={{
          flexShrink: 1,
          minWidth: 0,
          height: H,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          paddingLeft: 5,
          paddingRight: 14,
        }}
      >
        <View
          accessible
          accessibilityRole="header"
          accessibilityLabel={`${name}, ${aiTag}. ${place}`}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1, minWidth: 0 }}
        >
          <View
            style={{
              width: FACE,
              height: FACE,
              borderRadius: FACE / 2,
              overflow: 'hidden',
              borderWidth: outline.thin,
              borderColor: colours.outline,
            }}
          >
            {face ?? <CritterSlot kind="face" size={FACE - outline.thin * 2} />}
          </View>
          <Txt maxFontSizeMultiplier={FRAME_TEXT_MAX_SCALE} variant="speaker" numberOfLines={1}>
            {name}
          </Txt>
          <AiTag label={aiTag} />
          <Txt
            maxFontSizeMultiplier={FRAME_TEXT_MAX_SCALE}
            variant="note"
            colour={colours.textMuted}
            numberOfLines={1}
            style={{ flexShrink: 1 }}
          >
            {place}
          </Txt>
        </View>
      </GlassView>
      {episode ? (
        <View
          style={{
            height: EPISODE_H,
            paddingHorizontal: 10,
            borderRadius: pill(EPISODE_H),
            borderWidth: outline.regular,
            borderColor: colours.outline,
            backgroundColor: colours.surface,
            justifyContent: 'center',
          }}
        >
          <Txt maxFontSizeMultiplier={FRAME_TEXT_MAX_SCALE} variant={typeExtras.episodeTag}>
            {episode}
          </Txt>
        </View>
      ) : null}
    </View>
  );
}
