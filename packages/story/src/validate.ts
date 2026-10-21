import { STAGES, type CharacterId, type Id } from '@yapling/contracts';
import { canDoById } from '@yapling/domain';

import { findPhrase } from './catalogue';
import { findLine } from './lines';
import { activeBeats, nextBeat } from './runner';
import type { Beat, Scene } from './types';

/** Where a beat can go next: its own next, the fine exit and the fallback exit. */
const targetsOf = (beat: Beat): Id[] => {
  const answer = beat.kind === 'learner' || beat.kind === 'gen' ? beat.answer : null;
  return [beat.next, answer?.exits.fine.to, answer?.exits.silent.fallback.to].filter(
    (t): t is Id => t !== undefined,
  );
};

/** The beats a run can reach, at any stage. */
export const reachableBeats = (scene: Scene): ReadonlySet<Id> => {
  const seen = new Set<Id>();
  for (const stage of STAGES) {
    const queue = activeBeats(scene, stage).slice(0, 1);
    for (let beat = queue.shift(); beat; beat = queue.shift()) {
      if (seen.has(`${stage}:${beat.id}`)) continue;
      seen.add(`${stage}:${beat.id}`);
      seen.add(beat.id);
      const tos: (Id | undefined)[] = [undefined, ...targetsOf(beat)];
      for (const to of tos) {
        const next = nextBeat(scene, stage, beat, to);
        if (next) queue.push(next);
      }
    }
  }
  return new Set([...seen].filter((id) => !id.includes(':')));
};

/** Problems with a scene's data; empty when it is sound. */
export const validateScene = (scene: Scene): string[] => {
  const problems: string[] = [];
  const at = (beat: Beat, message: string) => problems.push(`${scene.id}/${beat.id}: ${message}`);
  const index = new Map(scene.beats.map((b, i) => [b.id, i]));

  if (scene.beats.length === 0) problems.push(`${scene.id}: no beats`);
  if (index.size !== scene.beats.length) problems.push(`${scene.id}: duplicate beat ids`);
  for (const id of scene.phrases) {
    if (!findPhrase(id)) problems.push(`${scene.id}: unknown phrase ${id}`);
  }
  for (const id of scene.canDos) {
    if (!canDoById(id)) problems.push(`${scene.id}: unknown can-do ${id}`);
  }

  scene.beats.forEach((beat, i) => {
    for (const to of targetsOf(beat)) {
      const j = index.get(to);
      if (j === undefined) at(beat, `unknown target ${to}`);
      // Forward only: no loops, so every run reaches the end.
      else if (j <= i) at(beat, `points back to ${to}`);
    }
    const speakers: CharacterId[] = [];
    if (beat.kind === 'rec') {
      const line = findLine(beat.line);
      if (!line) at(beat, `unknown line ${beat.line}`);
      else speakers.push(line.character);
    }
    if (beat.kind === 'gen') speakers.push(beat.speaker);
    const answer = beat.kind === 'learner' || beat.kind === 'gen' ? beat.answer : null;
    if (answer) {
      speakers.push(answer.listener, answer.exits.silent.fallback.speaker);
      if (answer.exits.silent.maxTries < 1) at(beat, 'maxTries below 1');
      for (const id of answer.phrases) {
        if (!findPhrase(id)) at(beat, `unknown phrase ${id}`);
      }
      if (answer.canDo !== null && !canDoById(answer.canDo)) {
        at(beat, `unknown can-do ${answer.canDo}`);
      }
    }
    if (beat.kind === 'ui' && beat.ui.type === 'phrase_grows' && !findPhrase(beat.ui.phrase)) {
      at(beat, `unknown phrase ${beat.ui.phrase}`);
    }
    for (const speaker of speakers) {
      if (!scene.cast.includes(speaker)) at(beat, `${speaker} is not in the cast`);
    }
  });

  const reachable = reachableBeats(scene);
  for (const beat of scene.beats) {
    if (!reachable.has(beat.id)) at(beat, 'unreachable');
  }
  return problems;
};
