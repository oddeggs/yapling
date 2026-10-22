import type { Character, PipSpecies } from '@yapling/art';
import { CAST } from '@yapling/story';
import { colours, glass, layout, motion, outline, radii, type } from '@yapling/theme';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedReaction, useDerivedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { GlassView, ListenBar, Press, Txt, useKeyframes, useLocale, useToast } from '../../ui';
import { useLipsyncClock, type Lipsync } from '../../voice';
import { WordObject } from '../burrow/art';
import { ListenPlayer } from './listen-player';
import { BlurredBurrow, ListenTop, PostcardCard, RoundFace, Waveform, useFrame } from './parts';
import type { LineStep, ListenPlan, StorySegment } from './plan';
import {
  currentLine,
  formatDuration,
  isDone,
  lineEnded,
  playedFraction,
  postcardOf,
  seedEventFor,
  startFlow,
  storyLine,
  togglePause,
  visibleSegments,
  type SeedEvent,
  type StoryFlow,
} from './story-model';

/*
 * Pip's voice story and the postcard that comes with it: the player with its waveform, the
 * story's lines appearing as Pip reaches them (each tappable for its gloss), "nothing to fail",
 * then the postcard flying in while its sender reads it. "Cảm ơn Pip" closes.
 */

export interface StoryScreenProps {
  readonly plan: ListenPlan;
  readonly roommateName: string;
  readonly species: PipSpecies;
  /** The postmark's day (`SEP 23`). */
  readonly postmarkDate: string;
  /** A gift the story leaves in the burrow, toasted at the end. */
  readonly gift: string | null;
  /** A line was tapped for its gloss: the phrase it carries drops in the burrow as a seed. */
  readonly onSeed: (event: SeedEvent) => void;
  /** Everything played, or the learner closed it: mark the scenes seen. */
  readonly onFinish: () => void;
  readonly onBack: () => void;
}

const asCharacter = (id: string): Character => id as Character;

export function StoryScreen({
  plan,
  roommateName,
  species,
  postmarkDate,
  gift,
  onSeed,
  onFinish,
  onBack,
}: StoryScreenProps) {
  const { t } = useLocale();
  const toast = useToast();
  const { y } = useFrame();
  const [flow, setFlow] = useState<StoryFlow>(() => startFlow(plan));
  const flowRef = useRef(flow);
  flowRef.current = flow;
  const [player] = useState(
    () =>
      new ListenPlayer({
        ended: (lineId) => {
          const at = flowRef.current.step;
          const step = plan.steps[at];
          if (step?.kind === 'line' && step.lineId === lineId) {
            setFlow((f) => lineEnded(plan, f, at));
          }
        },
        // A line that can't play is skipped: the transcript still shows it whole.
        failed: (lineId) => {
          const at = flowRef.current.step;
          const step = plan.steps[at];
          if (step?.kind === 'line' && step.lineId === lineId) {
            setFlow((f) => lineEnded(plan, f, at));
          }
        },
      }),
  );
  useLipsyncClock(player.lipsync);

  const story = storyLine(plan);
  const postcard = postcardOf(plan);
  const line = currentLine(plan, flow);
  const done = isDone(plan, flow);

  // Start the audio, then play each line as the flow reaches it.
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let live = true;
    void player.start().then(() => {
      if (!live) return;
      player.preload(plan.steps.flatMap((s) => (s.kind === 'line' ? [s.lineId] : [])));
      setReady(true);
    });
    return () => {
      live = false;
      void player.dispose();
    };
  }, [player, plan]);
  useEffect(() => {
    if (ready && line) void player.play(line.lineId);
  }, [ready, line, player]);

  // The end: the gift, once.
  const gifted = useRef(false);
  useEffect(() => {
    if (!done || gifted.current) return;
    gifted.current = true;
    if (gift) toast({ text: gift, art: <WordObject id="plant-0" size={33} />, haptic: 'success' });
  }, [done, gift, toast]);

  const onHold = useCallback(() => {
    const next = togglePause(flowRef.current);
    setFlow(next);
    void (next.paused ? player.pause() : player.resume());
  }, [player]);

  const storyPlaying = story !== null && flow.step === story.index;
  const storyPlayed = story !== null && flow.step > story.index;
  const postcardShown = postcard !== null && flow.step > postcard.index;
  const duration = story?.line.durationMs ?? 0;

  const onTapSegment = (l: LineStep, segment: StorySegment, shown: boolean) => {
    if (!shown) return;
    onSeed(seedEventFor(plan, l, segment));
    toast({ text: t('call.seedDropped'), art: <WordObject id="seed" size={33} /> });
  };

  const top = y(108);
  return (
    <BlurredBurrow>
      <ListenTop
        name={roommateName}
        place={t('story.place.voiceStory', { duration: formatDuration(duration) })}
        face={<RoundFace character="pip" species={species} size={30} />}
        onBack={onBack}
      />
      {story ? (
        <View style={[styles.column, { top }]}>
          <Player
            lipsync={player.lipsync}
            active={storyPlaying}
            durationMs={duration}
            species={species}
          />
          <View style={styles.tag}>
            <Txt variant={TAG}>{t('story.nothingToFail')}</Txt>
          </View>
          <Transcript
            line={story.line}
            lipsync={player.lipsync}
            playing={storyPlaying}
            played={storyPlayed}
            onTap={onTapSegment}
          />
        </View>
      ) : null}
      {postcard && postcardShown && postcard.line ? (
        <PostcardCard
          from={asCharacter(postcard.from)}
          fromName={CAST[postcard.from].name}
          text={postcard.line.caption}
          gloss={postcard.line.gloss}
          postmark={`${t('story.postmark')}\n${postmarkDate}`}
          species={species}
          style={[styles.postcard, { top: y(300) }]}
        />
      ) : null}
      <View style={styles.bar}>
        <ListenBar
          paused={flow.paused}
          done={done}
          doneLabel={t('story.thanks', { name: roommateName })}
          onHoldToggle={onHold}
          onDone={onFinish}
        />
      </View>
    </BlurredBurrow>
  );
}

const TAG = { ...type.kicker, tracking: 0 };
const LINE = { ...type.caption, size: 16 };

/** The player: the roommate's face and the waveform filling as the story plays. */
function Player({
  lipsync,
  active,
  durationMs,
  species,
}: {
  lipsync: Lipsync;
  active: boolean;
  durationMs: number;
  species: PipSpecies;
}) {
  const { t } = useLocale();
  const played = useDerivedValue(() =>
    active ? playedFraction(Math.max(0, lipsync.streamMs.get()), durationMs) : 0,
  );
  return (
    <GlassView glass={glass.panel} radius={radii.notification} style={styles.player}>
      <RoundFace character="pip" species={species} size={52} border={outline.regular} />
      <Waveform
        bars={30}
        spread={22}
        height={34}
        played={played}
        label={t('story.a11y.waveform', {
          elapsed: formatDuration(0),
          duration: formatDuration(durationMs),
        })}
      />
    </GlassView>
  );
}

/** The story's lines, appearing as the caption reaches them; each one taps open its gloss. */
function Transcript({
  line,
  lipsync,
  playing,
  played,
  onTap,
}: {
  line: LineStep;
  lipsync: Lipsync;
  playing: boolean;
  played: boolean;
  onTap: (line: LineStep, segment: StorySegment, shown: boolean) => void;
}) {
  const heard = useHeardChars(lipsync, line.segments, playing);
  const shown = visibleSegments(line.segments, heard, played);
  return (
    <>
      {shown.map((s) => (
        <SegmentCard key={s.start} line={line} segment={s} onTap={onTap} />
      ))}
    </>
  );
}

/**
 * How far the caption has reached, as the start of the furthest segment begun: re-renders only
 * when a new segment starts.
 */
function useHeardChars(
  lipsync: Lipsync,
  segments: readonly StorySegment[],
  playing: boolean,
): number {
  const [heard, setHeard] = useState(0);
  const starts = useMemo(() => segments.map((s) => s.start), [segments]);
  useAnimatedReaction(
    () => {
      if (!playing) return -1;
      const at = lipsync.charIndex.get();
      let reached = 0;
      for (const s of starts) if (s < at) reached = s + 1;
      return reached;
    },
    (now, before) => {
      if (now >= 0 && now !== before) scheduleOnRN(setHeard, now);
    },
  );
  return heard;
}

function SegmentCard({
  line,
  segment,
  onTap,
}: {
  line: LineStep;
  segment: StorySegment;
  onTap: (line: LineStep, segment: StorySegment, shown: boolean) => void;
}) {
  const { t } = useLocale();
  const appear = useKeyframes(motion.screens.listIn);
  const [open, setOpen] = useState(false);
  const toggle = () => {
    const next = !open;
    setOpen(next);
    onTap(line, segment, next);
  };
  return (
    <Animated.View style={appear}>
      <Press
        onPress={segment.gloss ? toggle : undefined}
        haptic={segment.gloss ? 'selection' : null}
        accessibilityLabel={segment.en}
        {...(segment.gloss ? { accessibilityHint: t('call.tapForMeaning') } : {})}
        style={styles.segment}
      >
        <Txt variant={LINE}>{segment.en}</Txt>
        {open && segment.gloss ? (
          <Txt variant="glossStory" colour={colours.textGloss}>
            {segment.gloss}
          </Txt>
        ) : null}
      </Press>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  column: {
    position: 'absolute',
    left: layout.marginScreen,
    right: layout.marginScreen,
    gap: 10,
  },
  player: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingLeft: 10,
    paddingRight: 14,
  },
  tag: {
    alignSelf: 'flex-start',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: radii.note,
    borderWidth: outline.thin,
    borderColor: colours.outline,
    backgroundColor: colours.successSoft,
  },
  segment: {
    gap: 3,
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: radii.row,
    borderWidth: outline.thin,
    borderColor: colours.outline,
    backgroundColor: colours.surface,
  },
  postcard: { position: 'absolute', left: 20, right: 20 },
  bar: {
    position: 'absolute',
    left: layout.marginScreen,
    right: layout.marginScreen,
    bottom: layout.callBarBottom,
  },
});
