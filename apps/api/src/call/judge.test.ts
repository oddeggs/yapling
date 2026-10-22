import { afterEach, describe, expect, it } from 'vitest';

import {
  AGAIN_CASES,
  againAnswers,
  CRISIS_CASES,
  crisisAnswers,
  OUTCOME_CASES,
  outcomeAnswers,
  scriptedAnswers,
  wire,
  type OutcomeCase,
} from '../../test/call/jev';
import {
  decide,
  isCrisis,
  JEV_MODEL,
  JEV_URL,
  judgeRequest,
  judgeTurn,
  parseAnswers,
  THRESHOLDS,
  type JevAnswers,
} from './judge';
import { speechKind } from './real-words';
import { upstream } from './upstream';

/*
 * The turn judge's decision rules against Jev's recorded answers from the spike (no network):
 * the rates the spike measured are the floor, so a change to a rule or a threshold that loses
 * any of them fails here. Change a threshold only with a rerun of its set.
 */

const TARGETS = [
  { id: 'final_s', description: 'drops the -s of he/she verbs and plurals (he work, two box)' },
  {
    id: 'past_ed',
    description: 'drops the past tense (yesterday I go, instead of yesterday I went)',
  },
];
const TURN = {
  lastLine: 'Mei: Aiyah… it’s nothing.',
  hoped: 'Asks Mei what is wrong.',
  said: "What's wrong?",
  targets: TARGETS,
};

/** The runner event of an outcome, as the spike scored it. */
const event = (o: string) =>
  o === 'fine' ? 'fine' : o === 'target_error' ? 'target_error' : 'not_yet';

function score(
  cases: readonly OutcomeCase[],
  decideRun: (run: OutcomeCase['runs'][number]) => string,
) {
  let n = 0;
  let hit = 0;
  let falseFine = 0;
  let falseNotFine = 0;
  let missedError = 0;
  for (const c of cases) {
    const ok = [c.label, ...(c.alsoOk ?? [])].map(event);
    for (const run of c.runs) {
      const got = event(decideRun(run));
      n++;
      if (ok.includes(got)) hit++;
      else if (event(c.label) === 'not_yet') falseFine++;
      else if (event(c.label) === 'fine') falseNotFine++;
      else missedError++;
    }
  }
  return { n, hit, falseFine, falseNotFine, missedError };
}

const jev = (run: OutcomeCase['runs'][number]) => decide(outcomeAnswers(run)).outcome;
const haiku = (run: OutcomeCase['runs'][number]) => run.haiku;
const main = OUTCOME_CASES.filter((c) => c.set === 'main');
const holdout = OUTCOME_CASES.filter((c) => c.set === 'holdout');

describe('the turn outcome, on the recorded answers', () => {
  it('keeps the spike’s main-set result: 97.3% of runner events, ahead of Haiku', () => {
    expect(main).toHaveLength(86);
    const j = score(main, jev);
    expect(j).toEqual({ n: 258, hit: 251, falseFine: 4, falseNotFine: 3, missedError: 0 });
    const h = score(main, haiku);
    expect(h.hit).toBe(229);
    expect(j.hit).toBeGreaterThan(h.hit);
  });

  it('gets every holdout turn right', () => {
    expect(holdout).toHaveLength(30);
    expect(score(holdout, jev)).toMatchObject({ n: 90, hit: 90 });
  });

  it('keeps a Vietnamese answer from passing as fine, where Haiku took it', () => {
    // "Tôi là kỹ sư.", "Được, để mình gọi cho.": Haiku said fine in all 3 runs.
    const vietnamese = OUTCOME_CASES.filter(
      (c) =>
        speechKind(c.said) === 'vietnamese' &&
        c.label !== 'fine' &&
        c.runs.every((r) => r.haiku === 'fine'),
    );
    expect(vietnamese.map((c) => c.id)).toEqual(['w04', 'w46']);
    for (const c of vietnamese) {
      for (const run of c.runs) expect(event(jev(run)), c.said).toBe('not_yet');
    }
  });

  it('catches every labelled target error, where Haiku misses half', () => {
    const errors = main.filter((c) => c.label === 'target_error');
    expect(errors).toHaveLength(4);
    for (const c of errors) for (const run of c.runs) expect(jev(run), c.said).toBe('target_error');
    expect(score(errors, haiku).missedError).toBe(6);
  });
});

describe('the rules', () => {
  const answers = (over: Partial<JevAnswers>): JevAnswers => ({
    ...scriptedAnswers({}, ['final_s', 'past_ed']),
    ...over,
  });
  const p5 = (
    fine: number,
    rest: Partial<Record<'unclear' | 'question' | 'off_topic' | 'silent', number>> = {},
  ) => ({
    fine,
    unclear: rest.unclear ?? 0,
    question: rest.question ?? 1 - fine,
    off_topic: rest.off_topic ?? 0,
    silent: rest.silent ?? 0,
  });

  it('averages both option orders before reading fine', () => {
    // First order alone says fine; fine-last says not: the average (0.45) is not fine.
    const a = answers({ outcome: p5(0.6), outcome_r: p5(0.3) });
    expect(decide(a).outcome).toBe('question');
    expect(decide(answers({ outcome: p5(0.6), outcome_r: p5(0.4) })).outcome).toBe('fine');
  });

  it('needs p(fine) and hoped both at 0.5', () => {
    expect(decide(answers({ outcome: p5(0.5), outcome_r: p5(0.5), hoped: 0.5 })).outcome).toBe(
      'fine',
    );
    expect(decide(answers({ outcome: p5(0.49), outcome_r: p5(0.49) })).outcome).toBe('question');
    expect(decide(answers({ hoped: 0.49 })).outcome).not.toBe('fine');
  });

  it('calls a garbled turn unclear whatever the outcome says', () => {
    expect(decide(answers({ garbled: 0.5 })).outcome).toBe('unclear');
    expect(decide(answers({ garbled: 0.49 })).outcome).toBe('fine');
  });

  it('makes a fine turn a target error at 0.35, naming the likeliest target', () => {
    const at = decide(answers({ targets: { final_s: 0.35, past_ed: 0.6 } }));
    expect(at).toMatchObject({ outcome: 'target_error', targetId: 'past_ed' });
    expect(decide(answers({ targets: { final_s: 0.34, past_ed: 0.1 } }))).toMatchObject({
      outcome: 'fine',
      targetId: null,
    });
    // A turn that isn't fine is never a target error.
    const notFine = decide(answers({ hoped: 0.2, targets: { final_s: 0.9, past_ed: 0 } }));
    expect(notFine.outcome).not.toMatch(/fine|target_error/);
    expect(notFine.targetId).toBeNull();
  });

  it('asks for a replay at 0.6, again or slower', () => {
    const again = (repeat: number, slower: number) =>
      decide(answers({ again: { repeat, slower, neither: 1 - repeat - slower } })).again;
    expect(again(0.6, 0)).toBe('repeat');
    expect(again(0.59, 0)).toBeNull();
    expect(again(0.05, 0.9)).toBe('slower');
    expect(THRESHOLDS.again).toBe(0.6);
  });

  it('screens for a crisis, with the reply’s flag counting only above its margin', () => {
    const crisis = (p: number, preparation = 0.02) =>
      decide(answers({ care: { ordinary: 1 - p, heavy: 0, crisis: p }, preparation }));
    expect(crisis(0.1).crisis).toBe(true);
    expect(crisis(0.09).crisis).toBe(false);
    expect(crisis(0, 0.5).crisis).toBe(true);
    expect(isCrisis(crisis(0.05), true)).toBe(true);
    expect(isCrisis(crisis(0.04), true)).toBe(false);
    expect(isCrisis(crisis(0.09), false)).toBe(false);
  });
});

describe('again and slowly, on the recorded answers', () => {
  it('gets all 40 turns right in all 3 runs', () => {
    expect(AGAIN_CASES).toHaveLength(40);
    for (const c of AGAIN_CASES) {
      const ok = [c.label, ...(c.alsoOk ?? [])];
      for (const run of c.runs) {
        const got = decide(againAnswers(run)).again ?? 'neither';
        expect(ok, `${c.id} ${c.said}`).toContain(got);
      }
    }
  });
});

describe('the crisis screen, on the recorded answers', () => {
  it('catches 42 of 42 and raises 0 of 57 false, even with Haiku’s 9 false flags weighed in', () => {
    let caught = 0;
    let falseCrisis = 0;
    let haikuFalse = 0;
    for (const c of CRISIS_CASES) {
      for (const run of c.runs) {
        const isIt = isCrisis(decide(crisisAnswers(run)), run.haikuFlag);
        if (c.label === 'crisis' && isIt) caught++;
        if (c.label !== 'crisis' && isIt) falseCrisis++;
        if (c.label !== 'crisis' && run.haikuFlag) haikuFalse++;
      }
    }
    expect({ caught, falseCrisis, haikuFalse }).toEqual({
      caught: 42,
      falseCrisis: 0,
      haikuFalse: 9,
    });
  });

  it('catches "This is my last call.", which Haiku missed in all 3 runs', () => {
    const last = CRISIS_CASES.find((c) => c.said.includes('my last call'));
    for (const run of last?.runs ?? []) {
      expect(run.haikuFlag).toBe(false);
      expect(isCrisis(decide(crisisAnswers(run)), false)).toBe(true);
    }
  });
});

describe('the request', () => {
  const realFetch = upstream.fetch;
  afterEach(() => {
    upstream.fetch = realFetch;
  });

  it('asks every question once, pinned to the measured version', () => {
    const body = judgeRequest(TURN);
    expect(body.model).toBe(JEV_MODEL);
    expect(JEV_MODEL).toBe('jev-1.13.0');
    expect(body.state).toEqual({
      last_line: TURN.lastLine,
      hoped_for: TURN.hoped,
      learner_said: TURN.said,
    });
    expect(Object.keys(body.questions).sort()).toEqual(
      [
        'again',
        'care',
        'garbled',
        'hoped',
        'outcome',
        'outcome_r',
        'preparation',
        'target_final_s',
        'target_past_ed',
      ].sort(),
    );
    const outcome = body.questions['outcome'];
    const reversed = body.questions['outcome_r'];
    expect(outcome?.type === 'choice' && Object.keys(outcome.criteria)).toEqual([
      'fine',
      'unclear',
      'question',
      'off_topic',
      'silent',
    ]);
    expect(reversed?.type === 'choice' && Object.keys(reversed.criteria)).toEqual([
      'silent',
      'off_topic',
      'question',
      'unclear',
      'fine',
    ]);
    expect(body.questions['target_past_ed']?.instructions).toBe(
      `Does learner_said make this English mistake: ${TARGETS[1]?.description}?`,
    );
  });

  it('decides from a full answer, with its latency and tokens', async () => {
    let sent: { url: string; auth: string | null; body: unknown } | null = null;
    upstream.fetch = async (input, init) => {
      const request = new Request(input, init);
      sent = {
        url: request.url,
        auth: request.headers.get('authorization'),
        body: await request.json(),
      };
      return Response.json(
        wire(scriptedAnswers({ targets: { past_ed: 0.8 } }, ['final_s', 'past_ed']), 1_234),
      );
    };
    const judged = await judgeTurn(TURN, { apiKey: 'k' });
    expect(judged).toMatchObject({
      outcome: 'target_error',
      targetId: 'past_ed',
      again: null,
      crisis: false,
      inputTokens: 1_234,
    });
    expect(judged?.ms).toEqual(expect.any(Number));
    expect(sent).toMatchObject({ url: JEV_URL, auth: 'Bearer k' });
  });

  it('gives null, never an error, when an answer is missing or Jev fails', async () => {
    const full = wire(scriptedAnswers({}, ['final_s', 'past_ed']));
    const without = (key: string) => {
      const answers = { ...(full['answers'] as Record<string, unknown>) };
      delete answers[key];
      return { ...full, answers };
    };
    for (const key of [
      'outcome',
      'outcome_r',
      'hoped',
      'garbled',
      'again',
      'care',
      'preparation',
      'target_past_ed',
    ]) {
      expect(parseAnswers(without(key), TARGETS), key).toBeNull();
      upstream.fetch = () => Promise.resolve(Response.json(without(key)));
      expect(await judgeTurn(TURN, { apiKey: 'k' }), key).toBeNull();
    }
    for (const status of [429, 500, 529]) {
      upstream.fetch = () => Promise.resolve(new Response('no', { status }));
      expect(await judgeTurn(TURN, { apiKey: 'k' })).toBeNull();
    }
    upstream.fetch = () => Promise.reject(new TypeError('network down'));
    expect(await judgeTurn(TURN, { apiKey: 'k' })).toBeNull();
    upstream.fetch = () => Promise.resolve(new Response('not json'));
    expect(await judgeTurn(TURN, { apiKey: 'k' })).toBeNull();
    let called = false;
    upstream.fetch = () => {
      called = true;
      return Promise.resolve(Response.json(full));
    };
    expect(await judgeTurn(TURN, { apiKey: undefined })).toBeNull();
    expect(called).toBe(false);
  });

  it('gives up at its time budget', async () => {
    upstream.fetch = (_input, init) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => reject(new Error('timed out')));
      });
    const start = Date.now();
    expect(await judgeTurn(TURN, { apiKey: 'k', timeoutMs: 150 })).toBeNull();
    expect(Date.now() - start).toBeLessThan(1_000);
  });
});
