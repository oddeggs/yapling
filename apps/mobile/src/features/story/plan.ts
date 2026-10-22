import type { CharacterId, FirstLanguage, Id } from '@yapling/contracts';
import {
  EPISODES,
  findPhrase,
  findScene,
  getLine,
  glossFor,
  type Episode,
  type Scene,
  type UiSpec,
} from '@yapling/story';

/*
 * What a listening screen plays: a between-call scene (Pip's voice story, a postcard) and the
 * scenes that arrive with it on the same day of the week, as one run of recorded lines and the
 * cards between them. Nothing here waits on the learner; there is nothing to fail.
 */

/** A part of a long line the learner can tap for its gloss, with where it starts in the caption. */
export interface StorySegment {
  readonly en: string;
  readonly gloss: string | null;
  /** Index of the segment's first character in the line's caption. */
  readonly start: number;
}

export interface LineStep {
  readonly kind: 'line';
  readonly scene: Id;
  readonly lineId: Id;
  readonly character: CharacterId;
  readonly caption: string;
  readonly gloss: string | null;
  readonly durationMs: number | null;
  readonly segments: readonly StorySegment[];
}

export interface UiStep {
  readonly kind: 'ui';
  readonly scene: Id;
  readonly ui: UiSpec;
}

export type ListenStep = LineStep | UiStep;

export interface ListenPlan {
  readonly episode: Episode;
  /** The scenes played, in order: the first is the one the route named. */
  readonly scenes: readonly Scene[];
  readonly steps: readonly ListenStep[];
  /** The target phrases the scenes seed, as a tapped line can drop them in the burrow. */
  readonly phrases: readonly { readonly id: Id; readonly en: string }[];
}

const LISTEN_KINDS: readonly Scene['kind'][] = ['story', 'postcard'];

/** The episode a scene belongs to. */
export const episodeOf = (sceneId: Id): Episode | undefined =>
  EPISODES.find((e) => e.scenes.some((s) => s.id === sceneId));

/** A line's caption split into its tap-to-gloss segments (the whole line when it has none). */
export function segmentsOf(lineId: Id, language: FirstLanguage): readonly StorySegment[] {
  const line = getLine(lineId);
  if (line.segments.length === 0) {
    return [{ en: line.caption, gloss: glossFor(line.glosses, language), start: 0 }];
  }
  let cursor = 0;
  return line.segments.map((s) => {
    const found = line.caption.indexOf(s.en, cursor);
    const start = found === -1 ? cursor : found;
    cursor = start + s.en.length;
    return { en: s.en, gloss: glossFor(s.glosses, language), start };
  });
}

/**
 * The plan for a listening route: the scene, then the episode's other story and postcard scenes
 * on the same day of the week. Null for a scene that isn't played on the phone.
 */
export function listenPlan(sceneId: Id, language: FirstLanguage): ListenPlan | null {
  const first = findScene(sceneId);
  const episode = episodeOf(sceneId);
  if (!first || !episode || !LISTEN_KINDS.includes(first.kind)) return null;
  const slot = episode.week.find((w) => w.scene === sceneId);
  const sameDay = slot
    ? episode.week
        .slice(episode.week.indexOf(slot) + 1)
        .filter((w) => w.day === slot.day)
        .map((w) => findScene(w.scene))
        .filter((s): s is Scene => s !== undefined && LISTEN_KINDS.includes(s.kind))
    : [];
  const scenes = [first, ...sameDay];
  const steps: ListenStep[] = scenes.flatMap((scene) =>
    scene.beats.flatMap((beat): ListenStep[] => {
      if (beat.kind === 'ui') return [{ kind: 'ui', scene: scene.id, ui: beat.ui }];
      if (beat.kind !== 'rec') return [];
      const line = getLine(beat.line);
      return [
        {
          kind: 'line',
          scene: scene.id,
          lineId: line.id,
          character: line.character,
          caption: line.caption,
          gloss: glossFor(line.glosses, language),
          durationMs: line.audio?.durationMs ?? null,
          segments: segmentsOf(line.id, language),
        },
      ];
    }),
  );
  const phrases = [...new Set(scenes.flatMap((s) => s.phrases))]
    .map((id) => findPhrase(id))
    .filter((p) => p !== undefined)
    .map((p) => ({ id: p.id, en: p.en }));
  return { episode, scenes, steps, phrases };
}
