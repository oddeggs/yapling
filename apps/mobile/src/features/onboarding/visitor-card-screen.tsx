import type { PipSpecies } from '@yapling/art';
import { Critter } from '@yapling/art/native';
import {
  colours,
  fontFor,
  motion,
  outline,
  palette,
  radii,
  stickerShadows,
  translucent,
  type,
} from '@yapling/theme';
import { Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { GlassSheet, Sticker, StickerButton, Txt, useKeyframes, useLocale } from '../../ui';
import { Face } from '../burrow';
import { BlurredScene, useScale, useTopShift } from './art';
import { ModalSheet, QuietButton, SheetScroll } from './sheets';

/*
 * The Visitor's residency card: the same tilted lilac card with a different stamp (Visitor ·
 * Khách mới đến, no stage number), Linh's promise to help first, the two first can-dos, what
 * Settling in is, then "Settle in with Linh" or "Go straight to the story". The second asks once
 * more in a sheet; the learner always has the last word.
 */

const CARD_TOP = 104;
const CARD_WIDTH = 240;
const SHEET_TOP = 338;

/** The call's pill names in the sheet's body, in bold. */
const BOLD = fontFor({ ...type.body, size: 14.5, weight: 800, lineHeight: 1.4 });

export interface VisitorAim {
  readonly id: string;
  readonly text: string;
  /** Its meaning in the learner's language, or null. */
  readonly gloss: string | null;
}

export interface VisitorCardView {
  readonly top: string;
  /** The learner's name, over the stage. */
  readonly learnerName: string;
  readonly stageName: string;
  readonly stageSub: string;
  readonly welcome: string;
  /** "VISITOR", the stamp's middle word and the day: "SEP 21". */
  readonly stamp: readonly [string, string, string];
  readonly aimsTitle: string;
  readonly aims: readonly VisitorAim[];
  readonly chip: string;
  readonly how: string;
  readonly start: string;
  readonly skip: string;
}

export interface VisitorConfirmView {
  readonly title: string;
  /** The body in runs; the bold ones are the call's pills. */
  readonly body: readonly { readonly text: string; readonly bold: boolean }[];
  readonly linh: string;
  readonly go: string;
  readonly stay: string;
}

export interface VisitorCardScreenProps {
  readonly view: VisitorCardView;
  readonly confirm: VisitorConfirmView;
  readonly species: PipSpecies;
  readonly confirming: boolean;
  readonly busy: boolean;
  readonly onStart: () => void;
  readonly onSkip: () => void;
  readonly onConfirmSkip: () => void;
  readonly onCancelSkip: () => void;
}

export function VisitorCardScreen({
  view,
  confirm,
  species,
  confirming,
  busy,
  onStart,
  onSkip,
  onConfirmSkip,
  onCancelSkip,
}: VisitorCardScreenProps) {
  const { t } = useLocale();
  const { u } = useScale();
  const shift = useTopShift();
  const fly = useKeyframes(motion.screens.residencyCard);
  return (
    <View style={{ flex: 1, backgroundColor: colours.accentSoft }}>
      <BlurredScene fn="s_burrow2" blur={12} wash={translucent.paperWash} />
      <View
        style={{ position: 'absolute', top: 166 + shift, left: u(252) }}
        accessible={false}
        importantForAccessibility="no-hide-descendants"
      >
        <Critter
          character="pip"
          species={species}
          mood={confirming ? 'think' : 'excited'}
          size={140}
        />
      </View>
      <Animated.View
        style={[
          { position: 'absolute', top: CARD_TOP + shift, left: 16, width: CARD_WIDTH, zIndex: 2 },
          fly,
        ]}
        accessible
        accessibilityLabel={[
          view.top,
          view.learnerName,
          view.stageName,
          view.stageSub,
          view.welcome,
        ].join('. ')}
      >
        <Sticker
          shadow={stickerShadows.tiltedCard}
          radius={radii.bubble}
          outline={outline.heavy}
          fill={colours.accent}
          contentStyle={{ paddingTop: 16, paddingHorizontal: 18, paddingBottom: 18, gap: 9 }}
        >
          <Txt variant={{ ...type.label, size: 10, tracking: 0.04 }} numberOfLines={1}>
            {view.top}
          </Txt>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View
              style={{
                width: 52,
                height: 52,
                borderRadius: 13,
                overflow: 'hidden',
                borderWidth: outline.regular,
                borderColor: colours.outline,
                backgroundColor: colours.surface,
              }}
            >
              <Face character="pip" species={species} size={52} background={colours.surface} />
            </View>
            <View style={{ flexShrink: 1 }}>
              <Txt variant={{ ...type.noteStrong, size: 13 }} numberOfLines={1}>
                {view.learnerName}
              </Txt>
              <Txt variant={{ ...type.cardName, size: 30, lineHeight: 1.12 }} numberOfLines={1}>
                {view.stageName}
              </Txt>
              <Txt variant={{ ...type.noteStrong, size: 13 }}>{view.stageSub}</Txt>
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingRight: 44 }}>
            <View
              style={{
                width: 34,
                height: 34,
                borderRadius: 17,
                overflow: 'hidden',
                borderWidth: outline.thin,
                borderColor: colours.outline,
              }}
            >
              <Face character="linh" size={34} background={colours.secondarySoft} />
            </View>
            <Txt variant={{ ...type.handWelcome, size: 19, lineHeight: 1.2 }} style={{ flex: 1 }}>
              {view.welcome}
            </Txt>
          </View>
        </Sticker>
        <Stamp lines={view.stamp} />
      </Animated.View>
      <GlassSheet kind="card" top={SHEET_TOP + shift} entrance={motion.screens.residencySheet}>
        <SheetScroll gap={8}>
          <Txt variant="section" style={{ paddingHorizontal: 4 }}>
            {view.aimsTitle}
          </Txt>
          {view.aims.map((a) => (
            <AimRow key={a.id} aim={a} />
          ))}
          <View
            accessible
            accessibilityLabel={`${view.chip}. ${view.how}`}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 10,
              paddingVertical: 10,
              paddingHorizontal: 12,
              borderRadius: 16,
              backgroundColor: translucent.frostStrong,
              marginTop: 2,
            }}
          >
            <View
              style={{
                paddingVertical: 2,
                paddingHorizontal: 7,
                borderRadius: radii.tag,
                backgroundColor: colours.highlight,
                borderWidth: outline.thin,
                borderColor: colours.outline,
              }}
            >
              <Txt variant={{ ...type.label, size: 11, tracking: 0 }} numberOfLines={1}>
                {view.chip}
              </Txt>
            </View>
            <Txt variant={{ ...type.noteStrong, size: 13.5, lineHeight: 1.3 }} style={{ flex: 1 }}>
              {view.how}
            </Txt>
          </View>
        </SheetScroll>
        <View style={{ gap: 8, paddingTop: 8 }}>
          <StickerButton label={view.start} onPress={onStart} disabled={busy} />
          <StickerButton label={view.skip} tone="glass" onPress={onSkip} disabled={busy} />
        </View>
      </GlassSheet>
      {confirming ? (
        <ModalSheet onClose={onCancelSkip} closeLabel={t('common.a11y.close')}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View
              style={{
                width: 54,
                height: 54,
                borderRadius: 27,
                overflow: 'hidden',
                borderWidth: outline.regular,
                borderColor: colours.outline,
              }}
            >
              <Face character="pip" species={species} size={54} background={colours.accentSoft} />
            </View>
            <Txt
              variant={{ ...type.sheetTitle, size: 26, lineHeight: 1.18 }}
              accessibilityRole="header"
              style={{ flex: 1 }}
            >
              {confirm.title}
            </Txt>
          </View>
          <Txt variant={{ ...type.body, size: 14.5, lineHeight: 1.4 }} colour={colours.textBody}>
            {confirm.body.map((run, i) =>
              run.bold ? (
                <Text key={i} style={[BOLD, { color: colours.text }]}>
                  {run.text}
                </Text>
              ) : (
                run.text
              ),
            )}
          </Txt>
          <View
            accessible
            accessibilityLabel={confirm.linh}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 10,
              paddingVertical: 10,
              paddingHorizontal: 12,
              borderRadius: 16,
              backgroundColor: colours.surface,
              borderWidth: 1.5,
              borderColor: colours.border,
            }}
          >
            <View
              style={{
                width: 34,
                height: 34,
                borderRadius: 17,
                overflow: 'hidden',
                borderWidth: outline.thin,
                borderColor: colours.outline,
              }}
            >
              <Face character="linh" size={34} background={colours.secondarySoft} />
            </View>
            <Txt variant={{ ...type.noteStrong, lineHeight: 1.3 }} style={{ flex: 1 }}>
              {confirm.linh}
            </Txt>
          </View>
          <StickerButton
            label={confirm.go}
            onPress={onConfirmSkip}
            disabled={busy}
            style={{ marginTop: 4 }}
          />
          <QuietButton label={confirm.stay} onPress={onCancelSkip} />
        </ModalSheet>
      ) : null}
    </View>
  );
}

/** A first can-do: an empty ink box, the English and its meaning in the hand font. */
function AimRow({ aim }: { aim: VisitorAim }) {
  return (
    <View
      accessible
      accessibilityRole="checkbox"
      accessibilityState={{ checked: false }}
      accessibilityLabel={aim.gloss ? `${aim.text}. ${aim.gloss}` : aim.text}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 16,
        backgroundColor: colours.surface,
        borderWidth: outline.regular,
        borderColor: colours.outline,
      }}
    >
      <View
        style={{
          width: 24,
          height: 24,
          borderRadius: radii.tag,
          borderWidth: outline.regular,
          borderColor: colours.outline,
        }}
      />
      <View style={{ flex: 1 }}>
        <Txt variant={{ ...type.slotTitle, lineHeight: 1.3 }}>{aim.text}</Txt>
        {aim.gloss ? (
          <Txt variant={{ ...type.handNote, lineHeight: 1.22 }} colour={colours.textGloss}>
            {aim.gloss}
          </Txt>
        ) : null}
      </View>
    </View>
  );
}

/** The round dashed "VISITOR / KHÁCH / SEP 21" stamp on the card's corner. */
function Stamp({ lines }: { lines: readonly [string, string, string] }) {
  const [stage, middle, date] = lines;
  const small = { ...type.aiTag, size: 8.5, weight: 900 as const, lineHeight: 1.2 };
  return (
    <View
      style={{
        position: 'absolute',
        right: 10,
        bottom: -26,
        width: 64,
        height: 64,
        borderRadius: 32,
        borderWidth: outline.bold,
        borderStyle: 'dashed',
        borderColor: colours.outline,
        backgroundColor: palette.cyanTint,
        alignItems: 'center',
        justifyContent: 'center',
        transform: [{ rotate: '-10deg' }],
      }}
    >
      <Txt variant={{ ...small, size: 10 }} align="center">
        {stage}
      </Txt>
      <Txt variant={small} align="center">
        {middle}
      </Txt>
      <Txt variant={small} align="center">
        {date}
      </Txt>
    </View>
  );
}
