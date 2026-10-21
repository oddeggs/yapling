import { FIRST_LANGUAGES, type FirstLanguage } from '@yapling/contracts';
import { Critter, Scene } from '@yapling/art/native';
import { colours, layout, motion, palette, type } from '@yapling/theme';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  BackButton,
  ChoiceChip,
  GlassSheet,
  StickerButton,
  Txt,
  typeExtras,
  useKeyframes,
  useLocale,
} from '../../ui';
import { useScale } from './art';
import { AgeCheckRow, KeyboardLift, NameField } from './parts';

/*
 * The ferry into Natterwick: the harbour with Pip waving on deck, the wordmark in the clear sky
 * (never over the moon or the clouds), and the glass sheet: first the first language, then the
 * learner's name and the age check.
 */

/** The wordmark's size: the prototype's 70 shrunk so the word ends before the moon. */
const WORDMARK_SIZE = 62;

/** The harbour, the ferry and Pip, with the wordmark and its line. */
export function FerryBackdrop({ children }: { children?: ReactNode }) {
  const { t } = useLocale();
  const { width, u } = useScale();
  const { top } = useSafeAreaInsets();
  const wordmark = useKeyframes(motion.screens.splashWordmark);
  return (
    <View style={{ flex: 1, backgroundColor: palette.harbourSky, overflow: 'hidden' }}>
      <Scene
        name="harbour"
        extra={{ pierY: 650, horizon: 440 }}
        width={width}
        style={{ position: 'absolute', top: 0, left: 0 }}
      />
      <Scene
        name="festival-boat"
        width={u(220)}
        style={{ position: 'absolute', top: u(286), left: u(150) }}
      />
      <Critter
        character="pip"
        species="redpanda"
        mood="wave"
        size={u(84)}
        style={{ position: 'absolute', top: u(248), left: u(236) }}
      />
      {/* Below the status bar and the top cloud, left of the moon. */}
      <Animated.View
        style={[{ position: 'absolute', top: top + 44, left: u(24), gap: 2 }, wordmark]}
        accessible
        accessibilityRole="header"
        accessibilityLabel={`yapling. ${t('onboarding.splash.tag')}`}
      >
        <Txt variant={{ ...type.wordmark, size: WORDMARK_SIZE }}>yapling</Txt>
        <Txt variant={{ ...type.rowTitle, size: 17, tracking: -0.02 }}>
          {t('onboarding.splash.tag')}
        </Txt>
      </Animated.View>
      {children}
    </View>
  );
}

export interface LanguageScreenProps {
  readonly chosen: FirstLanguage;
  readonly onChoose: (language: FirstLanguage) => void;
  readonly onContinue: () => void;
}

/** "Your first language": nine chips, the chosen one lilac, and "Continue". */
export function LanguageScreen({ chosen, onChoose, onContinue }: LanguageScreenProps) {
  const { t } = useLocale();
  return (
    <FerryBackdrop>
      <GlassSheet kind="sheet" entrance={motion.screens.splashSheet}>
        <Txt variant="splashTitle" accessibilityRole="header" style={{ paddingHorizontal: 4 }}>
          {t('onboarding.splash.title')}
        </Txt>
        <Txt
          variant={typeExtras.sheetSub}
          colour={colours.textMuted}
          style={{ paddingHorizontal: 4 }}
        >
          {t('onboarding.splash.sub')}
        </Txt>
        <View
          accessibilityRole="radiogroup"
          style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}
        >
          {FIRST_LANGUAGES.map((l) => (
            <ChoiceChip
              key={l}
              label={t(`onboarding.firstLanguage.${l}`)}
              selected={l === chosen}
              onPress={() => onChoose(l)}
            />
          ))}
        </View>
        <StickerButton label={t('common.continue')} onPress={onContinue} style={{ marginTop: 4 }} />
      </GlassSheet>
    </FerryBackdrop>
  );
}

export interface AgeScreenProps {
  readonly name: string;
  readonly onName: (name: string) => void;
  readonly confirmed: boolean;
  readonly onToggle: () => void;
  /** Open once the box is ticked and a name typed. */
  readonly canContinue: boolean;
  /** Making the guest session. */
  readonly busy: boolean;
  /** Why the last try failed, in the chrome's words. */
  readonly problem: string | null;
  readonly onContinue: () => void;
  readonly onBack: () => void;
}

/** The learner's name, "I'm 18 or older" and "Step off the ferry". */
export function AgeScreen({
  name,
  onName,
  confirmed,
  onToggle,
  canContinue,
  busy,
  problem,
  onContinue,
  onBack,
}: AgeScreenProps) {
  const { t } = useLocale();
  return (
    <FerryBackdrop>
      <BackButton
        onPress={onBack}
        accessibilityLabel={t('common.a11y.back')}
        style={{ position: 'absolute', top: layout.topBar, left: layout.marginScreen }}
      />
      <KeyboardLift>
        <GlassSheet
          kind="sheet"
          entrance={motion.screens.splashSheet}
          style={{ gap: 12, paddingHorizontal: 18 }}
        >
          <View style={{ gap: 6 }}>
            <Txt variant="section" style={{ paddingLeft: 8 }}>
              {t('onboarding.age.nameLabel')}
            </Txt>
            <NameField
              value={name}
              onChange={onName}
              label={t('onboarding.age.nameLabel')}
              placeholder={t('onboarding.age.namePlaceholder', { name: 'Pip' })}
            />
          </View>
          <AgeCheckRow
            checked={confirmed}
            onToggle={onToggle}
            title={t('onboarding.age.confirm')}
            subtitle={t('onboarding.age.why')}
          />
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
          <StickerButton
            label={t('onboarding.age.cta')}
            onPress={onContinue}
            disabled={!canContinue || busy}
            haptic={canContinue ? 'tap' : null}
          />
        </GlassSheet>
      </KeyboardLift>
    </FerryBackdrop>
  );
}
