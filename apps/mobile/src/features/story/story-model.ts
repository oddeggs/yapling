import type { CharacterId, Id } from '@yapling/contracts';

import type { LineStep, ListenPlan, StorySegment } from './plan';

/*
 * The listening screen's state: which step of the plan is on, what the learner has heard of the
 * playing line, and what that shows (the story's lines appearing as Pip reaches them, the
 * waveform filling, the postcard flying in). Pure, so the flow is tested without audio.
 */

export interface StoryFlow {
  /** The step playing now; `steps.length` once everything has played. */
  readonly step: number;
  /** "Chờ chút": the audio waits where it is. */
  readonly paused: boolean;
}

export const isDone = (plan: ListenPlan, flow: StoryFlow): boolean =>
  flow.step >= plan.steps.length;

/** Cards don't wait: moves past them to the next line (or the end). */
function settle(plan: ListenPlan, step: number): number {
  let i = step;
  while (i < plan.steps.length && plan.steps[i]?.kind === 'ui') i++;
  return i;
}

export const startFlow = (plan: ListenPlan): StoryFlow => ({
  step: settle(plan, 0),
  paused: false,
});

/** The line at `step` finished playing. A late or repeated end changes nothing. */
export function lineEnded(plan: ListenPlan, flow: StoryFlow, step: number): StoryFlow {
  if (step !== flow.step || isDone(plan, flow)) return flow;
  return { ...flow, step: settle(plan, step + 1) };
}

export const togglePause = (flow: StoryFlow): StoryFlow => ({ ...flow, paused: !flow.paused });

/** The line playing now, if any. */
export function currentLine(plan: ListenPlan, flow: StoryFlow): LineStep | null {
  const s = plan.steps[flow.step];
  return s?.kind === 'line' ? s : null;
}

/** Whether a card (the postcard) has been reached: once shown, it stays. */
export function cardShown(plan: ListenPlan, flow: StoryFlow, type: 'postcard' | 'voicemail') {
  return plan.steps.some((s, i) => i < flow.step && s.kind === 'ui' && s.ui.type === type);
}

/** Who sends the postcard the flow has reached, with its line. */
export function postcardOf(
  plan: ListenPlan,
): { readonly from: CharacterId; readonly line: LineStep | null; readonly index: number } | null {
  const i = plan.steps.findIndex((s) => s.kind === 'ui' && s.ui.type === 'postcard');
  const card = plan.steps[i];
  if (!card || card.kind !== 'ui' || card.ui.type !== 'postcard') return null;
  const next = plan.steps.slice(i + 1).find((s): s is LineStep => s.kind === 'line');
  return { from: card.ui.from, line: next ?? null, index: i };
}

/** The story line: the plan's first line, which the player and the transcript follow. */
export function storyLine(
  plan: ListenPlan,
): { readonly line: LineStep; readonly index: number } | null {
  const index = plan.steps.findIndex((s) => s.kind === 'line');
  const line = plan.steps[index];
  return line?.kind === 'line' ? { line, index } : null;
}

/**
 * The story's segments shown so far: each appears once the caption reaches it. Before the line
 * starts only the first shows; once it has played, all of them.
 */
export function visibleSegments(
  segments: readonly StorySegment[],
  heardChars: number,
  played: boolean,
): readonly StorySegment[] {
  if (played) return segments;
  const shown = segments.filter((s, i) => i === 0 || s.start < heardChars);
  return shown;
}

/** The waveform's played fraction, 0–1 (read on the UI thread). */
export function playedFraction(heardMs: number, durationMs: number | null): number {
  'worklet';
  return durationMs && durationMs > 0 ? Math.max(0, Math.min(1, heardMs / durationMs)) : 0;
}

/** The prototype's waveform: `n` bars of 6 + (i × 37 mod `spread`) points. */
export const waveBars = (n: number, spread: number): readonly number[] =>
  Array.from({ length: n }, (_, i) => 6 + ((i * 37) % spread));

/** `0:29` from milliseconds, rounded to the nearest second. */
export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

/**
 * What tapping a line for its gloss drops in the burrow: the target phrase it carries, when it
 * carries one (a seed packet), or just the line (a gloss reveal, which the learning model may
 * count as a signal of difficulty, never as a score).
 */
export interface SeedEvent {
  readonly scene: Id;
  readonly lineId: Id;
  readonly text: string;
  /** The target phrase met by the tap, or null when the line holds none. */
  readonly phraseId: Id | null;
  readonly phrase: string | null;
}

const normal = (s: string) =>
  s
    .toLowerCase()
    .replace(/[’]/g, "'")
    .replace(/[^a-z0-9' ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/** The seed event for a tapped segment of `line`. */
export function seedEventFor(
  plan: ListenPlan,
  line: LineStep,
  segment: Pick<StorySegment, 'en'>,
): SeedEvent {
  const said = ` ${normal(segment.en)} `;
  const phrase = plan.phrases.find((p) => said.includes(` ${normal(p.en)} `)) ?? null;
  return {
    scene: line.scene,
    lineId: line.lineId,
    text: segment.en,
    phraseId: phrase?.id ?? null,
    phrase: phrase?.en ?? null,
  };
}
