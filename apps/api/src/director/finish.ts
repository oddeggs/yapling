import { userBlobPrefix } from '../account';
import { insertCall } from '../calls/store';
import { callCost, medians } from '../call/costs';
import type { MomentData } from '../call/moment-session';
import { isLearnerLine, transcriptKey, type TranscriptFile } from '../call/transcript';
import type { Bindings } from '../env';
import { MomentJob } from './jobs';
import { insertPainting, markPlayed } from './store';

/*
 * A moment's end: the transcript to R2, the call record, the kept painting (its title now, the
 * judge's notes a few seconds later), and the job that judges it and plans the next one. Returns
 * whether the painting's notes are coming.
 */
export async function finishMoment(env: Bindings, data: MomentData): Promise<boolean> {
  const { meta, plan } = data;
  const endedAt = Date.now();
  const key = transcriptKey(userBlobPrefix(meta.userId), meta.callId);
  const file: TranscriptFile = {
    version: 1,
    callId: meta.callId,
    sceneId: meta.momentId,
    kind: 'moment',
    stage: data.learner.stage,
    firstLanguage: data.learner.firstLanguage,
    timezone: meta.timezone,
    startedAt: meta.startedAt,
    endedAt,
    lines: data.transcript,
  };
  await env.BLOBS.put(key, JSON.stringify(file), {
    httpMetadata: { contentType: 'application/json' },
  });
  const spoke = data.transcript.some((l) => isLearnerLine(l) && l.text.trim() !== '');
  const reason = data.endReason ?? 'hangup';
  const cost = callCost(data.sttSeconds, data.ttsChars, data.usage, data.jevInputTokens);
  await insertCall(env.DB, {
    id: meta.callId,
    userId: meta.userId,
    kind: 'moment',
    sceneId: meta.momentId,
    character: meta.speaker,
    stage: data.learner.stage,
    startedAt: meta.startedAt,
    endedAt: Math.max(endedAt, meta.startedAt),
    learnerSeconds: Math.round(data.meter.learnerMs / 1_000),
    characterSeconds: Math.round(data.meter.characterMs / 1_000),
    endReason: reason,
    summaryPending: spoke,
    sceneState: null,
    safetyFlag: data.crisis ? 'crisis' : null,
    cost,
    timings: medians(data.samples),
    transcriptKey: key,
    samples: data.samples,
  });
  console.log('moment ended', {
    callId: meta.callId,
    reason,
    seconds: Math.round((endedAt - meta.startedAt) / 1_000),
    turns: data.turns,
    lane: data.lane,
    usd: cost.usd,
    timings: medians(data.samples),
  });
  await markPlayed(env.DB, meta.momentId, meta.callId, endedAt);
  // Nothing said, nothing kept: a moment the learner never answered leaves no painting. The
  // director still plans the next one.
  if (spoke && !data.crisis) {
    await insertPainting(env.DB, meta.userId, {
      id: `p_${crypto.randomUUID().replaceAll('-', '')}`,
      momentId: meta.momentId,
      callId: meta.callId,
      place: meta.place,
      variant: meta.variant,
      hour: meta.hour,
      localDate: meta.localDate,
      weather: meta.weather,
      speaker: meta.speaker,
      titleOpen: plan.title_open,
      // A moment cut short keeps its opening title and claims nothing it didn't get to.
      title: data.closed ? plan.title_close : plan.title_open,
      keptAt: endedAt,
      cut: !data.closed,
    });
  }
  const job: MomentJob = {
    type: 'moment_after',
    callId: meta.callId,
    userId: meta.userId,
    momentId: meta.momentId,
  };
  await env.JOBS.send(MomentJob.parse(job));
  return spoke && !data.crisis;
}
