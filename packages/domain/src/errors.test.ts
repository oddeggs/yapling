import { ErrorTargetProgress, Progress } from '@yapling/contracts';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import {
  activeTargets,
  errorResponse,
  errorTargetsApply,
  graduatedTargets,
  noteRecurringError,
  recordSelfCorrection,
  toErrorTargetProgress,
  fromErrorTargetProgress,
  type ErrorTargets,
} from './errors';
import { DAY_MS, HOUR_MS, instantOf } from './time';

const HCM = 'Asia/Ho_Chi_Minh';
const on = (day: number, hour = 9): number =>
  instantOf('2026-09-21', '00:00', HCM) + day * DAY_MS + hour * HOUR_MS;

const queue = (ids: readonly string[]): ErrorTargets =>
  ids.reduce<ErrorTargets>((t, id) => noteRecurringError(t, id, on(0)).targets, []);

describe('two error targets at a time', () => {
  it('activates the first two recurring errors and queues the rest', () => {
    const targets = queue(['past_ed', 'final_s', 'articles', 'final_consonants']);
    expect(targets.map((t) => [t.id, t.status])).toEqual([
      ['past_ed', 'active'],
      ['final_s', 'active'],
      ['articles', 'waiting'],
      ['final_consonants', 'waiting'],
    ]);
    expect(noteRecurringError(targets, 'past_ed', on(1)).targets).toBe(targets);
  });

  it('prompts an active target and recasts everything else', () => {
    const targets = queue(['past_ed', 'final_s', 'articles']);
    expect(errorResponse(targets, 'past_ed')).toBe('prompt');
    expect(errorResponse(targets, 'articles')).toBe('recast');
    expect(errorResponse(targets, 'never_seen')).toBe('recast');
  });

  it('graduates after 5 self-corrections across 3 days, then activates the next in the queue', () => {
    let targets = queue(['past_ed', 'final_s', 'articles']);
    const days = [1, 1, 1, 2, 2]; // five corrections, only two days
    for (const day of days) {
      const r = recordSelfCorrection(targets, 'past_ed', on(day), HCM);
      expect(r.counted).toBe(true);
      expect(r.graduated).toBeNull();
      targets = r.targets;
    }
    const sixth = recordSelfCorrection(targets, 'past_ed', on(4), HCM);
    expect(sixth.graduated).toBe('past_ed');
    expect(sixth.activated).toEqual(['articles']);
    expect(activeTargets(sixth.targets).map((t) => t.id)).toEqual(['final_s', 'articles']);
    expect(graduatedTargets(sixth.targets).map((t) => t.id)).toEqual(['past_ed']);
    expect(errorResponse(sixth.targets, 'past_ed')).toBe('recast');
  });

  it('needs five corrections even across three days', () => {
    let targets = queue(['past_ed']);
    for (const day of [1, 2, 3, 4]) {
      targets = recordSelfCorrection(targets, 'past_ed', on(day), HCM).targets;
    }
    expect(targets[0]?.status).toBe('active');
    expect(recordSelfCorrection(targets, 'past_ed', on(5), HCM).graduated).toBe('past_ed');
  });

  it('counts days in the learner’s timezone', () => {
    let targets = queue(['past_ed']);
    // 08:00 and 23:00 local on day 1 are one day; 00:30 on day 2 is the next.
    for (const at of [on(1, 8), on(1, 23), on(1, 23.5), on(2, 0.5), on(2, 0.6)]) {
      targets = recordSelfCorrection(targets, 'past_ed', at, HCM).targets;
    }
    expect(targets[0]?.correctionDays).toEqual(['2026-09-22', '2026-09-23']);
    expect(targets[0]?.status).toBe('active');
  });

  it('ignores self-corrections on a target that isn’t active', () => {
    const targets = queue(['past_ed', 'final_s', 'articles']);
    const r = recordSelfCorrection(targets, 'articles', on(1), HCM);
    expect(r.counted).toBe(false);
    expect(r.targets).toBe(targets);
  });

  it('never has more than two active, and stays valid for the contract', () => {
    const event = fc.oneof(
      fc.record({
        kind: fc.constant('note' as const),
        id: fc.constantFrom('a', 'b', 'c', 'd', 'e'),
      }),
      fc.record({
        kind: fc.constant('fix' as const),
        id: fc.constantFrom('a', 'b', 'c', 'd', 'e'),
        day: fc.integer({ min: 0, max: 30 }),
      }),
    );
    fc.assert(
      fc.property(fc.array(event, { maxLength: 60 }), (events) => {
        let targets: ErrorTargets = [];
        let graduations = 0;
        for (const e of events) {
          if (e.kind === 'note') {
            targets = noteRecurringError(targets, e.id, on(0)).targets;
          } else {
            const r = recordSelfCorrection(targets, e.id, on(e.day), HCM);
            if (r.graduated !== null) graduations++;
            targets = r.targets;
          }
          expect(activeTargets(targets).length).toBeLessThanOrEqual(2);
          // A free active slot only exists when nothing is waiting.
          if (activeTargets(targets).length < 2) {
            expect(targets.some((t) => t.status === 'waiting')).toBe(false);
          }
          for (const t of targets) {
            const wire = toErrorTargetProgress(t);
            expect(ErrorTargetProgress.safeParse(wire).success).toBe(true);
            expect(fromErrorTargetProgress(wire)).toEqual(t);
          }
        }
        expect(graduatedTargets(targets)).toHaveLength(graduations);
        const progress = {
          revision: 1,
          installedOn: '2026-09-21',
          dayIndex: 1,
          phrases: [],
          errorTargets: targets.map(toErrorTargetProgress),
          canDos: [],
          keepsakes: [],
          weeks: [],
        };
        expect(Progress.safeParse(progress).success).toBe(true);
      }),
    );
  });
});

describe('error targets by stage', () => {
  it('start at Newcomer: a Visitor is never asked back, every error is recast', () => {
    expect(errorTargetsApply('visitor')).toBe(false);
    for (const s of ['newcomer', 'neighbour', 'regular', 'local', 'voice'] as const) {
      expect(errorTargetsApply(s)).toBe(true);
    }
  });
});
