import type { PipSpecies } from '@yapling/art';
import { CAST } from '@yapling/story';
import { colours, glass, layout, motion, outline, radii, type } from '@yapling/theme';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View, type ScrollViewInstance } from 'react-native';
import Animated, { useDerivedValue } from 'react-native-reanimated';

import {
  GlassView,
  ListenBar,
  Press,
  Txt,
  useKeyframes,
  useLocale,
  useReduceMotion,
  useToast,
} from '../../ui';
import { useLipsyncClock, type Lipsync } from '../../voice';
import { WordObject } from '../burrow/art';
import { ListenPlayer } from './listen-player';
import type { GlossReveal } from './listening';
import { BlurredBurrow, ListenTop, PostcardCard, RoundFace, Waveform, useFrame } from './parts';
import { drawable } from './places';
import type { LineStep, ListenPlan } from './plan';
import {
  currentLine,
  formatDuration,
  isDone,
  lineEnded,
  playedFraction,
  seedEventFor,
  startFlow,
  togglePause,
  type SeedEvent,
  type StoryFlow,
} from './story-model';
import {
  reachedItems,
  speakerOf,
  storyDurationMs,
  storyLines,
  storyPlayedBeforeMs,
} from './week-listen-model';

/*
 * A later week's listening: Pip's story told line by line (each line appears as Pip starts it,
 * with its Vietnamese under it at Visitor, a tap away after), and the postcards of the day flying
 * in as their senders read them. A day with only a postcard (or a stack of them) shows just those.
 * "Nothing to fail"; the thank-you closes.
 */

export interface WeekListenScreenProps {
  readonly plan: ListenPlan;
  readonly roommateName: string;
  readonly species: PipSpecies;
  readonly postmarkDate: string;
  readonly glossReveal: GlossReveal;
  readonly onSeed: (event: SeedEvent) => void;
  readonly onFinish: () => void;
  readonly onBack: () => void;
}

export function WeekListenScreen({
  plan,
  roommateName,
  species,
  postmarkDate,
  glossReveal,
  onSeed,
  onFinish,
  onBack,
}: WeekListenScreenProps) {
  const { t } = useLocale();
  const toast = useToast();
  const reduce = useReduceMotion();
  const { y } = useFrame();
  const [flow, setFlow] = useState<StoryFlow>(() => startFlow(plan));
  const flowRef = useRef(flow);
  flowRef.current = flow;
  const [player] = useState(() => {
    const next = (lineId: string) => {
      const at = flowRef.current.step;
      const step = plan.steps[at];
      if (step?.kind === 'line' && step.lineId === lineId) setFlow((f) => lineEnded(plan, f, at));
    };
    // A line that can't play is skipped: its card still shows it whole.
    return new ListenPlayer({ ended: next, failed: next });
  });
  useLipsyncClock(player.lipsync);

  const line = currentLine(plan, flow);
  const done = isDone(plan, flow);
  const items = reachedItems(plan, flow);
  const story = storyLines(plan);
  const totalMs = storyDurationMs(plan);
  const beforeMs = storyPlayedBeforeMs(plan, flow.step);
  const storyPlaying = line !== null && story.some((l) => l.lineId === line.lineId);
  const speaker = speakerOf(plan);
  const storyPlayed = done || (!storyPlaying && totalMs > 0 && beforeMs >= totalMs);
  const cardCount = plan.steps.filter((s) => s.kind === 'ui' && s.ui.type === 'postcard').length;

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

  // Each new line or card scrolls into view.
  const scroll = useRef<ScrollViewInstance>(null);
  useEffect(() => {
    const timer = setTimeout(() => scroll.current?.scrollToEnd({ animated: !reduce }), 120);
    return () => clearTimeout(timer);
  }, [items.length, reduce]);

  const onHold = useCallback(() => {
    const next = togglePause(flowRef.current);
    setFlow(next);
    void (next.paused ? player.pause() : player.resume());
  }, [player]);

  const seed = (l: LineStep) => {
    onSeed(seedEventFor(plan, l, { en: l.caption }));
    toast({ text: t('call.seedDropped'), art: <WordObject id="seed" size={33} /> });
  };

  const lastLine = [...items].reverse().find((i) => i.kind === 'line');
  const speakerName = speaker === 'pip' ? roommateName : CAST[speaker].name;
  const place =
    story.length > 0
      ? t('story.place.voiceStory', { duration: formatDuration(totalMs) })
      : cardCount > 1
        ? t('story.place.postcards', { count: cardCount })
        : t('story.place.postcard');

  return (
    <BlurredBurrow>
      <ListenTop
        name={speakerName}
        place={place}
        face={<RoundFace character={drawable(speaker)} species={species} size={30} />}
        onBack={onBack}
      />
      <ScrollView
        ref={scroll}
        style={[styles.scroll, { top: y(100) }]}
        contentContainerStyle={styles.column}
        showsVerticalScrollIndicator={false}
      >
        {story.length > 0 ? (
          <>
            <Player
              lipsync={player.lipsync}
              active={storyPlaying}
              beforeMs={beforeMs}
              totalMs={totalMs}
              played={storyPlayed}
              species={species}
            />
            <View style={styles.tag}>
              <Txt variant={TAG}>{t('story.nothingToFail')}</Txt>
            </View>
          </>
        ) : null}
        {items.map((item, i) =>
          item.kind === 'line' ? (
            <LineCard
              key={item.step}
              line={item.line}
              reveal={glossReveal}
              showHint={item === lastLine}
              onOpen={() => seed(item.line)}
            />
          ) : item.line ? (
            <PostcardCard
              key={item.step}
              from={drawable(item.from)}
              fromName={CAST[item.from].name}
              text={item.line.caption}
              gloss={item.line.gloss}
              postmark={`${t('story.postmark')}\n${postmarkDate}`}
              species={species}
              glossReveal={glossReveal}
              tilt={i % 2 === 0 ? -3 : 2}
              style={styles.postcard}
              onGloss={() => item.line && seed(item.line)}
            />
          ) : null,
        )}
      </ScrollView>
      <View style={styles.bar}>
        <ListenBar
          paused={flow.paused}
          done={done}
          doneLabel={t('story.thanks', { name: speakerName })}
          onHoldToggle={onHold}
          onDone={onFinish}
        />
      </View>
    </BlurredBurrow>
  );
}

const TAG = { ...type.kicker, tracking: 0 };
const LINE = { ...type.caption, size: 16 };

/** The player: the roommate's face and the waveform filling over the whole story. */
function Player({
  lipsync,
  active,
  beforeMs,
  totalMs,
  played,
  species,
}: {
  lipsync: Lipsync;
  active: boolean;
  beforeMs: number;
  totalMs: number;
  played: boolean;
  species: PipSpecies;
}) {
  const { t } = useLocale();
  const fraction = useDerivedValue(() =>
    played
      ? 1
      : playedFraction(beforeMs + (active ? Math.max(0, lipsync.streamMs.get()) : 0), totalMs),
  );
  return (
    <GlassView glass={glass.panel} radius={radii.notification} style={styles.player}>
      <RoundFace character="pip" species={species} size={52} border={outline.regular} />
      <Waveform
        bars={30}
        spread={22}
        height={34}
        played={fraction}
        label={t('story.a11y.waveform', {
          elapsed: formatDuration(played ? totalMs : beforeMs),
          duration: formatDuration(totalMs),
        })}
      />
    </GlassView>
  );
}

/** One line of the story: its Vietnamese under it at Visitor, a tap away from Newcomer. */
function LineCard({
  line,
  reveal,
  showHint,
  onOpen,
}: {
  line: LineStep;
  reveal: GlossReveal;
  showHint: boolean;
  onOpen: () => void;
}) {
  const { t } = useLocale();
  const appear = useKeyframes(motion.screens.listIn);
  const [open, setOpen] = useState(false);
  const tappable = line.gloss !== null && (reveal === 'marked' || reveal === 'on_tap');
  const shown = line.gloss !== null && (reveal === 'shown' || open);
  const toggle = () => {
    if (!open) onOpen();
    setOpen(!open);
  };
  return (
    <Animated.View style={appear}>
      <Press
        onPress={tappable ? toggle : undefined}
        haptic={tappable ? 'selection' : null}
        accessibilityLabel={shown && line.gloss ? `${line.caption}. ${line.gloss}` : line.caption}
        {...(tappable ? { accessibilityHint: t('call.tapForMeaning') } : {})}
        style={styles.segment}
      >
        <Txt variant={LINE}>{line.caption}</Txt>
        {shown && line.gloss ? (
          <Txt variant="glossStory" colour={colours.textGloss}>
            {line.gloss}
          </Txt>
        ) : reveal === 'marked' && tappable && showHint ? (
          <Txt variant="labelSmall" colour={colours.textMuted}>
            {t('story.tapForMeaning')}
          </Txt>
        ) : null}
      </Press>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  scroll: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: layout.callBarBottom + 92,
  },
  column: { paddingHorizontal: layout.marginScreen, paddingTop: 8, paddingBottom: 24, gap: 10 },
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
  postcard: { marginHorizontal: 8, marginVertical: 6 },
  bar: {
    position: 'absolute',
    left: layout.marginScreen,
    right: layout.marginScreen,
    bottom: layout.callBarBottom,
  },
});
