import type { CallKind, LocalDate, Progress, Stage } from '@yapling/contracts';
import {
  addDays,
  canStartCall,
  chargeTalk,
  duePhrases,
  FREE_FIRST_WEEK_SECONDS,
  FREE_WEEKLY_SECONDS,
  fromPhraseProgress,
  isMeteredCall,
  isRingFull,
  ledgerPeriod,
  ledgerStatus,
  newcomerCardAtRing,
  pipsMinuteFor,
  seasonKeepsakeOf,
  seededRng,
  startOfLocalDay,
  storyWeek,
  type LedgerContext,
  type LedgerState,
} from '@yapling/domain';
import { findScene, PIPS_MINUTE_LINES, pipsMinuteSceneFor, SEASON_1 } from '@yapling/story';
import { describe, expect, it } from 'vitest';

import { pipsMinuteMeta, pipsMinuteOutcome, storyPipsMinutes } from '../call/daily';
import type { LearnerLine } from '../call/transcript';
import { applyPipsMinute } from './daily-call';
import { applyCall, SEASON_WEEKS } from './progress-apply';

/*
 * The season, day by day, as the server sees it: a Newcomer and a Visitor each play what their
 * week opens (the story-week plan the burrow reads), on day 1 to day 49, and every call goes
 * through the same changes the post-call job and Pip's minute's end make (`applyCall`,
 * `applyPipsMinute`). Live minutes are charged by the ledger's rules. Nothing here is a fake of
 * the learning model: only the learner's voice is stood in for (every turn passes, and a live
 * call uses its scene's phrases and the phrases due, as the call's prompt offers them).
 */

const ZONE = 'Asia/Ho_Chi_Minh';
const INSTALLED_ON: LocalDate = '2026-11-02';
const LAST_DAY = 49;
/** The burrow offers Pip's minute from week 2. */
const LATER_WEEKS_FROM_DAY = 8;
const MINUTE = 60;

/** About how long each ring call takes, learner and character together (`every-week-loop.md`). */
const CALL_SECONDS: Readonly<Record<'episode' | 'real_week' | 'practice', number>> = {
  episode: 5 * MINUTE,
  real_week: 4 * MINUTE,
  practice: 4 * MINUTE,
};

interface Learner {
  readonly stage: Stage;
  /** Week 1's day 1: the install day for a Newcomer, the letter's day after Settling in. */
  readonly startedOn: LocalDate;
}

const NEWCOMER: Learner = { stage: 'newcomer', startedOn: INSTALLED_ON };
const VISITOR: Learner = { stage: 'visitor', startedOn: addDays(INSTALLED_ON, 6) };

type Played =
  | {
      readonly kind: 'ring';
      readonly day: number;
      readonly callKind: CallKind;
      readonly sceneId: string;
      readonly callId: string;
      readonly secondsLeftBefore: number;
      readonly allowance: number;
      /** The week whose ring this call filled, if it did. */
      readonly filled: number | null;
    }
  | {
      readonly kind: 'minute';
      readonly day: number;
      readonly sceneId: string;
      readonly charged: number;
    }
  | { readonly kind: 'heard'; readonly day: number; readonly sceneId: string };

interface Walk {
  readonly progress: Progress;
  readonly played: readonly Played[];
  /** Progress at the end of each day, day 1 first. */
  readonly days: readonly Progress[];
  readonly bloomedIn: ReadonlyMap<string, CallKind>;
}

const emptyProgress = (): Progress => ({
  revision: 1,
  installedOn: INSTALLED_ON,
  dayIndex: 1,
  phrases: [],
  errorTargets: [],
  canDos: [],
  keepsakes: [],
  weeks: [],
  settlingChaptersDone: [],
});

/** An instant on a story day, at a local hour. */
const at = (learner: Learner, day: number, hour: number) =>
  startOfLocalDay(addDays(learner.startedOn, day - 1), ZONE) + hour * 3_600_000;

const ledgerContext = (learner: Learner, now: number): LedgerContext => ({
  plan: 'free',
  installedOn: INSTALLED_ON,
  storyStartedOn: learner === VISITOR ? learner.startedOn : null,
  timezone: ZONE,
  now,
});

/** The learner's turns in a live call: one for each phrase they use, every one passed. */
function learnerLines(phrases: readonly string[], startedAt: number): LearnerLine[] {
  return phrases.map((id, i) => ({
    speaker: 'learner',
    text: id,
    at: startedAt + (i + 1) * 20_000,
    turn: i + 1,
    words: [],
    beatId: null,
    outcome: 'pass',
    phrasesUsed: [id],
    canDo: null,
    targetId: null,
    correctionFixed: null,
  }));
}

/** Plays day 1 to day 49: each day what the week opens, and Pip's minute on a day with no call. */
function walk(learner: Learner): Walk {
  let progress = emptyProgress();
  let ledger: LedgerState | null = null;
  let minutesBefore = 0;
  const played: Played[] = [];
  const days: Progress[] = [];
  const bloomedIn = new Map<string, CallKind>();

  for (let day = 1; day <= LAST_DAY; day += 1) {
    const week = storyWeek({
      season: SEASON_WEEKS,
      weeks: progress.weeks,
      dayIndex: day,
      startedOn: learner.startedOn,
    });
    let calls = 0;
    week.today.forEach((opening, i) => {
      if (opening.scene === null) return;
      if (opening.ring === null) {
        played.push({ kind: 'heard', day, sceneId: opening.scene });
        return;
      }
      const scene = findScene(opening.scene);
      if (scene === undefined) throw new Error(`no scene ${opening.scene}`);
      const startedAt = at(learner, day, 9 + i);
      const ctx = ledgerContext(learner, startedAt);
      expect(canStartCall(ledger, ctx, opening.ring), `${opening.scene} starts`).toBe(true);
      const secondsLeftBefore = ledgerStatus(ledger, ctx).secondsLeft;
      const seconds = CALL_SECONDS[opening.ring];
      const endedAt = startedAt + seconds * 1000;
      ledger = chargeTalk(ledger, ledgerContext(learner, endedAt), {
        learnerSeconds: seconds / 2,
        characterSeconds: seconds / 2,
        callKind: opening.ring,
      }).state;
      // The call's prompt offers its own phrases and the ones due; the learner uses them all.
      const due = duePhrases(progress.phrases.map(fromPhraseProgress), startedAt, ZONE, {
        always: scene.phrases,
      }).map((p) => p.id);
      const used = [...new Set([...scene.phrases, ...due])];
      const callId = `call_d${day}_${opening.ring}`;
      const fullBefore = new Set(progress.weeks.filter(isRingFull).map((w) => w.week));
      const change = applyCall(progress, {
        callId,
        sceneId: scene.id,
        kind: opening.ring,
        endedAt,
        timezone: ZONE,
        storyDay: day,
        scenePhrases: scene.phrases,
        sceneCast: scene.cast,
        learnerLines: learnerLines(used, startedAt),
        draft: null,
      });
      for (const e of change.phraseEvents)
        if (e.event === 'bloomed') bloomedIn.set(e.phraseId, opening.ring);
      progress = { ...progress, ...change.lists, revision: progress.revision + 1 };
      const filled = progress.weeks.find((w) => isRingFull(w) && !fullBefore.has(w.week));
      played.push({
        kind: 'ring',
        day,
        callKind: opening.ring,
        sceneId: scene.id,
        callId,
        secondsLeftBefore,
        allowance: ledgerPeriod(ctx).allowanceSeconds,
        filled: filled?.week ?? null,
      });
      calls += 1;
    });

    // A day with no call of its own, from week 2 (when the burrow offers it): Pip's minute, when a
    // phrase is due.
    if (calls === 0 && day >= LATER_WEEKS_FROM_DAY) {
      const now = at(learner, day, 19);
      const minute = pipsMinuteFor(
        progress.phrases.map(fromPhraseProgress),
        now,
        ZONE,
        seededRng(day),
        PIPS_MINUTE_LINES,
      );
      const scene = pipsMinuteSceneFor(minute, {
        dayIndex: day,
        intro: learner.stage === 'visitor' && minutesBefore === 0,
      });
      const found = scene === null ? null : storyPipsMinutes.find(scene.id);
      const meta = found === null ? null : pipsMinuteMeta(found);
      if (scene !== null && meta !== null) {
        const outcome = pipsMinuteOutcome(
          meta,
          meta.turns.map((t) => ({ beatId: t.beatId, pass: 'match' as const })),
        );
        const endedAt = now + MINUTE * 1000;
        const charge = chargeTalk(ledger, ledgerContext(learner, endedAt), {
          learnerSeconds: 20,
          characterSeconds: 40,
          callKind: 'daily',
        });
        ledger = charge.state;
        const change = applyPipsMinute(progress, {
          sceneId: scene.id,
          endedAt,
          timezone: ZONE,
          outcome,
        });
        for (const e of change.phraseEvents)
          if (e.event === 'bloomed') bloomedIn.set(e.phraseId, 'daily');
        progress = { ...progress, ...change.lists, revision: progress.revision + 1 };
        played.push({ kind: 'minute', day, sceneId: scene.id, charged: charge.chargedSeconds });
        minutesBefore += 1;
      }
    }
    days.push(progress);
  }
  return { progress, played, days, bloomedIn };
}

const weekOf = (day: number) => Math.floor((day - 1) / 7) + 1;
const ringCalls = (w: Walk) => w.played.filter((p) => p.kind === 'ring');
const minutes = (w: Walk) => w.played.filter((p) => p.kind === 'minute');

describe.each([
  ['a Newcomer', NEWCOMER],
  ['a Visitor', VISITOR],
] as const)('the season, day by day, for %s', (_who, learner) => {
  const result = walk(learner);

  it('fills rings 2 to 6, each from its own week’s episode, real-week and practice calls', () => {
    for (let week = 2; week <= 6; week += 1) {
      const ring = result.progress.weeks[week - 1];
      expect(ring && isRingFull(ring), `ring ${week} is full`).toBe(true);
      const episode = SEASON_1.episodes[week - 1];
      const own = new Set(episode?.scenes.map((s) => s.id));
      for (const slot of ring?.slots ?? []) {
        expect(own.has(slot.sceneId ?? ''), `${slot.sceneId} is week ${week}'s`).toBe(true);
        const call = ringCalls(result).find((c) => c.callId === slot.callRecordId);
        expect(call && weekOf(call.day), `${slot.kind} of week ${week}`).toBe(week);
      }
      expect(result.progress.keepsakes.some((k) => k.id === `week-${week}`)).toBe(true);
    }
    // Each ring fills on its own week's days, by the call that completes it.
    const filled = ringCalls(result).flatMap((c) => (c.filled === null ? [] : [c]));
    expect(filled.map((c) => c.filled)).toEqual([1, 2, 3, 4, 5, 6]);
    for (const c of filled) expect(weekOf(c.day)).toBe(c.filled);
  });

  it('grows phrases from sprout to leaf to bloom, and only a live call makes a bloom', () => {
    const phrases = result.progress.phrases;
    const leaves = phrases.filter((p) => p.leafAt !== null);
    const blooms = phrases.filter((p) => p.bloomAt !== null);
    expect(leaves.length).toBeGreaterThanOrEqual(10);
    expect(blooms.length).toBeGreaterThanOrEqual(1);
    for (const p of phrases) {
      if (p.leafAt !== null) expect(p.sproutAt !== null && p.sproutAt < p.leafAt).toBe(true);
      if (p.bloomAt !== null) {
        expect(p.leafAt !== null && p.leafAt < p.bloomAt, `${p.id} leafs, then blooms`).toBe(true);
        expect(p.bloomAt - p.seedAt).toBeGreaterThanOrEqual(14 * 86_400_000 - 86_400_000);
      }
    }
    for (const [id, kind] of result.bloomedIn) {
      expect({ id, kind }).not.toEqual({ id, kind: 'daily' });
    }
    // Phrases met in weeks 2 to 6 grow too, not only week 1's.
    const laterLeaves = leaves.filter((p) => p.seedAt >= at(learner, 8, 0));
    expect(laterLeaves.length).toBeGreaterThanOrEqual(3);
  });

  it('plays Pip’s minute on days with no call, and it never costs a live minute', () => {
    expect(isMeteredCall('daily')).toBe(false);
    const played = minutes(result);
    for (let week = 2; week <= 6; week += 1) {
      expect(
        played.some((m) => weekOf(m.day) === week),
        `a minute in week ${week}`,
      ).toBe(true);
    }
    for (const m of played) expect(m.charged).toBe(0);
    // Its uses are prompted: a minute leaves the rings, can-dos and keepsakes as they were.
    for (const m of played) {
      const before = result.days[m.day - 2];
      const after = result.days[m.day - 1];
      expect(after?.weeks).toEqual(before?.weeks);
      expect(after?.keepsakes).toEqual(before?.keepsakes);
    }
  });

  it('gives the free weekly minutes from week 2, counted from the story’s start', () => {
    const calls = ringCalls(result);
    for (const call of calls) {
      expect(call.allowance).toBe(
        weekOf(call.day) === 1 ? FREE_FIRST_WEEK_SECONDS : FREE_WEEKLY_SECONDS,
      );
    }
    // Week 2's period starts on story day 8, in the learner's timezone (after Settling in for a
    // Visitor, not on the install day).
    const period = ledgerPeriod(ledgerContext(learner, at(learner, 8, 12)));
    expect(period.periodStart).toBe(startOfLocalDay(addDays(learner.startedOn, 7), ZONE));
    expect(period.firstWeek).toBe(false);
    // Each week's first call starts with the whole allowance: nothing carries over or is owed.
    for (let week = 2; week <= 6; week += 1) {
      const first = calls.find((c) => weekOf(c.day) === week);
      expect(first?.secondsLeftBefore).toBe(FREE_WEEKLY_SECONDS);
    }
  });

  it('keeps the season keepsake from the day the last episode is played', () => {
    const lastEpisode = ringCalls(result).find(
      (c) => c.callKind === 'episode' && c.sceneId === SEASON_1.episodes.at(-1)?.id,
    );
    if (!lastEpisode) throw new Error('Episode 6 was played');
    const dayBefore = result.days[lastEpisode.day - 2];
    expect(dayBefore && seasonKeepsakeOf(1, SEASON_WEEKS, dayBefore.weeks, ZONE)).toBeNull();
    expect(seasonKeepsakeOf(1, SEASON_WEEKS, result.progress.weeks, ZONE)).toEqual({
      id: 'season-1',
      kind: 'season',
      canDoId: null,
      signedBy: 'mei',
      earnedOn: addDays(learner.startedOn, lastEpisode.day - 1),
    });
  });

  it('opens every week’s story, postcard or voicemail on the days between calls', () => {
    for (let week = 2; week <= 6; week += 1) {
      const heard = result.played.filter((p) => p.kind === 'heard' && weekOf(p.day) === week);
      expect(heard.length, `week ${week} has things to hear`).toBeGreaterThanOrEqual(2);
    }
  });
});

describe('Linh’s Newcomer card for a Visitor', () => {
  it('is offered at ring 2, from the call that fills it, after "Ở lại thêm" at ring 1', () => {
    const result = walk(VISITOR);
    const ringTwo = ringCalls(result).find((c) => c.filled === 2);
    if (!ringTwo) throw new Error('ring 2 filled');
    // Every card turn passed on its words, as a Visitor's do when they say the card.
    const ringTurns = Array.from({ length: 9 }, () => 'match' as const);
    expect(
      newcomerCardAtRing({ stage: 'visitor', fullRingWeek: 2, ringTurns, answeredWeeks: [1] }),
    ).toEqual({ week: 2 });
    expect(weekOf(ringTwo.day)).toBe(2);
  });
});
