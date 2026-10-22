import type { CharacterId } from '@yapling/contracts';

import type { CaptionLine } from '../../voice/call-state';
import type { HeardTurn } from './tracker';

/*
 * What was said in the call so far, so a line the learner missed can be read again: every
 * character line once it has been on screen (a queued line that never played is never listed),
 * grouped by the learner's turns. A turn's lines page in the bubble ("1 of 3"); the whole call
 * lists in the "What was said" sheet with the learner's own turns between them. Pure.
 */

/** Streams the phone plays on its own (a replayed line): never part of the call's history. */
export const LOCAL_STREAMS_FROM = 0xffff_0000;

export interface SpokenLine {
  readonly streamId: number;
  readonly speaker: CharacterId;
  /** The caption as shown (a live line's grows while its words arrive). */
  readonly text: string;
  /** The story's line for a recorded one: its written gloss and its audio. */
  readonly lineId: string | null;
  /** How many learner turns had been heard when it was first shown: one turn's lines share it. */
  readonly turn: number;
}

export interface ShownContext {
  /** Recorded lines by stream. */
  readonly recorded: Readonly<Record<number, string>>;
  /** Recorded reaction clips ("Ooh,"): covered by the thinking dots, never listed. */
  readonly reactions: readonly number[];
  /** Learner turns heard so far. */
  readonly heardCount: number;
}

/** A caption came on screen or grew: its line is added, or its text brought up to date. */
export function noteShown(
  lines: readonly SpokenLine[],
  caption: CaptionLine,
  ctx: ShownContext,
): readonly SpokenLine[] {
  const { streamId } = caption;
  if (streamId >= LOCAL_STREAMS_FROM || ctx.reactions.includes(streamId)) return lines;
  const at = lines.findIndex((l) => l.streamId === streamId);
  if (at >= 0) {
    const was = lines[at];
    if (!was || was.text === caption.text || caption.text.trim() === '') return lines;
    const next = lines.slice();
    next[at] = { ...was, text: caption.text };
    return next;
  }
  return [
    ...lines,
    {
      streamId,
      speaker: caption.character,
      text: caption.text,
      lineId: ctx.recorded[streamId] ?? null,
      turn: ctx.heardCount,
    },
  ];
}

/** The lines that have words, in the order they were said. */
export const saidLines = (lines: readonly SpokenLine[]): readonly SpokenLine[] =>
  lines.filter((l) => l.text.trim() !== '');

export interface TurnPage {
  /** 0-based place of the line among its turn's lines. */
  readonly index: number;
  readonly count: number;
  /** The streams one back and one on, within the turn. */
  readonly prev: number | null;
  readonly next: number | null;
}

/** Where a line sits among the lines of its turn; null when it isn't listed. */
export function turnPage(lines: readonly SpokenLine[], streamId: number): TurnPage | null {
  const said = saidLines(lines);
  const line = said.find((l) => l.streamId === streamId);
  if (!line) return null;
  const turn = said.filter((l) => l.turn === line.turn);
  const index = turn.findIndex((l) => l.streamId === streamId);
  return {
    index,
    count: turn.length,
    prev: turn[index - 1]?.streamId ?? null,
    next: turn[index + 1]?.streamId ?? null,
  };
}

export type TranscriptEntry =
  | { readonly kind: 'line'; readonly line: SpokenLine }
  | { readonly kind: 'you'; readonly turn: number; readonly text: string };

/**
 * The call as the "What was said" sheet lists it: the lines of each turn, then what the learner
 * said in answer. A turn with no words heard is left out.
 */
export function transcriptOf(
  lines: readonly SpokenLine[],
  heard: readonly HeardTurn[],
): readonly TranscriptEntry[] {
  const said = saidLines(lines);
  const out: TranscriptEntry[] = [];
  const turns = Math.max(heard.length, ...said.map((l) => l.turn + 1), 0);
  for (let turn = 0; turn <= turns; turn++) {
    for (const line of said) if (line.turn === turn) out.push({ kind: 'line', line });
    const you = heard[turn];
    if (you && you.text.trim() !== '') out.push({ kind: 'you', turn, text: you.text });
  }
  return out;
}
