import type { CharacterId, Id, Stage } from '@yapling/contracts';

import { getLine } from './lines';
import type { SceneEffect } from './runner-types';
import { STAGE_SPEECH } from './stage';
import type { Answer, Beat, GlossedText, Scene } from './types';

/* The runner's small effect builders: hints and cards, lines played and lines said. */

export const answerOf = (beat: Beat): Answer | null =>
  beat.kind === 'learner' ? beat.answer : beat.kind === 'gen' ? beat.answer : null;

/** A turn passed by matching the words on its cards, without the model. */
export const isCardTurn = (answer: Answer): boolean => answer.accept.length > 0;

export const hintOf = (answer: Answer): GlossedText | null => answer.exits.silent.hint;

export const fromStart = (answer: Answer, stage: Stage): boolean =>
  hintOf(answer) !== null && (answer.showHint === 'always' || STAGE_SPEECH[stage].hintsFromStart);

export const hintEffect = (beat: Beat, answer: Answer, stage: Stage): SceneEffect | null => {
  const hint = hintOf(answer);
  if (!hint) return null;
  return {
    type: 'hint',
    beatId: beat.id,
    hint,
    ...(answer.choices.length > 0 ? { choices: answer.choices } : {}),
    ...(answer.model !== null ? { modelLineId: answer.model } : {}),
    ...(fromStart(answer, stage) ? { persistent: true as const } : {}),
  };
};

/** A written line said and not waited on. */
export const sayLine = (beat: Beat, lineId: Id): SceneEffect => {
  const line = getLine(lineId);
  return {
    type: 'say',
    beatId: beat.id,
    speaker: line.character,
    text: line.caption,
    lineId,
    language: line.language,
    glosses: line.glosses,
  };
};

export const sayText = (beat: Beat, speaker: CharacterId, text: GlossedText): SceneEffect => ({
  type: 'say',
  beatId: beat.id,
  speaker,
  text: text.en,
  lineId: null,
  language: 'en',
  glosses: text.glosses,
});

/** A recorded shared line when the speaker has one, else its text in their live voice. */
export const sayShared = (
  beat: Beat,
  speaker: CharacterId,
  lineId: Id | undefined,
  text: GlossedText,
): SceneEffect => (lineId === undefined ? sayText(beat, speaker, text) : sayLine(beat, lineId));

/** Whether the scene is played the Visitor's way (a Settling-in chapter, or at Visitor). */
export const visitorRun = (scene: Scene, stage: Stage) =>
  scene.kind === 'settling' || stage === 'visitor';

/** A written line played (waited on with `rec_played` outside a turn). */
export const playEffect = (beat: Beat, lineId: Id, slower: boolean): SceneEffect => {
  const line = getLine(lineId);
  return {
    type: 'play_rec',
    beatId: beat.id,
    lineId: line.id,
    character: line.character,
    caption: line.caption,
    recorded: line.audio !== null,
    text: line.text,
    ...(slower ? { slower: true as const } : {}),
    ...(line.language !== 'en' ? { language: line.language } : {}),
  };
};
