import { findLine, hintGlossFor, type RunnerState, type SceneEffect } from '@yapling/story';

import type { FrameBody } from './frames';
import type { LearnerContext } from './learner';
import type { CharacterLine } from './transcript';
import { withName } from './words';

/*
 * The scene's lines as the call sends them: the say-this card (`hint`, with its choices, the line
 * that models it and whether it stays up), and which line "again" or "slowly" says once more.
 */

type HintEffect = Extract<SceneEffect, { type: 'hint' }>;

/** The `hint` frame for a hint effect: names filled in, glosses as the stage shows them. */
export function hintFrame(effect: HintEffect, learner: LearnerContext): FrameBody {
  const name = (text: string) => withName(text, learner.name);
  const gloss = (glosses: HintEffect['hint']['glosses']) => {
    const text = hintGlossFor(glosses, learner.firstLanguage, learner.stage);
    return text === null ? null : name(text);
  };
  return {
    type: 'hint',
    phrase: name(effect.hint.en),
    gloss: gloss(effect.hint.glosses),
    ...(effect.choices && effect.choices.length > 0
      ? { choices: effect.choices.map((c) => ({ phrase: name(c.en), gloss: gloss(c.glosses) })) }
      : {}),
    ...(effect.modelLineId === undefined ? {} : { modelLineId: effect.modelLineId }),
    ...(effect.persistent ? { persistent: true } : {}),
  };
}

/**
 * Who says the last line again. The runner, when the turn's replay changes the scene (a turn that
 * teaches "again", or one answered by the slow replay) or when the last line heard is the written
 * line it knows; otherwise the call itself, which has every line's text (a generated line, a line
 * after a reply).
 */
export function replayBy(
  state: RunnerState,
  onReplay: 'replay' | 'pass' | 'replay_and_pass' | null,
  last: CharacterLine | null,
): 'runner' | 'call' {
  if (onReplay === 'pass' || onReplay === 'replay_and_pass') return 'runner';
  return last !== null && last.lineId !== null && last.lineId === state.lastLine
    ? 'runner'
    : 'call';
}

/** A written line played again by the call (the runner isn't waiting on it). */
export function replayOf(
  line: CharacterLine,
  beatId: string,
  slower: boolean,
): Extract<SceneEffect, { type: 'play_rec' }> | null {
  const written = line.lineId === null ? undefined : findLine(line.lineId);
  if (written === undefined) return null;
  return {
    type: 'play_rec',
    beatId,
    lineId: written.id,
    character: written.character,
    caption: written.caption,
    recorded: written.audio !== null,
    text: written.text,
    ...(slower ? { slower: true as const } : {}),
    ...(written.language !== 'en' ? { language: written.language } : {}),
  };
}
