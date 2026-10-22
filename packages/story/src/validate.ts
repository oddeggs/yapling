import { STAGES, type CharacterId, type Id } from '@yapling/contracts';
import { canDoById, SPEECH_SETTINGS } from '@yapling/domain';

import { findPhrase } from './catalogue';
import { findLine } from './lines';
import { activeBeats, nextBeat } from './runner';
import type { Beat, Scene } from './types';

/** The most words in a character's line at Visitor. */
export const VISITOR_MAX_WORDS = SPEECH_SETTINGS.visitor.maxWordsPerTurn;

/**
 * Visitor lines longer on purpose, as the script marks them: Pip's fast line in Chapter 3, there
 * so the learner has a reason to say "Sorry? Again, please."
 */
export const LONG_VISITOR_LINES: readonly Id[] = ['s1-set3-04'];

/** Words in a caption, the spliced name counted as one. */
export const wordCount = (text: string, nameSplice = false): number =>
  text.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length + (nameSplice ? 1 : 0);

/** Problems with a Visitor line: an English line over the word limit (unless marked long). */
export const visitorLineProblems = (id: Id): string[] => {
  const line = findLine(id);
  if (!line) return [`unknown line ${id}`];
  if (line.language !== 'en' || LONG_VISITOR_LINES.includes(id)) return [];
  const words = wordCount(line.caption, line.nameSplice !== null);
  return words > VISITOR_MAX_WORDS ? [`${id} has ${words} words at Visitor`] : [];
};

/** Where a beat can go next: its own next, the fine exit and the fallback exit (after real tries). */
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
      // Real tries always find a way out: the fallback after `maxTries` (silence is never a try).
      if (answer.exits.silent.maxTries < 1) at(beat, 'maxTries below 1');
      for (const id of answer.phrases) {
        if (!findPhrase(id)) at(beat, `unknown phrase ${id}`);
      }
      if (answer.canDo !== null && !canDoById(answer.canDo)) {
        at(beat, `unknown can-do ${answer.canDo}`);
      }
    }
    // Visitors' lines stay short: the chapters of Settling in and every Visitor-only beat.
    const visitorOnly = scene.kind === 'settling' || beat.maxStage === 'visitor';
    if (visitorOnly && beat.kind === 'rec') {
      for (const p of visitorLineProblems(beat.line)) at(beat, p);
    }
    if (visitorOnly && beat.kind === 'gen' && beat.example !== null) {
      const words = wordCount(beat.example);
      if (words > VISITOR_MAX_WORDS) at(beat, `example has ${words} words at Visitor`);
    }
    if (answer) {
      for (const id of [...answer.praise, ...(answer.model === null ? [] : [answer.model])]) {
        if (!findLine(id)) at(beat, `unknown line ${id}`);
        else if (visitorOnly) for (const p of visitorLineProblems(id)) at(beat, p);
      }
      if (answer.choices.length > 2) at(beat, 'more than two cards');
      if (answer.accept.some((w) => w !== w.toLowerCase()))
        at(beat, 'accepted words not lower case');
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
