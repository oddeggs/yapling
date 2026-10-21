import type { Id } from '@yapling/contracts';

import { NO_GLOSS } from './gloss';
import { RECORDED_LINES } from './lines.generated';
import { S1_LINE_GLOSSES, S1_LINE_MEANINGS, S1_SCRIPTED_LINES } from './season-1/lines';
import type { StoryLine } from './types';

/** Strips Eleven v4 tags (`[whispers]`) and extra spaces: the caption of a voice text. */
export const plainCaption = (text: string): string =>
  text
    .replace(/\[[^\]]*\]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

const scriptedById = new Map(S1_SCRIPTED_LINES.map((line) => [line.id, line]));

const recorded: StoryLine[] = RECORDED_LINES.map((line) => ({
  ...line,
  glosses: S1_LINE_GLOSSES[line.id] ?? scriptedById.get(line.id)?.glosses ?? NO_GLOSS,
  segments: scriptedById.get(line.id)?.segments ?? [],
  meaning: S1_LINE_MEANINGS[line.id] ?? null,
}));

const recordedIds = new Set(RECORDED_LINES.map((line) => line.id));

/** Written lines with no recording yet: spoken with live TTS until `yap_voice.py` records them. */
const pending: StoryLine[] = S1_SCRIPTED_LINES.filter((line) => !recordedIds.has(line.id)).map(
  (line) => ({
    id: line.id,
    character: line.character,
    text: line.text,
    caption: plainCaption(line.text),
    kind: line.kind,
    take: null,
    nameSplice: null,
    audio: null,
    glosses: line.glosses,
    segments: line.segments,
    meaning: S1_LINE_MEANINGS[line.id] ?? null,
  }),
);

/** Every written line of the season, recorded or pending, in order. */
export const STORY_LINES: readonly StoryLine[] = [...recorded, ...pending];

const byId = new Map(STORY_LINES.map((line) => [line.id, line]));

export const findLine = (id: Id): StoryLine | undefined => byId.get(id);

export const getLine = (id: Id): StoryLine => {
  const line = byId.get(id);
  if (!line) throw new Error(`No story line ${id}`);
  return line;
};

/**
 * Written lines still to be recorded, as entries for `audio/season-1/lines.json` (then
 * `yap_voice.py render <id>` and `pnpm --filter @yapling/story gen`).
 */
export const pendingRecordings = () =>
  pending.map((line) => ({ id: line.id, char: line.character, text: line.text, kind: line.kind }));
