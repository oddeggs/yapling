import type { CharacterId, HeardWord } from '@yapling/contracts';
import { lastQuestion } from '@yapling/story';

/*
 * The call's transcript: every line in order, the learner's with their word timings. Kept in the
 * call object while the call runs, then written to R2 (`<user prefix>calls/<id>/transcript.json`)
 * for the post-call summary.
 */

export interface LearnerLine {
  readonly speaker: 'learner';
  readonly text: string;
  readonly at: number;
  readonly turn: number;
  readonly words: readonly HeardWord[];
  /** The beat the turn answered. */
  readonly beatId: string | null;
  /** How the character judged it (from the control line). */
  readonly outcome: string | null;
  readonly phrasesUsed: readonly string[];
  readonly canDo: string | null;
  readonly targetId: string | null;
  /** A second try after a correction prompt: fixed or not. */
  readonly correctionFixed: boolean | null;
}

export interface CharacterLine {
  readonly speaker: CharacterId;
  readonly text: string;
  readonly at: number;
  /** The recorded line it played, if it was one. */
  readonly lineId: string | null;
  readonly beatId: string | null;
}

export type TranscriptLine = LearnerLine | CharacterLine;

export const isLearnerLine = (line: TranscriptLine): line is LearnerLine =>
  line.speaker === 'learner';

export interface TranscriptFile {
  readonly version: 1;
  readonly callId: string;
  readonly sceneId: string;
  readonly kind: string;
  readonly stage: string;
  readonly firstLanguage: string;
  readonly timezone: string;
  readonly startedAt: number;
  readonly endedAt: number;
  readonly lines: readonly TranscriptLine[];
}

export const transcriptKey = (prefix: string, callId: string): string =>
  `${prefix}calls/${callId}/transcript.json`;

/** The last character line, recorded or generated, or null before anyone spoke. */
export function lastCharacterLine(transcript: readonly TranscriptLine[]): CharacterLine | null {
  for (let i = transcript.length - 1; i >= 0; i--) {
    const line = transcript[i];
    if (line !== undefined && !isLearnerLine(line)) return line;
  }
  return null;
}

/** The speaker's last question in the call, for a safe nudge to ask again. */
export function lastAskedBy(
  transcript: readonly TranscriptLine[],
  speaker: CharacterId,
): string | null {
  for (let i = transcript.length - 1; i >= 0; i--) {
    const line = transcript[i];
    if (line?.speaker === speaker) return lastQuestion(line.text);
  }
  return null;
}

/** The character line the learner is answering, when the listener said it (their question). */
export function promptLine(
  transcript: readonly TranscriptLine[],
  speaker: CharacterId,
): string | null {
  const line = lastCharacterLine(transcript);
  return line?.speaker === speaker ? line.text.slice(0, 300) : null;
}
