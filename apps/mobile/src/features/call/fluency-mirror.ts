import type { CharacterId, Stage } from '@yapling/contracts';
import { fluencyDetail } from '@yapling/domain';
import { stageValue, type Scene } from '@yapling/story';

import { answerOf, timedBeats, type HeardTurn } from './tracker';

/*
 * Pass it on: one story, three listeners, less time each round. The strip shows who listens and
 * for how long; after each round the fluency mirror shows Flow, Pace and Pauses for every round so
 * far, measured from the heard turns' word timings (never estimated).
 */

export interface Round {
  readonly beatId: string;
  readonly listener: CharacterId;
  readonly seconds: number;
}

export interface MirrorRow {
  readonly round: number;
  /** Seconds without stopping (mean length of run). */
  readonly flowSeconds: number;
  readonly paceWpm: number;
  readonly pausesPerMin: number;
  /** The Flow bar's fill, 0–1, against the best round shown. */
  readonly share: number;
}

export interface Mirror {
  readonly rows: readonly MirrorRow[];
  /** The last round flowed better than the first: say so (only when it's true). */
  readonly smoother: boolean;
}

/** The scene's timed rounds with their listener and seconds at this stage. */
export function roundsOf(scene: Scene, stage: Stage): readonly Round[] {
  return timedBeats(scene).flatMap((beat) => {
    const answer = answerOf(beat);
    if (!answer?.timer) return [];
    return [
      { beatId: beat.id, listener: answer.listener, seconds: stageValue(answer.timer, stage) },
    ];
  });
}

/** The mirror after round `upTo` (1-based), from the turns heard in each round. */
export function mirrorFor(
  rounds: readonly Round[],
  heard: readonly HeardTurn[],
  upTo: number,
): Mirror {
  const shown = rounds.slice(0, Math.max(0, upTo));
  const details = shown.map((round) =>
    fluencyDetail(heard.filter((h) => h.beatId === round.beatId).map((h) => h.words)),
  );
  const best = Math.max(0, ...details.map((d) => d.flowSeconds));
  const rows = details.map((d, i) => ({
    round: i + 1,
    flowSeconds: d.flowSeconds,
    paceWpm: d.paceWpm,
    pausesPerMin: d.pausesPerMin,
    share: best > 0 ? d.flowSeconds / best : 0,
  }));
  const first = rows[0];
  const last = rows[rows.length - 1];
  return {
    rows,
    smoother:
      rows.length >= 3 && first !== undefined && last !== undefined
        ? last.flowSeconds > first.flowSeconds
        : false,
  };
}

/** Which round the strip highlights: the round being told, or the one just mirrored. */
export function currentRound(
  rounds: readonly Round[],
  beatId: string | null,
  mirrorRound: number | null,
): number {
  const index = rounds.findIndex((r) => r.beatId === beatId);
  if (index >= 0) return index + 1;
  if (mirrorRound !== null) return Math.min(rounds.length, mirrorRound + 1);
  return 1;
}
