import type { CharacterId } from '@yapling/contracts';

import { FRAME_WIDTH, type CastSpot } from './scene-layout';

/*
 * What each critter on the stage does, from the call: it listens while the learner talks, thinks
 * while a reply is on its way, rests while its own line plays (lipsync adds the talking bob),
 * listens toward whoever else is speaking, hops when a turn passes and waves hello and goodbye.
 * Pure, so the mapping is tested without a phone; `Critter` does the moving (and holds still under
 * Reduce Motion).
 */

/** The acts `Critter` plays (`CritterAct` in `@yapling/art`). */
export type StageAct = 'idle' | 'listen' | 'think' | 'hop' | 'wave';
export type Side = 'left' | 'right';

/** One critter's act: `play` grows to play a one-shot again, `lookAt` the side it attends to. */
export interface StageCue {
  readonly act: StageAct;
  readonly play: number;
  readonly lookAt: Side;
}

/** The call at this moment, as the stage reads it. */
export interface StageMoment {
  /** The learner is talking: the talk button held, or hands-free hearing their voice. */
  readonly learnerTalking: boolean;
  /** Who waits for the reply (the thinking dots). */
  readonly thinker: CharacterId | null;
  /** Whose line is playing. */
  readonly talking: CharacterId | null;
}

/** What one-shots follow from: they play when these change. */
export interface StageSignals {
  /** Turns passed so far (a good answer, or "Bỏ qua"). */
  readonly passes: number;
  /** The character whose line opened the call (their hello); null before the first line. */
  readonly greeter: CharacterId | null;
  /** The scene is over (the goodbye). */
  readonly done: boolean;
}

/** A one-shot act for some of the cast, from `at` for `ms`. */
export interface StageShot {
  readonly act: 'hop' | 'wave';
  readonly cast: readonly CharacterId[];
  readonly at: number;
}

/** How long each one-shot plays before the call's own state takes the stage back (`ACTS`). */
export const SHOT_MS: Readonly<Record<StageShot['act'], number>> = { hop: 2050, wave: 3650 };

const centreOf = (s: CastSpot) => s.left + s.size / 2;

/** Toward the screen's middle from where the critter stands: one on the right half looks left. */
export const towardCentre = (spot: CastSpot): Side =>
  centreOf(spot) > FRAME_WIDTH / 2 ? 'left' : 'right';

/** Toward another critter on the stage; the middle when it isn't on the stage. */
export function toward(spot: CastSpot, other: CastSpot | undefined): Side {
  if (!other || other.character === spot.character) return towardCentre(spot);
  const d = centreOf(other) - centreOf(spot);
  return d === 0 ? towardCentre(spot) : d < 0 ? 'left' : 'right';
}

/** The act the call's state asks of one critter (listen, think or rest) and where it looks. */
export function heldCue(
  spot: CastSpot,
  moment: StageMoment,
  cast: readonly CastSpot[],
): { readonly act: 'idle' | 'listen' | 'think'; readonly lookAt: Side } {
  const c = spot.character;
  // The learner is in front of the screen, in its middle: everyone listens that way.
  if (moment.learnerTalking) return { act: 'listen', lookAt: towardCentre(spot) };
  if (moment.thinker === c) return { act: 'think', lookAt: towardCentre(spot) };
  if (moment.talking === c) return { act: 'idle', lookAt: towardCentre(spot) };
  if (moment.talking !== null) {
    const speaker = cast.find((s) => s.character === moment.talking);
    // A voice off the stage (the office on the phone, Mags at the meeting) is heard, not watched.
    if (speaker) return { act: 'listen', lookAt: toward(spot, speaker) };
  }
  return { act: 'idle', lookAt: towardCentre(spot) };
}

/**
 * The one-shot a change of signals plays, if any: a hop for the one answered and the roommate when
 * a turn passes, a wave from the first speaker's hello, and from the host and the roommate when
 * the scene ends.
 */
export function shotFor(
  prev: StageSignals,
  next: StageSignals,
  ctx: {
    readonly listener: CharacterId | null;
    readonly host: CharacterId;
    readonly cast: readonly CastSpot[];
    readonly now: number;
  },
): StageShot | null {
  const onStage = (ids: readonly (CharacterId | null)[]) =>
    [...new Set(ids)].filter(
      (id): id is CharacterId => id !== null && ctx.cast.some((s) => s.character === id),
    );
  const shot = (act: StageShot['act'], ids: readonly (CharacterId | null)[]) => {
    const cast = onStage(ids);
    return cast.length > 0 ? { act, cast, at: ctx.now } : null;
  };
  if (next.done && !prev.done) return shot('wave', [ctx.host, 'pip']);
  if (next.done) return null;
  if (next.passes > prev.passes) return shot('hop', [ctx.listener ?? ctx.host, 'pip']);
  if (next.greeter !== null && prev.greeter === null) return shot('wave', [next.greeter]);
  return null;
}

/**
 * One critter's cue: a one-shot it is in, while it plays, or the held act. `plays` counts the
 * one-shots it has had, so a second hop plays again.
 */
export function cueOf(
  spot: CastSpot,
  moment: StageMoment,
  cast: readonly CastSpot[],
  shot: StageShot | null,
  plays: number,
  now: number,
): StageCue {
  const held = heldCue(spot, moment, cast);
  const inShot =
    shot !== null && shot.cast.includes(spot.character) && now - shot.at < SHOT_MS[shot.act];
  // The learner starting to talk takes the stage back from a one-shot at once.
  if (inShot && !moment.learnerTalking) {
    return { act: shot.act, play: plays, lookAt: towardCentre(spot) };
  }
  return { act: held.act, play: plays, lookAt: held.lookAt };
}
