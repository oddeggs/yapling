import { useMemo, type ReactNode } from 'react';
import { useDerivedValue } from 'react-native-reanimated';

import { captionWords } from '../../ui/caption';
import type { CaptionClock } from '../../ui/speech-bubble';
import type { Lipsync } from '../../voice/lipsync';

/*
 * The bubble's caption on the voice's own clock: the lipsync clock counts how many of the line's
 * characters are audible (from the TTS alignment or the recorded line's timing), and a word shows
 * as said from its first audible character. Never a guessed reading speed.
 */

/** Past any line's length: everything said. */
const ALL = Number.MAX_SAFE_INTEGER;

/** The caption's words, each "starting" at its first character's position (1-based). */
export function wordsByCharacter(text: string) {
  return captionWords(
    text,
    Array.from({ length: text.length }, (_, i) => i + 1),
  );
}

export function BubbleCaption({
  lipsync,
  streamId,
  playing,
  text,
  children,
}: {
  lipsync: Lipsync | null;
  streamId: number;
  playing: boolean;
  text: string;
  children: (caption: CaptionClock | null) => ReactNode;
}) {
  const words = useMemo(() => wordsByCharacter(text), [text]);
  const charIndex = lipsync?.charIndex;
  const playingStream = lipsync?.streamId;
  const audible = useDerivedValue(() => {
    if (!charIndex || !playingStream) return ALL;
    // Only this line's clock moves its caption; until the clock reaches it, nothing is said yet.
    // Once the line is done the bubble drops the clock and shows it whole.
    return playingStream.get() === streamId ? charIndex.get() : 0;
  });
  const caption = useMemo<CaptionClock>(() => ({ words, seconds: audible }), [words, audible]);
  return children(playing && lipsync ? caption : null);
}
