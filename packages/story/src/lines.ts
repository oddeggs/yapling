import type { Id } from '@yapling/contracts';

import { NO_GLOSS, viDraft } from './gloss';
import { PENDING_LINES, RECORDED_LINES } from './lines.generated';
import {
  S1_LINE_ENGLISH,
  S1_LINE_GLOSSES,
  S1_LINE_MEANINGS,
  S1_SCRIPTED_LINES,
} from './season-1/lines';
import type { StoryLine, WrittenLineData } from './types';

/** Strips Eleven v4 tags (`[whispers]`) and extra spaces: the caption of a voice text. */
export const plainCaption = (text: string): string =>
  text
    .replace(/\[[^\]]*\]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

const scriptedById = new Map(S1_SCRIPTED_LINES.map((line) => [line.id, line]));

/*
 * A line's extras (glosses, segments, meaning) are keyed by its id alone, never by whether it is
 * recorded yet: a line rendered and moved from `pending` to `lines` keeps them unchanged. Its
 * gloss is the one written here, else the `_vi` beside it in `lines.json` (a draft for review).
 */
const fromLinesJson = ({ vi, ...line }: WrittenLineData): StoryLine => ({
  ...line,
  glosses:
    S1_LINE_GLOSSES[line.id] ??
    scriptedById.get(line.id)?.glosses ??
    (vi === null ? NO_GLOSS : viDraft(vi)),
  english: S1_LINE_ENGLISH[line.id] ?? null,
  segments: scriptedById.get(line.id)?.segments ?? [],
  meaning: S1_LINE_MEANINGS[line.id] ?? null,
});

const inLinesJson = new Set([...RECORDED_LINES, ...PENDING_LINES].map((line) => line.id));

/** Written here only, not yet in lines.json: spoken with live TTS until recorded. */
const scriptedOnly: StoryLine[] = S1_SCRIPTED_LINES.filter((line) => !inLinesJson.has(line.id)).map(
  (line) => ({
    id: line.id,
    character: line.character,
    text: line.text,
    caption: plainCaption(line.text),
    kind: line.kind,
    take: null,
    nameSplice: null,
    audio: null,
    language: 'en',
    speed: null,
    glosses: line.glosses,
    english: null,
    segments: line.segments,
    meaning: S1_LINE_MEANINGS[line.id] ?? null,
  }),
);

/** Every written line of the season, recorded or pending, in order. */
export const STORY_LINES: readonly StoryLine[] = [
  ...RECORDED_LINES.map(fromLinesJson),
  ...PENDING_LINES.map(fromLinesJson),
  ...scriptedOnly,
];

const byId = new Map(STORY_LINES.map((line) => [line.id, line]));

export const findLine = (id: Id): StoryLine | undefined => byId.get(id);

export const getLine = (id: Id): StoryLine => {
  const line = byId.get(id);
  if (!line) throw new Error(`No story line ${id}`);
  return line;
};

/** Whether a line has its recording; the call speaks a pending one with the character's voice. */
export const isRecorded = (id: Id): boolean => byId.get(id)?.audio != null;

/**
 * Lines written here and missing from `audio/season-1/lines.json`, as entries for its `pending`
 * list (then `yap_voice.py render <id>`, move it to `lines`, `pnpm --filter @yapling/story gen`).
 */
export const pendingRecordings = () =>
  scriptedOnly.map((line) => ({
    id: line.id,
    char: line.character,
    text: line.text,
    kind: line.kind,
  }));
