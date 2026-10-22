import { motion } from '@yapling/theme';
import type { ReactNode } from 'react';
import Animated from 'react-native-reanimated';

import { useKeyframes } from '../../ui/motion/play';
import { ToastCard } from '../../ui/toast';

/**
 * A short retry tip just over the call bar ("Hold the button while you talk"): the toast's card
 * with the roommate's face, rising in like the call's pills (a fade under Reduce Motion). It stays
 * until the learner presses again or a line plays.
 */
export function CallTip({ text, art }: { text: string; art: ReactNode }) {
  const rise = useKeyframes(motion.call.phonePill);
  return (
    <Animated.View
      accessible
      accessibilityLabel={text}
      accessibilityLiveRegion="polite"
      style={[{ alignSelf: 'center' }, rise]}
    >
      <ToastCard text={text} art={art} />
    </Animated.View>
  );
}
