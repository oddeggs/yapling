import { ROOMMATE_SPECIES, type RoommateSpecies } from '@yapling/contracts';
import { Critter, Scene } from '@yapling/art/native';
import {
  colours,
  layout,
  motion,
  outline,
  palette,
  radii,
  stickerShadows,
  type,
} from '@yapling/theme';
import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  BackButton,
  GlassSheet,
  Press,
  StickerButton,
  Sticker,
  Txt,
  transitionTo,
  useKeyframes,
  useLocale,
} from '../../ui';
import { useScale } from './art';
import { KeyboardLift, NameField } from './parts';

/*
 * "Who's your roommate?": the town with the moving van behind a glass sheet holding the three
 * starters (the picked one lifts, jumps and gets its colour), the name field and "Move in". The
 * town is drawn below the status bar (design review fix 5).
 */

const LABEL_KEY = {
  redpanda: 'onboarding.pick.redPanda',
  capybara: 'onboarding.pick.capybara',
  cat: 'onboarding.pick.cat',
} as const;

/** The picked starter's name tile takes its colour. */
const PICKED_FILL: Record<RoommateSpecies, string> = {
  redpanda: palette.lilac,
  capybara: palette.cyan,
  cat: palette.mint,
};

/** Where the town's map frame begins, in its own points: the town is cut there, under the bar. */
const TOWN_CUT = 128;
const SHEET_HEIGHT = 440;
const STARTER_ART = 110;

export interface PickScreenProps {
  readonly species: RoommateSpecies;
  readonly onSpecies: (species: RoommateSpecies) => void;
  readonly name: string;
  readonly onName: (name: string) => void;
  readonly canMoveIn: boolean;
  readonly busy: boolean;
  readonly problem: string | null;
  readonly onMoveIn: () => void;
  readonly onBack: () => void;
}

export function PickScreen({
  species,
  onSpecies,
  name,
  onName,
  canMoveIn,
  busy,
  problem,
  onMoveIn,
  onBack,
}: PickScreenProps) {
  const { t } = useLocale();
  const { width, u } = useScale();
  const { top } = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: colours.background }}>
      <View style={{ position: 'absolute', top, left: 0, right: 0, bottom: 0, overflow: 'hidden' }}>
        <Scene
          name="town"
          extra={{ vanX: 240 }}
          width={width}
          style={{ position: 'absolute', top: -u(TOWN_CUT), left: 0 }}
        />
      </View>
      <BackButton
        onPress={onBack}
        accessibilityLabel={t('common.a11y.back')}
        style={{ position: 'absolute', top: layout.topBar, left: layout.marginScreen }}
      />
      <KeyboardLift>
        <GlassSheet kind="sheet" style={{ height: SHEET_HEIGHT, padding: 0, gap: 0 }}>
          <Txt
            variant="pickTitle"
            align="center"
            accessibilityRole="header"
            style={{ position: 'absolute', top: 26, left: 8, right: 8 }}
          >
            {t('onboarding.pick.title')}
          </Txt>
          <View
            accessibilityRole="radiogroup"
            style={{
              position: 'absolute',
              top: 80,
              left: 8,
              right: 8,
              height: 196,
              flexDirection: 'row',
              gap: 6,
            }}
          >
            {ROOMMATE_SPECIES.map((s) => (
              <Starter
                key={s}
                species={s}
                picked={s === species}
                label={t(LABEL_KEY[s])}
                onPress={() => onSpecies(s)}
              />
            ))}
          </View>
          <View style={{ position: 'absolute', top: 300, left: 16, right: 16, gap: 6 }}>
            <Txt variant={{ ...type.section, size: 12 }} style={{ paddingLeft: 8 }}>
              {t('onboarding.pick.nameLabel')}
            </Txt>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <NameField
                large
                value={name}
                onChange={onName}
                label={t('onboarding.pick.nameLabel')}
                onSubmit={onMoveIn}
                style={{ flex: 1, minWidth: 0 }}
              />
              <StickerButton
                label={t('onboarding.pick.cta')}
                size="tall"
                onPress={onMoveIn}
                disabled={!canMoveIn || busy}
                style={{ width: u(122) }}
              />
            </View>
            {problem !== null ? (
              <Txt
                variant="noteStrong"
                colour={colours.textMuted}
                align="center"
                accessibilityLiveRegion="polite"
              >
                {problem}
              </Txt>
            ) : null}
          </View>
        </GlassSheet>
      </KeyboardLift>
    </View>
  );
}

function Starter({
  species,
  picked,
  label,
  onPress,
}: {
  species: RoommateSpecies;
  picked: boolean;
  label: string;
  onPress: () => void;
}) {
  const raised = useSharedValue(picked ? 1 : 0);
  useEffect(() => {
    raised.set(transitionTo(picked ? 1 : 0, motion.transitions.roommateLift));
  }, [picked, raised]);
  const rise = useAnimatedStyle(() => ({ transform: [{ translateY: -20 * raised.get() }] }));
  const jump = useKeyframes(motion.critter.jump, { active: picked, trigger: picked });
  return (
    <Press
      onPress={onPress}
      haptic="selection"
      accessibilityRole="radio"
      accessibilityState={{ selected: picked }}
      accessibilityLabel={label}
      style={{ flex: 1, height: 196 }}
    >
      <Animated.View
        pointerEvents="none"
        style={[
          {
            position: 'absolute',
            bottom: 46,
            left: '50%',
            marginLeft: -STARTER_ART / 2,
            width: STARTER_ART,
            height: STARTER_ART * 1.2,
          },
          rise,
        ]}
      >
        <Animated.View style={jump}>
          <Critter
            character="pip"
            species={species}
            mood={picked ? 'excited' : 'happy'}
            size={STARTER_ART}
            animated={picked}
          />
        </Animated.View>
      </Animated.View>
      <Sticker
        shadow={stickerShadows.button}
        radius={radii.tile}
        outline={outline.bold}
        fill={picked ? PICKED_FILL[species] : colours.surface}
        style={{ position: 'absolute', left: 8, right: 8, bottom: 4, height: 58 }}
        contentStyle={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: 4,
        }}
      >
        <Txt variant={{ ...type.buttonSmall, size: 13.5, lineHeight: 1.05 }} align="center">
          {label}
        </Txt>
      </Sticker>
    </Press>
  );
}
