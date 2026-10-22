import type { PipSpecies } from '@yapling/art';
import {
  colours,
  glass,
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

import { useLocale } from '../../ui/locale';
import { transitionTo, useKeyframes } from '../../ui/motion/play';
import { useReduceMotion } from '../../ui/motion/reduce-motion';
import { TimerRing, useCountdown } from '../../ui/rings';
import { GlassView, Sticker } from '../../ui/surface';
import { Txt } from '../../ui/text';
import type { ViewStyleProp } from '../../ui/style';
import { CritterFace } from './call-art';
import type { Mirror } from './fluency-mirror';
import type { RoundView, TimerView } from './view-model';

/*
 * Timed turns: the ring counting the round down (it starts when the learner starts talking and
 * ends their turn at zero, at their next pause), the strip of Pass it on's listeners, and the
 * fluency mirror after each round.
 */

export function CallTimer({
  timer,
  onDone,
  style,
}: {
  timer: TimerView;
  onDone: () => void;
  style?: ViewStyleProp;
}) {
  const { t } = useLocale();
  const remaining = useCountdown(timer.total, timer.running, onDone);
  return (
    <View style={style}>
      <TimerRing
        total={timer.total}
        remaining={remaining}
        running={timer.running}
        accessibilityLabel={t('call.seconds', { count: timer.total })}
      />
    </View>
  );
}

const ringColour: Record<RoundView['state'], string> = {
  done: colours.success,
  now: colours.accent,
  next: colours.lineArt,
};
const faceFill: Record<RoundView['state'], string> = {
  done: colours.successSoft,
  now: colours.accentSoft,
  next: colours.surface,
};

/** Pip 90s · Linh 60s · Bea 45s: who listens next, and for how long. */
export function RoundsStrip({
  rounds,
  species,
  style,
}: {
  rounds: readonly RoundView[];
  species: PipSpecies;
  style?: ViewStyleProp;
}) {
  const { t } = useLocale();
  return (
    <GlassView
      glass={glass.panel}
      radius={radii.panel}
      style={[
        {
          flexDirection: 'row',
          justifyContent: 'space-between',
          paddingVertical: 8,
          paddingHorizontal: 14,
        },
        style,
      ]}
    >
      {rounds.map((r) => (
        <View
          key={r.listener}
          accessible
          accessibilityLabel={t('call.seconds', { count: r.seconds })}
          accessibilityState={{ selected: r.state === 'now' }}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 7,
            opacity: r.state === 'next' ? 0.55 : 1,
          }}
        >
          <View
            style={{
              width: 34,
              height: 34,
              borderRadius: 17,
              overflow: 'hidden',
              borderWidth: outline.regular,
              borderColor: colours.outline,
              boxShadow: `0 0 0 3px ${ringColour[r.state]}`,
            }}
          >
            <CritterFace
              character={r.listener}
              species={species}
              size={34 - 2 * outline.regular}
              mood={r.state === 'done' ? 'happy' : 'listen'}
              fill={faceFill[r.state]}
            />
          </View>
          <Txt variant={faceLabel}>{t('call.seconds', { count: r.seconds })}</Txt>
        </View>
      ))}
    </GlassView>
  );
}

/** A round's seconds beside its listener: 15, ExtraBold. */
const faceLabel = { ...type.buttonPair, size: 15 } as const;

/** The fluency mirror: each round's Flow bar, with its Pace and Pauses. */
export function MirrorCard({ mirror, style }: { mirror: Mirror; style?: ViewStyleProp }) {
  const { t } = useLocale();
  const pop = useKeyframes(motion.call.sticker);
  const last = mirror.rows.length;
  return (
    <Animated.View style={[style, pop]}>
      <Sticker
        shadow={stickerShadows.card}
        radius={radii.panel}
        outline={outline.bold}
        fill={colours.surface}
        contentStyle={{ padding: 16, gap: 10 }}
      >
        <Txt variant="cardTitle">{t('call.mirror.title')}</Txt>
        {mirror.rows.map((row) => (
          <View
            key={row.round}
            accessible
            accessibilityLabel={[
              t('call.mirror.round', { round: row.round }),
              t('call.mirror.flow', { seconds: row.flowSeconds }),
              t('call.mirror.pace', { wpm: row.paceWpm }),
              t('call.mirror.pauses', { pauses: row.pausesPerMin }),
            ].join(', ')}
            style={{ gap: 4 }}
          >
            {/* The numbers sit beside the round; longer copy (Vietnamese) wraps under it. */}
            <View
              style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                justifyContent: 'space-between',
                columnGap: 10,
              }}
            >
              <Txt variant={rowType}>{t('call.mirror.round', { round: row.round })}</Txt>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: 10 }}>
                <Txt variant={rowType} colour={colours.textBody}>
                  {t('call.mirror.flow', { seconds: row.flowSeconds })}
                </Txt>
                <Txt variant={rowType} colour={colours.textBody}>
                  {t('call.mirror.pace', { wpm: row.paceWpm })}
                </Txt>
                <Txt variant={rowType} colour={colours.textBody}>
                  {t('call.mirror.pauses', { pauses: row.pausesPerMin })}
                </Txt>
              </View>
            </View>
            <FlowBar share={row.share} best={row.round === 3 && last === 3} />
          </View>
        ))}
        <Txt variant={{ ...rowType, weight: 700 }} colour={colours.textMuted}>
          {mirror.smoother ? t('call.mirror.smoother') : t('call.mirror.flowMeans')}
        </Txt>
      </Sticker>
    </Animated.View>
  );
}

/** A mirror row's numbers: 12.5, ExtraBold. */
const rowType = type.chip;

function FlowBar({ share, best }: { share: number; best: boolean }) {
  const reduce = useReduceMotion();
  const fill = useSharedValue(0);
  useEffect(() => {
    fill.set(reduce ? share : transitionTo(share, motion.transitions.barFill));
  }, [share, reduce, fill]);
  const style = useAnimatedStyle(() => ({ width: `${fill.get() * 100}%` }));
  return (
    <View
      style={{
        height: 12,
        borderRadius: 6,
        backgroundColor: colours.divider,
        borderWidth: outline.thin,
        borderColor: colours.outline,
        overflow: 'hidden',
      }}
    >
      <Animated.View
        style={[{ height: '100%', backgroundColor: best ? palette.mint : palette.lilac }, style]}
      />
    </View>
  );
}
