import { useCallback, useEffect, useRef, useState } from 'react';
import { useDerivedValue, type SharedValue } from 'react-native-reanimated';

import { useLipsyncClock } from '../../voice';
import { ListenPlayer } from '../story/listen-player';

/*
 * A recorded line played on the phone for the burrow's scenes (Linh at the door, the welcome
 * back): the voice engine's bundled lines on a playback-only session, with the caption clock on
 * the UI thread. No call and no mic.
 */

export type LinePlayback = 'waiting' | 'playing' | 'ended';

export interface LinePlayer {
  /** Plays a recorded line from its start. */
  readonly play: (lineId: string) => void;
  /** Seconds into the playing line, for its caption; below zero before it starts. */
  readonly seconds: SharedValue<number>;
  readonly playback: LinePlayback;
}

export function useLinePlayer(): LinePlayer {
  const [playback, setPlayback] = useState<LinePlayback>('waiting');
  const [player] = useState(
    () =>
      new ListenPlayer({
        ended: () => setPlayback('ended'),
        // A line that can't play is shown whole, and the scene goes on.
        failed: () => setPlayback('ended'),
      }),
  );
  useLipsyncClock(player.lipsync);
  // One audio session for the scene, started once.
  const started = useRef<Promise<void> | null>(null);
  const start = useCallback(() => (started.current ??= player.start()), [player]);
  useEffect(() => {
    start().catch(() => setPlayback('ended'));
    return () => void player.dispose();
  }, [player, start]);
  const play = useCallback(
    (lineId: string) => {
      setPlayback('playing');
      void start()
        .then(() => player.play(lineId))
        .catch(() => setPlayback('ended'));
    },
    [player, start],
  );
  const streamMs = player.lipsync.streamMs;
  const seconds = useDerivedValue(() => (streamMs.value < 0 ? -1 : streamMs.value / 1000));
  return { play, seconds, playback };
}
