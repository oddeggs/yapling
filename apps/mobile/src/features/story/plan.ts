import type { CharacterId, FirstLanguage, Id } from '@yapling/contracts';
import {
  findPhrase,
  findScene,
  getLine,
  glossFor,
  SEASON_1,
  seasonWeeks,
  type Episode,
  type Scene,
  type StoryWeek,
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

/** A week of the season: an episode's week, or a week without an episode (the festival). */
export type SeasonWeek = Episode | StoryWeek;

export interface ListenPlan {
  /** The week the scenes arrive in. */
  readonly week: SeasonWeek;
  /** Its number in the season (1 for the first week, 7 for the festival). */
  readonly weekNumber: number;
  /** The scenes played, in order: the first is the one the route named. */
  readonly scenes: readonly Scene[];
  readonly steps: readonly ListenStep[];
  /** The target phrases the scenes seed, as a tapped line can drop them in the burrow. */
  readonly phrases: readonly { readonly id: Id; readonly en: string }[];
}

const LISTEN_KINDS: readonly Scene['kind'][] = ['story', 'postcard'];

const WEEKS: readonly SeasonWeek[] = seasonWeeks(SEASON_1);

/** The week of the season a scene arrives in, with its number. */
export function weekOf(sceneId: Id): { readonly week: SeasonWeek; readonly number: number } | null {
  const i = WEEKS.findIndex((w) => w.scenes.some((s) => s.id === sceneId));
  const week = WEEKS[i];
  return week ? { week, number: i + 1 } : null;
}

/** The season's weeks, week 1 first. */
export const seasonWeekAt = (number: number): SeasonWeek | undefined => WEEKS[number - 1];

/**
 * A line's caption and gloss as the learner reads them. A line that names the learner (`Lan, this
 * is…`) carries their name on screen; the gloss's `{name}` is filled the same way.
 */
export function namedCaption(
  line: { readonly caption: string; readonly nameSplice: 'before' | null },
  gloss: string | null,
  learnerName: string | null,
): { readonly caption: string; readonly gloss: string | null } {
  const name = learnerName?.trim() ?? '';
  let tidy = gloss;
  if (gloss !== null && gloss.includes('{name}')) {
    // With no name to say, the call ("{name} ơi,") goes and the sentence starts afresh.
    const filled =
      name === ''
        ? gloss.replace(/\{name\}\s*(ơi)?[,!]?\s*/u, '')
        : gloss.replaceAll('{name}', name);
    tidy = filled.charAt(0).toUpperCase() + filled.slice(1);
  }
  if (line.nameSplice !== 'before' || name === '') return { caption: line.caption, gloss: tidy };
  return { caption: `${name}! ${line.caption}`, gloss: tidy };
}

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
export function listenPlan(
  sceneId: Id,
  language: FirstLanguage,
  learnerName: string | null = null,
): ListenPlan | null {
  const first = findScene(sceneId);
  const found = weekOf(sceneId);
  if (!first || !found || !LISTEN_KINDS.includes(first.kind)) return null;
  const { week, number } = found;
  const slot = week.week.find((w) => w.scene === sceneId);
  const sameDay = slot
    ? week.week
        .slice(week.week.indexOf(slot) + 1)
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
      const named = namedCaption(line, glossFor(line.glosses, language), learnerName);
      return [
        {
          kind: 'line',
          scene: scene.id,
          lineId: line.id,
          character: line.character,
          caption: named.caption,
          gloss: named.gloss,
          durationMs: line.audio?.durationMs ?? null,
          segments:
            line.segments.length === 0
              ? [{ en: named.caption, gloss: named.gloss, start: 0 }]
              : segmentsOf(line.id, language),
        },
      ];
    }),
  );
  const phrases = [...new Set(scenes.flatMap((s) => s.phrases))]
    .map((id) => findPhrase(id))
    .filter((p) => p !== undefined)
    .map((p) => ({ id: p.id, en: p.en }));
  return { week, weekNumber: number, scenes, steps, phrases };
}
