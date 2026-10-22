import type { FirstLanguage } from '@yapling/contracts';
import type { Letter, LetterLine } from '@yapling/story';
import { curves, motion, type Transition } from '@yapling/theme';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';

import { useLocale } from '../../ui/locale';
import { transitionTo } from '../../ui/motion/play';
import { useReduceMotion } from '../../ui/motion/reduce-motion';
import { Press } from '../../ui/press';
import { LetterCard } from './call-cards';
import {
  collides,
  homeFor,
  letterBox,
  peekScale,
  peekSpot,
  type BubbleBand,
  type LetterFrame,
  type LetterHome,
} from './letter-place';
import type { LetterSpots } from './scene-layout';

/*
 * The letter on the call's frame. It flies in open where the bubble isn't, stays while it is
 * read, and folds into the counter's corner as soon as a bubble needs its place; a tap on the
 * tucked letter opens it again, in whichever home is free then.
 */

/** Folding into the corner and back: paper's own curve, at the whisper's pace. */
const FOLD: Transition = { durationMs: motion.call.whisper.durationMs, easing: curves.fly };

/** How far past the tucked letter a tap still opens it, to reach 44 points. */
const PEEK_SLOP = 14;

export function CallLetter({
  letter,
  language,
  onLineGloss,
  spots,
  frame,
  band,
}: {
  letter: Letter;
  language: FirstLanguage;
  onLineGloss: (line: LetterLine) => void;
  spots: LetterSpots;
  frame: LetterFrame;
  /** The band of the bubble on screen; null when there is none. */
  band: BubbleBand | null;
}) {
  const { t } = useLocale();
  const reduce = useReduceMotion();
  const [home, setHome] = useState<LetterHome>(() => homeFor(band));
  const [open, setOpen] = useState(true);
  const [height, setHeight] = useState(0);

  // A bubble coming to the letter's home: the letter gives way.
  useEffect(() => {
    if (open && collides(home, band)) setOpen(false);
  }, [band, home, open]);

  const box = letterBox(spots, home, frame);
  const peek = peekSpot(spots, frame.k);
  const scale = peekScale(spots, box.width);
  const dx = peek.left - box.left;
  const dy = peek.top - box.top;

  const fold = useSharedValue(0);
  useEffect(() => {
    const to = open ? 0 : 1;
    fold.set(reduce ? to : transitionTo(to, FOLD));
  }, [open, reduce, fold]);
  const style = useAnimatedStyle(() => {
    const f = fold.get();
    return {
      transform: [{ translateX: dx * f }, { translateY: dy * f }, { scale: 1 + (scale - 1) * f }],
    };
  }, [dx, dy, scale]);

  return (
    <>
      <Animated.View
        style={[
          { position: 'absolute', top: box.top, left: box.left, width: box.width },
          { transformOrigin: 'left top' },
          style,
        ]}
        onLayout={(e) => setHeight(e.nativeEvent.layout.height)}
      >
        <LetterCard
          letter={letter}
          language={language}
          onLineGloss={onLineGloss}
          maxHeight={box.maxHeight}
          interactive={open}
          onTuck={() => setOpen(false)}
        />
      </Animated.View>
      {open ? null : (
        <Press
          onPress={() => {
            setHome(homeFor(band));
            setOpen(true);
          }}
          haptic="selection"
          hitSlop={PEEK_SLOP}
          accessibilityRole="button"
          accessibilityLabel={t('call.a11y.letter')}
          style={{
            position: 'absolute',
            top: peek.top,
            left: peek.left,
            width: spots.peekWidth,
            height: Math.max(spots.peekWidth / 2, height * scale),
          }}
        >
          <View />
        </Press>
      )}
    </>
  );
}
