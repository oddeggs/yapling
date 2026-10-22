import type { Stage } from '@yapling/contracts';
import type { PipsMinuteLines } from '@yapling/domain';
import { describe, expect, it } from 'vitest';

import { findScene, getScene, PHRASES } from './catalogue';
import { checkSceneLevel } from './level-check';
import { findLine } from './lines';
import {
  allPipsMinuteScenes,
  parsePipsMinuteSceneId,
  PIPS_MINUTE_LINES,
  pipsMinuteOpeningFor,
  pipsMinuteScene,
  pipsMinuteSceneFor,
  type PipsMinuteSpec,
} from './pips-minute';
import { reduceScene, sceneReducer, startScene, type SceneEvent, type Step } from './runner';
import { PIPS_MINUTE_LINE_IDS } from './season-checks';
import { S1_PIPS_MINUTE } from './season-1/pips-minute';
import { callKindOf, type Scene } from './types';
import { validateScene, visitorLineProblems } from './validate';

const spec = (due: string, reuse: string | null = null, extra: Partial<PipsMinuteSpec> = {}) => ({
  due,
  reuse,
  opening: 1 as const,
  intro: false,
  ...extra,
});

const build = (due: string, reuse: string | null = null, extra: Partial<PipsMinuteSpec> = {}) => {
  const scene = pipsMinuteScene(spec(due, reuse, extra));
  if (!scene) throw new Error(`no Pip's minute for ${due}`);
  return scene;
};

type Kind = SceneEvent['type'];

/** Plays it, answering each turn `first` once and `then` after; returns the effects. */
const play = (scene: Scene, stage: Stage, first: Kind, then: Kind = first) => {
  let step: Step = startScene(scene, stage);
  const effects = [...step.effects];
  let turn: string | null = null;
  for (let n = 0; n < 200 && step.state.phase !== 'ended'; n++) {
    const { phase, beatId } = step.state;
    let type: Kind = phase === 'playing' ? 'rec_played' : 'gen_done';
    if (phase === 'listening') {
      type = beatId === turn ? then : first;
      turn = beatId;
    }
    step = reduceScene(scene, step.state, { type });
    effects.push(...step.effects);
  }
  return { ended: step.state.phase === 'ended', effects };
};

describe("Pip's minute", () => {
  it('has a set-up for every phrase of the season and of Settling in', () => {
    expect(Object.keys(S1_PIPS_MINUTE).sort()).toEqual(PHRASES.map((p) => p.id).sort());
    expect(Object.values(S1_PIPS_MINUTE).filter((p) => p.wrong === null)).toHaveLength(2);
    expect(PIPS_MINUTE_LINES.hasWrongLine('deal')).toBe(false);
    expect(PIPS_MINUTE_LINES.hasWrongLine('yes-please')).toBe(false);
    expect(PIPS_MINUTE_LINES.hasSetUp('not-a-phrase')).toBe(false);
  });

  it("gives the learning model's choice what it reads", () => {
    const lines: PipsMinuteLines = PIPS_MINUTE_LINES;
    expect(lines.hasSetUp?.('whats-wrong')).toBe(true);
    expect(lines.hasWrongLine?.('whats-wrong')).toBe(true);
  });

  it('keeps every line to the Visitor’s 8 words, all Pip’s, all glossed', () => {
    expect(PIPS_MINUTE_LINE_IDS).toHaveLength(64);
    for (const id of PIPS_MINUTE_LINE_IDS) {
      expect(visitorLineProblems(id)).toEqual([]);
      expect(findLine(id)?.character, id).toBe('pip');
      expect(findLine(id)?.glosses.vi?.text.length ?? 0, id).toBeGreaterThan(0);
    }
  });

  it('builds a two-turn card scene: set-up, say it, Pip’s mistake, fix it, close', () => {
    const scene = build('whats-wrong', 'can-i-help', { opening: 2 });
    expect(scene.id).toBe('s1-pm.2.whats-wrong.can-i-help');
    expect(scene.kind).toBe('daily');
    expect(callKindOf(scene.kind)).toBeNull();
    expect(scene.phrases).toEqual(['whats-wrong', 'can-i-help']);
    expect(scene.beats.map((b) => (b.kind === 'rec' ? b.line : b.id))).toEqual([
      's1-pm-open-2',
      's1-pm-whats-wrong-setup',
      'say',
      's1-pm-can-i-help-wrong',
      'fix',
      'fixed',
      's1-pm-close-2',
      'grows',
    ]);
    expect(validateScene(scene)).toEqual([]);
  });

  it('plays one turn when no phrase fits the fix, or the one picked has no mistake', () => {
    expect(build('deal').beats.map((b) => b.id)).toEqual([
      'open',
      'set-up',
      'say',
      'close',
      'grows',
    ]);
    const noFix = build('deal', 'yes-please');
    expect(noFix.id).toBe('s1-pm.1.deal');
    expect(noFix.beats.some((b) => b.id === 'fix')).toBe(false);
  });

  it('passes the fix only on the corrected words', () => {
    const fix = build('deal', 'how-much').beats.find((b) => b.id === 'fix');
    expect(fix?.kind === 'learner' ? fix.answer.accept : null).toEqual(['how much']);
    expect(fix?.kind === 'learner' ? fix.answer.choices[0]?.en : null).toBe(
      'How much is the cake?',
    );
  });

  it('shows the card at once at Visitor, after a quiet at Newcomer, and only when asked at Regular', () => {
    const scene = build('can-i-help');
    const firstCard = (stage: Stage, event: Kind) => {
      let step = startScene(scene, stage);
      while (step.state.phase === 'playing') {
        const hint = step.effects.find((e) => e.type === 'hint');
        if (hint) return 'start';
        step = reduceScene(scene, step.state, { type: 'rec_played' });
      }
      if (step.effects.some((e) => e.type === 'hint')) return 'start';
      const after = reduceScene(scene, step.state, { type: event });
      return after.effects.some((e) => e.type === 'hint') ? 'after' : 'none';
    };
    expect(firstCard('visitor', 'silent')).toBe('start');
    expect(firstCard('newcomer', 'silent')).toBe('after');
    expect(firstCard('regular', 'silent')).toBe('none');
    expect(firstCard('regular', 'hint_request')).toBe('after');
  });

  it('answers the fast set-up with the lifesaver: the line again, slower, and the turn passes', () => {
    const scene = build('sorry-again-please');
    let step = startScene(scene, 'newcomer');
    while (step.state.phase === 'playing')
      step = reduceScene(scene, step.state, { type: 'rec_played' });
    expect(step.state.beatId).toBe('say');
    const again = reduceScene(scene, step.state, { type: 'repeat_request' });
    expect(again.effects).toContainEqual(
      expect.objectContaining({
        type: 'play_rec',
        lineId: 's1-pm-sorry-again-please-setup',
        slower: true,
      }),
    );
    const next = reduceScene(scene, again.state, { type: 'rec_played' });
    expect(next.state.beatId).not.toBe('say');
  });

  it('opens with task cards on a learner’s first one', () => {
    const scene = build('whats-wrong', 'deal', { intro: true });
    expect(scene.id).toBe('s1-pm.1i.whats-wrong');
    const task = (id: string) => {
      const beat = build('whats-wrong', 'can-i-help', { intro: true }).beats.find(
        (b) => b.id === id,
      );
      return beat?.kind === 'learner' ? beat.answer.task?.glosses.vi?.text : null;
    };
    expect(task('say')).toBe('Một phút với Pip: đọc thẻ giúp Pip nhé.');
    expect(task('fix')).toBe('Pip nói sai. Đọc câu đúng cho Pip nhé.');
    const plain = build('whats-wrong', 'can-i-help').beats.find((b) => b.id === 'say');
    expect(plain?.kind === 'learner' ? plain.answer.task : 'x').toBeNull();
  });

  it('is rebuilt from its id alone, so a call and a resumed call find it', () => {
    const id = 's1-pm.3.im-good-at.thank-you-all';
    expect(parsePipsMinuteSceneId(id)).toEqual(spec('im-good-at', 'thank-you-all', { opening: 3 }));
    expect(findScene(id)?.id).toBe(id);
    const start = startScene(getScene(id), 'visitor');
    expect(sceneReducer(start.state, { type: 'rec_played' }).state.sceneId).toBe(id);
    for (const bad of [
      's1-pm.4.deal',
      's1-pm.1.nope',
      's1-pm.1.deal.deal',
      's1-pm.1.whats-wrong.deal',
      's1-e1',
    ]) {
      expect(parsePipsMinuteSceneId(bad), bad).toBeNull();
    }
    expect(findScene('s1-pm.1.nope')).toBeUndefined();
  });

  it("turns the learning model's choice into the day's scene, with a new opener each day", () => {
    const minute = { due: { id: 'how-about' }, reuse: { id: 'im-from' } };
    expect(pipsMinuteSceneFor(minute, { dayIndex: 9 })?.id).toBe('s1-pm.3.how-about.im-from');
    expect(pipsMinuteSceneFor(null, { dayIndex: 9 })).toBeNull();
    const openings = Array.from({ length: 30 }, (_, i) => pipsMinuteOpeningFor(i + 1));
    for (let i = 1; i < openings.length; i++) expect(openings[i]).not.toBe(openings[i - 1]);
    expect(new Set(openings)).toEqual(new Set([1, 2, 3]));
  });

  const samples = Object.keys(S1_PIPS_MINUTE).map((due, i, ids) => {
    const reuse = ids
      .slice(i + 1)
      .concat(ids.slice(0, i))
      .find((r) => PIPS_MINUTE_LINES.hasWrongLine(r));
    return build(due, reuse ?? null, { opening: ((i % 3) + 1) as 1 | 2 | 3 });
  });

  it('builds a sound scene for every phrase with every phrase to fix', () => {
    const all = allPipsMinuteScenes();
    expect(all.length).toBe(30 + 30 * 28 - 28);
    for (const scene of all) expect(validateScene(scene), scene.id).toEqual([]);
  });

  it.each(samples.map((s) => [s.id, s] as const))(
    '%s keeps the level guide’s hard rules',
    (_id, scene) => {
      expect(checkSceneLevel(scene).filter((p) => p.severity === 'error')).toEqual([]);
    },
  );

  const KINDS: readonly (readonly [Kind, Kind])[] = [
    ['fine', 'fine'],
    ['unclear', 'unclear'],
    ['target_error', 'target_error'],
    ['skip', 'skip'],
    ['hint_request', 'hint_request'],
    ['meaning_request', 'meaning_request'],
    ['silent', 'fine'],
    ['not_english', 'unclear'],
    ['repeat_request', 'fine'],
    ['slower_request', 'unclear'],
  ];

  for (const stage of ['visitor', 'newcomer', 'regular'] as const) {
    it(`ends at ${stage} for every kind of answer, for every phrase`, () => {
      for (const scene of samples) {
        for (const [first, then] of KINDS) {
          expect(play(scene, stage, first, then).ended, `${scene.id} ${first}/${then}`).toBe(true);
        }
      }
    });
  }

  it('speaks no generated line when the learner answers', () => {
    for (const scene of samples) {
      for (const stage of ['visitor', 'newcomer', 'regular'] as const) {
        for (const [first, then] of [
          ['fine', 'fine'],
          ['unclear', 'unclear'],
        ] as const) {
          const { effects } = play(scene, stage, first, then);
          expect(
            effects.filter((e) => e.type === 'gen'),
            scene.id,
          ).toEqual([]);
        }
      }
    }
  });
});
