import type { CharacterId } from '@yapling/contracts';
import { findScene } from '@yapling/story';

import type { LineStep, ListenPlan } from './plan';
import type { StoryFlow } from './story-model';

/*
 * What a later week's listening screen shows as it plays: Pip's story told line by line (each line
 * appears as Pip starts it), and the postcards that come with it, each flying in as its sender
 * starts reading. Pure, so the order is tested without audio.
 */

export type ListenItem =
  | { readonly kind: 'line'; readonly step: number; readonly line: LineStep }
  | {
      readonly kind: 'postcard';
      readonly step: number;
      readonly from: CharacterId;
      readonly line: LineStep | null;
    };

const isStoryLine = (line: LineStep): boolean => findScene(line.scene)?.kind === 'story';

/** Every item of the plan in order: the story's lines and the postcards (with the line read). */
export function listenItems(plan: ListenPlan): readonly ListenItem[] {
  const items: ListenItem[] = [];
  plan.steps.forEach((step, i) => {
    if (step.kind === 'ui' && step.ui.type === 'postcard') {
      const next = plan.steps[i + 1];
      items.push({
        kind: 'postcard',
        step: i,
        from: step.ui.from,
        line: next?.kind === 'line' ? next : null,
      });
    } else if (step.kind === 'line' && isStoryLine(step)) {
      items.push({ kind: 'line', step: i, line: step });
    }
  });
  return items;
}

/** The items reached so far: a line once it starts playing, a postcard once its card is passed. */
export function reachedItems(plan: ListenPlan, flow: StoryFlow): readonly ListenItem[] {
  return listenItems(plan).filter((item) =>
    item.kind === 'line' ? item.step <= flow.step : item.step < flow.step,
  );
}

/** The story's recorded lines, in order. */
export const storyLines = (plan: ListenPlan): readonly LineStep[] =>
  plan.steps.filter((s): s is LineStep => s.kind === 'line' && isStoryLine(s));

/** How long the whole story plays, in milliseconds. */
export const storyDurationMs = (plan: ListenPlan): number =>
  storyLines(plan).reduce((sum, l) => sum + (l.durationMs ?? 0), 0);

/** How much of the story played before the line at `step` started, in milliseconds. */
export const storyPlayedBeforeMs = (plan: ListenPlan, step: number): number =>
  plan.steps
    .slice(0, step)
    .reduce((sum, s) => sum + (s.kind === 'line' && isStoryLine(s) ? (s.durationMs ?? 0) : 0), 0);

/** Who the screen's pill names: the roommate for a story, else the first postcard's sender. */
export function speakerOf(plan: ListenPlan): CharacterId {
  if (storyLines(plan).length > 0) return 'pip';
  const card = listenItems(plan).find((i) => i.kind === 'postcard');
  return card?.kind === 'postcard' ? card.from : 'pip';
}
