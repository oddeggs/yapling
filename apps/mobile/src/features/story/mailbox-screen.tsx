import type { PipSpecies } from '@yapling/art';
import { CAST } from '@yapling/story';
import {
  colours,
  glass,
  layout,
  motion,
  outline,
  palette,
  radii,
  stickerShadows,
  type,
} from '@yapling/theme';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useDerivedValue } from 'react-native-reanimated';

import {
  BackButton,
  GlassView,
  Press,
  Sticker,
  StickerButton,
  Txt,
  useKeyframes,
  useLocale,
} from '../../ui';
import { useLipsyncClock } from '../../voice';
import { ListenPlayer } from './listen-player';
import type { GlossReveal, MailboxPlan } from './listening';
import { BlurredBurrow, Stamp, VerticalDash, Waveform, useFrame } from './parts';
import { drawable, sceneOfSender } from './places';
import { formatDuration, playedFraction } from './story-model';

/*
 * A recorded voicemail, as a postcard in the mailbox: the sender's note in their hand (what the
 * message says), their stamp and the postmark, and the player under it. It plays on its own when
 * opened; the play button plays it again. "Tiếp tục" goes on (to the episode's closing card);
 * "Để sau" leaves it waiting in the mailbox. Nothing to answer, nothing to fail.
 */

export interface MailboxScreenProps {
  readonly plan: MailboxPlan;
  readonly learnerName: string | null;
  readonly species: PipSpecies;
  readonly roommateName: string;
  /** The postmark's date and time (`OCT 20\n18:20`). */
  readonly postmark: string;
  readonly glossReveal: GlossReveal;
  readonly onContinue: () => void;
  readonly onLater: () => void;
}

type Playback = 'loading' | 'playing' | 'paused' | 'played';

export function MailboxScreen({
  plan,
  learnerName,
  species,
  roommateName,
  postmark,
  glossReveal,
  onContinue,
  onLater,
}: MailboxScreenProps) {
  const { t } = useLocale();
  const { y } = useFrame();
  const fly = useKeyframes(motion.call.voicemail);
  const [playback, setPlayback] = useState<Playback>('loading');
  const [tapped, setTapped] = useState(false);
  const message = plan.message;
  const beep = plan.beep;
  const [player] = useState(() => {
    const p: ListenPlayer = new ListenPlayer({
      ended: () => {
        setPlayback('played');
        // A message cut off ends on the phone's beep.
        if (beep) void p.playSfx(beep);
      },
      failed: () => setPlayback('played'),
    });
    return p;
  });
  useLipsyncClock(player.lipsync);
  const started = useRef(false);
  useEffect(() => {
    let live = true;
    void player.start().then(() => {
      if (!live || started.current) return;
      started.current = true;
      setPlayback('playing');
      void player.play(message.lineId);
    });
    return () => {
      live = false;
      void player.dispose();
    };
  }, [player, message.lineId]);

  const onPlay = () => {
    if (playback === 'playing') {
      setPlayback('paused');
      void player.pause();
    } else if (playback === 'paused') {
      setPlayback('playing');
      void player.resume();
    } else if (playback === 'played') {
      setPlayback('playing');
      void player.play(message.lineId);
    }
  };

  const durationMs = message.durationMs ?? 0;
  const playing = playback === 'playing' || playback === 'paused';
  const lipsync = player.lipsync;
  const played = useDerivedValue(() =>
    playback === 'played'
      ? 1
      : playing
        ? playedFraction(Math.max(0, lipsync.streamMs.get()), durationMs)
        : 0,
  );
  const fromName = plan.from === 'pip' ? roommateName : CAST[plan.from].name;
  const gloss = message.gloss;
  const tappable = gloss !== null && (glossReveal === 'marked' || glossReveal === 'on_tap');
  const glossShown = gloss !== null && (glossReveal === 'shown' || tapped);
  const name = learnerName?.trim() ?? '';

  return (
    <BlurredBurrow scene={sceneOfSender(plan.from)}>
      <BackButton
        onPress={onLater}
        accessibilityLabel={t('common.a11y.back')}
        style={[styles.back, { top: y(layout.topBar) }]}
      />
      <View style={[styles.tagRow, { top: y(layout.topBar) + 7 }]}>
        <Sticker
          shadow={stickerShadows.chip}
          radius={13}
          outline={outline.regular}
          fill={colours.surface}
          contentStyle={styles.tag}
        >
          <View style={styles.tagDot} />
          <Txt variant={TAG}>{t('story.mailbox.tag')}</Txt>
        </Sticker>
      </View>
      <Animated.View style={[styles.cardWrap, { top: y(116) }, fly]}>
        <Sticker
          shadow={stickerShadows.paper}
          radius={radii.paper + 2}
          outline={outline.bold}
          fill={colours.surfacePaper}
          contentStyle={styles.card}
        >
          <View style={styles.top}>
            <Press
              onPress={tappable ? () => setTapped((g) => !g) : undefined}
              haptic={tappable ? 'selection' : null}
              accessibilityLabel={
                glossShown && gloss
                  ? `${t('story.mailbox.a11y.card', { name: fromName, text: message.caption })}. ${gloss}`
                  : t('story.mailbox.a11y.card', { name: fromName, text: message.caption })
              }
              {...(tappable ? { accessibilityHint: t('call.tapForMeaning') } : {})}
              style={styles.note}
            >
              {name !== '' ? <Txt variant={HAND_NAME}>{`${name},`}</Txt> : null}
              <Txt variant={HAND_TEXT}>{message.caption}</Txt>
              {glossShown && gloss ? (
                <Txt variant="glossStory" colour={colours.textGloss}>
                  {gloss}
                </Txt>
              ) : glossReveal === 'marked' && tappable ? (
                <Txt variant="labelSmall" colour={colours.textMuted}>
                  {t('story.tapForMeaning')}
                </Txt>
              ) : null}
              <Txt variant={HAND_FROM} colour={colours.textHand} style={{ marginTop: 6 }}>
                {fromName}
              </Txt>
            </Press>
            <VerticalDash />
            <View style={styles.side}>
              <Stamp
                character={drawable(plan.from)}
                species={species}
                mood="excited"
                background={palette.cyanTint}
                width={76}
                height={88}
              />
              <View style={styles.postmark}>
                <Txt variant={POSTMARK} colour={palette.plum} align="center" style={{ width: 90 }}>
                  {`${t('story.postmark')}\n${postmark}`}
                </Txt>
              </View>
              <View style={styles.address}>
                <View style={styles.addressRule} />
                {name !== '' ? <Txt variant={ADDRESS_NAME}>{name}</Txt> : null}
                <Txt variant={ADDRESS} colour={colours.textMuted}>
                  {t('story.mailbox.address')}
                </Txt>
              </View>
            </View>
          </View>
          <Press
            onPress={onPlay}
            haptic="selection"
            accessibilityLabel={
              playback === 'playing' ? t('story.mailbox.a11y.pause') : t('story.mailbox.a11y.play')
            }
            style={styles.play}
          >
            <View style={styles.playButton}>
              {playback === 'playing' ? (
                <View style={styles.pauseGlyph}>
                  <View style={styles.pauseBar} />
                  <View style={styles.pauseBar} />
                </View>
              ) : (
                <View style={styles.playGlyph} />
              )}
            </View>
            <Waveform
              bars={34}
              spread={20}
              height={28}
              played={played}
              label={t('story.a11y.waveform', {
                elapsed: formatDuration(playback === 'played' ? durationMs : 0),
                duration: formatDuration(durationMs),
              })}
            />
            <Txt variant={DURATION}>{formatDuration(durationMs)}</Txt>
          </Press>
        </Sticker>
      </Animated.View>
      <GlassView glass={glass.panel} radius={radii.sheetBar} style={styles.sheet}>
        <StickerButton label={t('common.continue')} tone="answer" onPress={onContinue} />
        <StickerButton label={t('story.mailbox.later')} tone="glass" onPress={onLater} />
      </GlassView>
    </BlurredBurrow>
  );
}

const TAG = { ...type.label, size: 11, tracking: 0.04 };
const HAND_NAME = { ...type.postcard, size: 22 };
const HAND_TEXT = { ...type.postcard, size: 24 };
const HAND_FROM = { ...type.postcard, size: 20 };
const POSTMARK = { ...type.label, size: 9.5, tracking: 0, lineHeight: 1.1 };
const ADDRESS_NAME = { ...type.labelSmall, size: 11, tracking: 0 };
const ADDRESS = { ...type.note, size: 10 };
const DURATION = { ...type.buttonSmall, size: 13 };

const styles = StyleSheet.create({
  back: { position: 'absolute', left: layout.marginScreen },
  tagRow: { position: 'absolute', left: 62 },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 26,
    paddingLeft: 7,
    paddingRight: 11,
  },
  tagDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colours.secondary,
    borderWidth: outline.thin,
    borderColor: colours.outline,
  },
  cardWrap: { position: 'absolute', left: 18, right: 18 },
  card: { padding: 18, gap: 12 },
  top: { flexDirection: 'row', gap: 12 },
  note: { flex: 1, gap: 8, paddingRight: 12 },
  side: { width: 98, alignItems: 'center', gap: 10 },
  postmark: {
    width: 78,
    height: 78,
    borderRadius: 39,
    borderWidth: outline.regular,
    borderColor: palette.plum,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '-14deg' }],
  },
  address: { alignSelf: 'stretch', gap: 4 },
  addressRule: { height: 2, backgroundColor: colours.lineArt },
  play: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    paddingLeft: 8,
    paddingRight: 12,
    borderRadius: 18,
    borderWidth: outline.thin,
    borderColor: colours.outline,
    backgroundColor: colours.accentSoft,
  },
  playButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colours.accent,
    borderWidth: outline.regular,
    borderColor: colours.outline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playGlyph: {
    marginLeft: 3,
    width: 0,
    height: 0,
    borderTopWidth: 7,
    borderBottomWidth: 7,
    borderLeftWidth: 11,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: colours.outline,
  },
  pauseGlyph: { flexDirection: 'row', gap: 4 },
  pauseBar: { width: 4, height: 13, borderRadius: 1, backgroundColor: colours.outline },
  sheet: {
    position: 'absolute',
    left: layout.sheetInset,
    right: layout.sheetInset,
    bottom: layout.sheetInset,
    padding: 16,
    gap: 10,
  },
});
