import { runInDurableObject } from 'cloudflare:test';
import { env } from 'cloudflare:workers';
import type { Stage } from '@yapling/contracts';
import { findLine } from '@yapling/story';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { newGuest } from '../auth/testing/client';
import { readProgress } from '../progress';
import { Phone } from '../../test/call/phone';
import type { JevScript } from '../../test/call/jev';
import { control, Providers } from '../../test/call/providers';

/*
 * Jev judging live turns, end to end through the call object with the providers faked: its case
 * against the reply's, the second line voiced when they differ, "again" and "slowly" replaying
 * the last line without a try, the crisis screen, and the reply's own case when Jev is late.
 */

let providers: Providers;
/** The cases the reply's first line is written for, one per learner turn. */
let lineCases: string[];
beforeEach(() => {
  providers = new Providers().install();
  lineCases = [];
  providers.reply = (request) => {
    const direction = JSON.stringify(request.messages.at(-1)?.content ?? '');
    const judged = /Their turn is \[([a-z_]+)\]/.exec(direction);
    if (judged) {
      const c = judged[1] ?? 'fine';
      return `[${c}] Second line, for ${c.replace('_', ' ')}.${control({ outcome: c, targetId: c === 'target_error' ? 'past_ed' : null })}`;
    }
    if (direction.includes('what the learner just said')) {
      const c = lineCases.shift() ?? 'fine';
      const safety = c === 'flagged' ? { safety: 'crisis' } : {};
      const outcome = c === 'flagged' ? 'fine' : c;
      return `[${outcome}] First line, for ${outcome.replace('_', ' ')}.${control({ outcome, ...safety })}`;
    }
    return `Okay, here we go. Ready?${control({ outcome: 'fine' })}`;
  };
  vi.spyOn(env.JOBS, 'send').mockResolvedValue(
    undefined as unknown as Awaited<ReturnType<Queue['send']>>,
  );
});
afterEach(() => {
  providers.uninstall();
  vi.restoreAllMocks();
});

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const beat = (phone: Phone, beatId: string, from = 0) =>
  phone.next('beat', (b) => b.beatId === beatId, { from });

async function call(stage: Stage = 'newcomer', targets: string[] = []) {
  const { token, userId } = await newGuest();
  if (targets.length > 0) {
    await readProgress(env.DB, userId, Date.now());
    const active = targets.map((id) => ({
      id,
      status: 'active',
      selfCorrections: 0,
      selfCorrectionDays: [],
      activatedAt: 1,
      graduatedAt: null,
    }));
    await env.DB.prepare('UPDATE progress SET error_targets = ? WHERE user_id = ?')
      .bind(JSON.stringify(active), userId)
      .run();
  }
  const phone = await Phone.call(token, { stage });
  const ready = await phone.next('ready');
  await beat(phone, 'ask-whats-wrong');
  await sleep(200);
  return { phone, ready };
}

/**
 * One turn the learner pauses inside: answered (and judged) at the short pause, held, then
 * released by the rest of the silence. Returns where the turn's frames start.
 */
async function turn(phone: Phone, text: string, jev: JevScript, lineCase: string) {
  providers.jev = () => jev;
  lineCases.push(lineCase);
  providers.speech.push(text);
  const from = phone.frames.length;
  phone.speak(1_200, 400);
  await sleep(700);
  phone.silence(600);
  await phone.next('heard', () => true, { from });
  await phone.next('say_end', () => true, { from });
  return from;
}

/** The judge part of each turn's log line so far. */
const judgeLogs = (log: { mock: { calls: unknown[][] } }) =>
  log.mock.calls
    .map(([entry]) => entry as { msg?: string; judge?: Record<string, unknown> })
    .filter((entry) => entry.msg === 'call turn')
    .map((entry) => entry.judge);

const spoken = (phone: Phone, from: number) =>
  phone.frames.slice(from).flatMap((f) => (f.type === 'say_end' ? [f.text] : []));

/** The runner's tries on its beat, read inside the call object. */
async function triesOf(resumeToken: string): Promise<number> {
  const stub = env.CALL.get(env.CALL.idFromString(resumeToken.split('.')[0] ?? ''));
  return runInDurableObject(stub, (instance) => {
    const session = (instance as unknown as { session: { data: { runner: { tries: number } } } })
      .session;
    return session.data.runner.tries;
  });
}

describe('Jev beside the reply', () => {
  it('keeps a Vietnamese answer as not yet, voicing the line for it, where the reply said fine', async () => {
    const log = vi.spyOn(console, 'log');
    const { phone } = await call();
    // Jev answers well before the reply's first word: the second line is already streaming.
    providers.firstTokenDelayMs = 300;
    const from = await turn(phone, 'Tôi là kỹ sư.', { outcome: 'unclear' }, 'fine');
    expect(spoken(phone, from)).toEqual(['Second line, for unclear.']);
    expect(providers.directions().at(-1)).toContain('Their turn is [unclear]');
    await sleep(300);
    expect(phone.frames.slice(from).filter((f) => f.type === 'beat')).toEqual([]);
    expect(judgeLogs(log)).toMatchObject([
      { by: 'jev', outcome: 'unclear', lineCase: 'fine', agree: false, switched: true },
    ]);
    phone.close();
  }, 20_000);

  it('switches lines the same way when Jev answers after the reply’s case', async () => {
    const log = vi.spyOn(console, 'log');
    const { phone } = await call();
    providers.jevDelayMs = 300;
    const from = await turn(phone, 'Tôi là kỹ sư.', { outcome: 'unclear' }, 'fine');
    expect(spoken(phone, from)).toEqual(['Second line, for unclear.']);
    await sleep(300);
    expect(phone.frames.slice(from).filter((f) => f.type === 'beat')).toEqual([]);
    expect(judgeLogs(log)).toMatchObject([
      { by: 'jev', outcome: 'unclear', lineCase: 'fine', agree: false, switched: true },
    ]);
    phone.close();
  }, 20_000);

  it('keeps the reply when Jev agrees, and lets the scene go on', async () => {
    const log = vi.spyOn(console, 'log');
    const { phone } = await call();
    providers.firstTokenDelayMs = 300;
    const from = await turn(phone, "What's wrong?", { outcome: 'fine' }, 'fine');
    expect(spoken(phone, from)).toEqual(['First line, for fine.']);
    await beat(phone, 'mei-deflects', from);
    const line = log.mock.calls
      .map(([entry]) => entry as { msg?: string; judge?: Record<string, unknown> })
      .find((entry) => entry.msg === 'call turn');
    expect(line?.judge).toMatchObject({
      by: 'jev',
      status: 'answered',
      outcome: 'fine',
      lineCase: 'fine',
      agree: true,
      switched: false,
      replay: null,
    });
    expect(line?.judge?.['ms']).toEqual(expect.any(Number));
    phone.close();
  }, 20_000);

  it('lets the reply’s case stand when Jev is late', async () => {
    const { phone } = await call();
    providers.jevDelayMs = 1_500;
    const from = await turn(phone, 'Tôi là kỹ sư.', { outcome: 'unclear' }, 'fine');
    expect(spoken(phone, from)).toEqual(['First line, for fine.']);
    await beat(phone, 'mei-deflects', from);
    expect(providers.jevRequests).toHaveLength(1);
    phone.close();
  }, 20_000);

  it('lets the reply’s case stand when Jev is down', async () => {
    const { phone } = await call();
    providers.jev = null;
    lineCases.push('fine');
    providers.speech.push('Tôi là kỹ sư.');
    const from = phone.frames.length;
    phone.speak();
    await phone.next('say_end', () => true, { from });
    expect(spoken(phone, from)).toEqual(['First line, for fine.']);
    await beat(phone, 'mei-deflects', from);
    phone.close();
  }, 20_000);

  it('catches a target error the reply took as fine, and asks it back', async () => {
    const { phone } = await call('newcomer', ['past_ed']);
    providers.firstTokenDelayMs = 300;
    await turn(phone, 'What happen to you yesterday?', { targets: { past_ed: 0.9 } }, 'fine');
    const correction = await phone.next('correction');
    expect(correction).toMatchObject({
      targetId: 'past_ed',
      original: 'What happen to you yesterday?',
      prompt: 'Second line, for target error.',
    });
    const direction = providers.directions().at(-1) ?? '';
    expect(direction).toContain('Their turn is [target_error]');
    expect(direction).toContain('past_ed');
    phone.close();
  }, 20_000);
});

describe('again and slowly', () => {
  const caption = findLine('s1-e1-03')?.caption ?? '';

  for (const stage of ['newcomer', 'regular'] as const) {
    it(`says the last line again, not a try, at ${stage}`, async () => {
      const { phone, ready } = await call(stage);
      const tries = await triesOf(ready.resumeToken);
      const voices = providers.ttsVoices.length;
      const from = await turn(
        phone,
        'Sorry, can you say that again?',
        { again: 'repeat', outcome: 'unclear' },
        'unclear',
      );
      const say = await phone.next('say_start', () => true, { from });
      expect(say.character).toBe('pip');
      expect(spoken(phone, from)).toEqual([caption]);
      expect(
        providers.ttsTexts
          .at(-1)
          ?.join('')
          .replace(/<[^>]*>/g, ''),
      ).toContain(caption.split(' ')[0]);
      // The stage's own voice: the line as it was.
      const normal = providers.ttsVoices[0]?.speed;
      expect(providers.ttsVoices.slice(voices).at(-1)?.speed).toBe(normal);
      await sleep(300);
      expect(
        phone.frames.slice(from).filter((f) => f.type === 'beat' || f.type === 'hint'),
      ).toEqual([]);
      expect(await triesOf(ready.resumeToken)).toBe(tries);
      // The learner's ask was heard; the next turn is answered on the same beat.
      expect(phone.of('heard').at(-1)).toMatchObject({
        turn: 1,
        text: 'Sorry, can you say that again?',
      });
      const next = await turn(phone, "What's wrong?", { outcome: 'fine' }, 'fine');
      await beat(phone, 'mei-deflects', next);
      phone.close();
    }, 25_000);

    it(`says it slower, with longer breaks, for "slowly" at ${stage}`, async () => {
      const { phone } = await call(stage);
      const normal = providers.ttsVoices[0]?.speed ?? 0;
      const from = await turn(
        phone,
        'Slowly, please.',
        { again: 'slower', outcome: 'unclear' },
        'unclear',
      );
      expect(spoken(phone, from)).toEqual([caption]);
      const voice = providers.ttsVoices.at(-1);
      expect(voice?.speed).toBeCloseTo(normal - 0.1, 5);
      const breaks = stage === 'newcomer' ? '<break time="0.5s" />' : '<break time="0.15s" />';
      expect(providers.ttsTexts.at(-1)?.join('')).toContain(breaks);
      phone.close();
    }, 20_000);
  }
});

describe('the crisis screen', () => {
  it('hands over at once when Jev sees a crisis the reply missed', async () => {
    const { phone } = await call();
    providers.firstTokenDelayMs = 300;
    providers.jev = () => ({ crisis: 0.9 });
    lineCases.push('fine');
    providers.speech.push('I want to say goodbye to everyone. This is my last call.');
    const from = phone.frames.length;
    phone.speak(1_200, 400);
    expect(await phone.next('safety', (s) => s.kind === 'crisis', { from })).toMatchObject({
      resourcesKey: 'crisis.vn',
    });
    const ended = await phone.next('ended', () => true, { from });
    expect(ended.reason).toBe('safety');
    expect(phone.frames.slice(from).filter((f) => f.type === 'say_start')).toEqual([]);
    const row = await env.DB.prepare('SELECT safety_flag FROM calls WHERE id = ?')
      .bind(ended.callRecordId)
      .first();
    expect(row).toEqual({ safety_flag: 'crisis' });
  }, 20_000);

  it('drops the reply’s flag when Jev is sure there is none', async () => {
    const { phone } = await call();
    const from = await turn(phone, 'My grandmother died last year.', { crisis: 0.02 }, 'flagged');
    await beat(phone, 'mei-deflects', from);
    expect(phone.of('safety').filter((s) => s.kind === 'crisis')).toEqual([]);
    phone.close();
  }, 20_000);

  it('keeps the reply’s flag when Jev sees a little risk too', async () => {
    const { phone } = await call();
    providers.jev = () => ({ crisis: 0.06 });
    lineCases.push('flagged');
    providers.speech.push('Nobody would care if I disappear.');
    phone.speak();
    await phone.next('safety', (s) => s.kind === 'crisis');
    expect((await phone.next('ended')).reason).toBe('safety');
  }, 20_000);
});

describe('the cost record', () => {
  it('counts Jev’s input tokens and its latency', async () => {
    const { phone } = await call();
    await turn(phone, "What's wrong?", { outcome: 'fine' }, 'fine');
    phone.send({ type: 'hangup' });
    const ended = await phone.next('ended');
    const row = await env.DB.prepare('SELECT cost, timings FROM calls WHERE id = ?')
      .bind(ended.callRecordId)
      .first<{ cost: string; timings: string }>();
    expect(JSON.parse(row?.cost ?? '{}')).toMatchObject({ jevInputTokens: 1_100 });
    const timings = JSON.parse(row?.timings ?? '{}') as { judge?: unknown };
    expect(timings.judge).toEqual(expect.any(Number));
  }, 20_000);
});
