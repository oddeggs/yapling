import type { CharacterId, FirstLanguage, Id, LocalDate, Stage } from '@yapling/contracts';
import { glossPolicy, recapKey, type SeasonEpisode } from '@yapling/domain';
import {
  findScene,
  getLine,
  glossFor,
  recapLine,
  SEASON_1,
  type Episode,
  type Place,
  type SfxId,
} from '@yapling/story';

import { namedCaption, seasonWeekAt, weekOf, type SeasonWeek } from './plan';

/*
 * What the weeks after the first play on the phone besides Pip's story: the recorded voicemails
 * (the week's cliffhanger), the title card that closes an episode's week, and Pip's recap for a
 * learner coming back. Pure, so the rules are tested without audio.
 */

/** How a line's first-language gloss shows: under it, tappable and marked, tappable, or not at all. */
export type GlossReveal = 'shown' | 'marked' | 'on_tap' | 'none';

/** The captions' help at the learner's stage, as calls give it (shown at Visitor, on tap after). */
export function glossRevealFor(stage: Stage, firstLanguage: FirstLanguage): GlossReveal {
  const policy = glossPolicy(stage, 'captions', { firstLanguage });
  return policy.layers.includes('l1') ? policy.reveal : 'none';
}

/** Whether a scene is one of the first week's, whose screens keep their own behaviour. */
export const isFirstWeekScene = (sceneId: Id): boolean => weekOf(sceneId)?.number === 1;

/** A recorded line as a listening screen shows it. */
export interface HeardLine {
  readonly lineId: Id;
  readonly character: CharacterId;
  readonly caption: string;
  readonly gloss: string | null;
  readonly durationMs: number | null;
}

const heardLine = (lineId: Id, language: FirstLanguage, learnerName: string | null): HeardLine => {
  const line = getLine(lineId);
  const named = namedCaption(line, glossFor(line.glosses, language), learnerName);
  return {
    lineId: line.id,
    character: line.character,
    caption: named.caption,
    gloss: named.gloss,
    durationMs: line.audio?.durationMs ?? null,
  };
};

/** A voicemail that is only a message: who left it, what it says, and the beep if it's cut off. */
export interface MailboxPlan {
  readonly sceneId: Id;
  readonly week: SeasonWeek;
  readonly weekNumber: number;
  readonly from: CharacterId;
  readonly message: HeardLine;
  readonly beep: SfxId | null;
}

/**
 * The plan for a recorded voicemail: null for a scene that isn't one (and for a voicemail with a
 * turn in it, which runs as a short call).
 */
export function mailboxPlan(
  sceneId: Id,
  language: FirstLanguage,
  learnerName: string | null = null,
): MailboxPlan | null {
  const scene = findScene(sceneId);
  const found = weekOf(sceneId);
  if (!scene || !found || scene.kind !== 'voicemail') return null;
  if (scene.beats.some((b) => b.kind === 'learner' || b.kind === 'gen')) return null;
  const rec = scene.beats.find((b) => b.kind === 'rec');
  if (rec?.kind !== 'rec') return null;
  const card = scene.beats.find((b) => b.kind === 'ui' && b.ui.type === 'voicemail');
  const beep = scene.beats.find((b) => b.kind === 'ui' && b.ui.type === 'sfx');
  const message = heardLine(rec.line, language, learnerName);
  return {
    sceneId,
    week: found.week,
    weekNumber: found.number,
    from: card?.kind === 'ui' && card.ui.type === 'voicemail' ? card.ui.from : message.character,
    message,
    beep: beep?.kind === 'ui' && beep.ui.type === 'sfx' ? beep.ui.sound : null,
  };
}

/** What comes after an episode's week, as its closing card teases it. */
export type NextUp =
  | {
      readonly kind: 'episode';
      readonly episode: number;
      readonly title: string;
      /** Who it is with (the teaser's silhouette). */
      readonly face: CharacterId;
      readonly opensOn: LocalDate;
      /** Its day has come: it is ready now. */
      readonly open: boolean;
    }
  | { readonly kind: 'festival'; readonly title: string };

export interface EpisodeEndModel {
  readonly season: number;
  readonly episode: number;
  readonly title: string;
  readonly place: Place;
  readonly cast: readonly CharacterId[];
  readonly next: NextUp | null;
}

const isEpisode = (week: SeasonWeek | undefined): week is Episode =>
  week !== undefined && 'cliffhanger' in week;

/**
 * The card that closes episode `number`'s week: its title, and the next episode with its day as the
 * season map dates it (from the story's start), or the festival after the last one.
 */
export function episodeEndModel(
  number: number,
  episodes: readonly SeasonEpisode[],
): EpisodeEndModel | null {
  const week = seasonWeekAt(number);
  if (!isEpisode(week)) return null;
  const after = seasonWeekAt(number + 1);
  const dated = episodes.find((e) => e.week === number + 1);
  let next: NextUp | null = null;
  if (isEpisode(after) && dated) {
    next = {
      kind: 'episode',
      episode: after.number,
      title: after.title,
      face: after.cast.find((c) => c !== 'pip') ?? 'pip',
      opensOn: dated.opensOn,
      open: dated.open,
    };
  } else if (after !== undefined && !isEpisode(after)) {
    next = { kind: 'festival', title: after.title };
  }
  return {
    season: SEASON_1.number,
    episode: week.number,
    title: week.title,
    place: week.place,
    cast: week.cast,
    next,
  };
}

/** The route id of Pip's recap: the learning model's recap key (`s1-e2.recap`). */
export const isRecapId = (id: string): boolean => id.endsWith('.recap');

/** A panel of the recap's comic page: one sentence or two of Pip's line. */
export interface RecapPanel {
  readonly text: string;
  /** Where it starts in the caption (it shows once Pip reaches it). */
  readonly start: number;
  readonly place: Place;
  readonly character: CharacterId;
}

export interface RecapModel {
  readonly key: Id;
  readonly season: number;
  /** The episode waiting for the learner, which the recap leads into. */
  readonly waiting: Episode;
  readonly line: HeardLine;
  readonly panels: readonly RecapPanel[];
}

const MAX_PANELS = 4;

/** Sentences of a caption with where each starts. */
function sentences(caption: string): { readonly text: string; readonly start: number }[] {
  const out: { text: string; start: number }[] = [];
  const re = /[^.!?…]+[.!?…]*['"’”]?\s*/gu;
  for (const m of caption.matchAll(re)) {
    const text = m[0].trim();
    if (text !== '') out.push({ text, start: m.index });
  }
  return out;
}

/** The sentences grouped into at most four panels, keeping their order. */
export function panelTexts(caption: string): { readonly text: string; readonly start: number }[] {
  const all = sentences(caption);
  if (all.length <= MAX_PANELS) return all;
  const size = Math.ceil(all.length / MAX_PANELS);
  const groups: { text: string; start: number }[] = [];
  for (let i = 0; i < all.length; i += size) {
    const group = all.slice(i, i + size);
    groups.push({ text: group.map((s) => s.text).join(' '), start: group[0]?.start ?? 0 });
  }
  return groups;
}

/**
 * Pip's recap for a learner coming back, as a comic page: the story so far in panels at the places
 * it happened, then the episode waiting for them. Null for an unknown key.
 */
export function recapModel(
  key: Id,
  language: FirstLanguage,
  learnerName: string | null = null,
): RecapModel | null {
  const lineId = recapLine(key);
  const episodes = SEASON_1.episodes;
  const told = episodes.findIndex((e) => recapKey(e.id as Parameters<typeof recapKey>[0]) === key);
  const episode = episodes[told];
  if (lineId === undefined || !episode) return null;
  // The finale's recap is its own ("I waited…"): it leads into itself.
  const waiting = told === episodes.length - 1 ? episode : (episodes[told + 1] ?? episode);
  const line = heardLine(lineId, language, learnerName);
  const texts = panelTexts(line.caption);
  const cast = episode.cast.length > 0 ? episode.cast : (['pip'] as const);
  const panels = texts.map((p, i): RecapPanel => {
    const last = i === texts.length - 1 && texts.length > 1;
    return {
      ...p,
      place: last ? waiting.place : episode.place,
      character: last ? 'pip' : (cast[i % cast.length] ?? 'pip'),
    };
  });
  return { key, season: SEASON_1.number, waiting, line, panels };
}
