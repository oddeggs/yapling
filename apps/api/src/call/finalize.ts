import type { CallEndReason, CallKind, Id, TurnMode } from '@yapling/contracts';
import type { TurnPass } from '@yapling/domain';
import type { RunnerState, Scene } from '@yapling/story';

import { userBlobPrefix } from '../account';
import { countTurnPasses, insertCall } from '../calls/store';
import type { Bindings } from '../env';
import { PostCallJob } from '../jobs/messages';
import { callCost, medians, noSamples, type Samples } from './costs';
import type { LearnerContext } from './learner';
import { noUsage, type Usage } from './llm';
import type { MeterState } from './meter';
import {
  isLearnerLine,
  transcriptKey,
  type TranscriptFile,
  type TranscriptLine,
} from './transcript';

/*
 * A call's plain data, kept in the call object's storage so a dropped call resumes on its beat,
 * and turned into the call record, the R2 transcript and the post-call job when it ends.
 */

export interface CallMeta {
  readonly callId: string;
  readonly userId: string;
  readonly kind: CallKind;
  readonly sceneId: Id;
  readonly startedAt: number;
  /** The secret half of the resume token. */
  readonly resumeSecret: string;
  /** Two-letter country of the phone's connection, for crisis resources. */
  readonly country: string;
  readonly turnMode: TurnMode;
  /**
   * Dev Worker only: how far the test build's clock was ahead when the call started. The call's
   * record and transcript are stamped on that clock, so phrase use lands on the test session's day.
   */
  readonly clockOffsetMs?: number;
}

export interface TurnPassRecord {
  readonly beatId: Id;
  readonly pass: TurnPass;
}

export interface CallData {
  readonly version: 1;
  readonly meta: CallMeta;
  /** The pace in it changes mid-call (`pace`). */
  learner: LearnerContext;
  runner: RunnerState;
  transcript: TranscriptLine[];
  turns: number;
  streamSeq: number;
  meter: MeterState;
  usage: Usage;
  /** Jev's input tokens; missing in a call saved before the turn judge. */
  jevInputTokens?: number;
  /** How each turn left its beat, in order; missing in a call saved before pass kinds. */
  passes?: TurnPassRecord[];
  sttSeconds: number;
  ttsChars: number;
  samples: Samples;
  awaitingLag: boolean;
  secondsLeft: number;
  wrapping: boolean;
  wrapStarted: boolean;
  crisis: boolean;
  priorCallSeconds: number;
  continuousSince: number;
  disclosedAtMs: number;
  breakSent: boolean;
  detachedAt: number | null;
  endReason: CallEndReason | null;
}

export function newCallData(
  meta: CallMeta,
  learner: LearnerContext,
  runner: RunnerState,
  facts: {
    secondsLeft: number;
    wrapping: boolean;
    priorCallSeconds: number;
    continuousSince: number;
  },
): CallData {
  return {
    version: 1,
    meta,
    learner,
    runner,
    transcript: [],
    turns: 0,
    streamSeq: 0,
    meter: { learnerMs: 0, characterMs: 0, billedLearner: 0, billedCharacter: 0 },
    usage: noUsage(),
    jevInputTokens: 0,
    passes: [],
    sttSeconds: 0,
    ttsChars: 0,
    samples: noSamples(),
    awaitingLag: false,
    secondsLeft: facts.secondsLeft,
    wrapping: facts.wrapping,
    wrapStarted: false,
    crisis: false,
    priorCallSeconds: facts.priorCallSeconds,
    continuousSince: facts.continuousSince,
    disclosedAtMs: 0,
    breakSent: false,
    detachedAt: null,
    endReason: null,
  };
}

/** The character who led the call: the scene's first cast member. */
export const leadOf = (scene: Scene) => scene.cast[0] ?? 'pip';

/**
 * Writes the record, the transcript and the post-call job. Returns whether a summary is coming
 * (a call with at least one learner turn gets one).
 */
export async function finalizeCall(
  env: Bindings,
  data: CallData,
  scene: Scene,
  runner: RunnerState,
): Promise<boolean> {
  const { meta } = data;
  // Stamped on the app's clock in a dev test session (no shift anywhere else).
  const shift = meta.clockOffsetMs ?? 0;
  const startedAt = meta.startedAt + shift;
  const endedAt = Date.now() + shift;
  const key = transcriptKey(userBlobPrefix(meta.userId), meta.callId);
  const file: TranscriptFile = {
    version: 1,
    callId: meta.callId,
    sceneId: meta.sceneId,
    kind: meta.kind,
    stage: data.learner.stage,
    firstLanguage: data.learner.firstLanguage,
    timezone: data.learner.timezone,
    startedAt,
    endedAt,
    // Each line's time too: the post-call job stamps a phrase's use with its line's.
    lines: shift === 0 ? data.transcript : data.transcript.map((l) => ({ ...l, at: l.at + shift })),
  };
  await env.BLOBS.put(key, JSON.stringify(file), {
    httpMetadata: { contentType: 'application/json' },
  });
  const summaryPending = data.transcript.some((l) => isLearnerLine(l) && l.text !== '');
  const reason = data.endReason ?? 'hangup';
  // The scene keeps its place when minutes ran out before it finished, or the learner left it as
  // too hard (to practise with Linh first).
  const keepsPlace = reason === 'minutes_exhausted' || reason === 'too_hard';
  const sceneState = keepsPlace && runner.phase !== 'ended' ? runner : null;
  const cost = callCost(data.sttSeconds, data.ttsChars, data.usage, data.jevInputTokens ?? 0);
  await insertCall(env.DB, {
    id: meta.callId,
    userId: meta.userId,
    kind: meta.kind,
    sceneId: meta.sceneId,
    character: leadOf(scene),
    stage: data.learner.stage,
    startedAt,
    endedAt: Math.max(endedAt, startedAt),
    learnerSeconds: Math.round(data.meter.learnerMs / 1_000),
    characterSeconds: Math.round(data.meter.characterMs / 1_000),
    endReason: reason,
    summaryPending,
    sceneState,
    safetyFlag: data.crisis ? 'crisis' : null,
    cost,
    timings: medians(data.samples),
    transcriptKey: key,
    turnPasses: data.passes ? countTurnPasses(data.passes) : null,
    samples: data.samples,
  });
  console.log('call ended', {
    callId: meta.callId,
    reason,
    seconds: Math.round((endedAt - startedAt) / 1_000),
    usd: cost.usd,
    timings: medians(data.samples),
  });
  if (summaryPending) {
    const job: PostCallJob = { type: 'post_call', callId: meta.callId, userId: meta.userId };
    await env.JOBS.send(PostCallJob.parse(job));
  }
  return summaryPending;
}
