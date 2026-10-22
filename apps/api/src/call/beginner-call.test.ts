import { runInDurableObject } from 'cloudflare:test';
import { env } from 'cloudflare:workers';
import type { Stage } from '@yapling/contracts';
import { findLine } from '@yapling/story';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { call, newGuest } from '../auth/testing/client';
import { readProfile } from '../profile/store';
import { userObject } from '../user';
import { Phone } from '../../test/call/phone';
import { control, Providers } from '../../test/call/providers';
import type { CallData } from './finalize';
import { quietTiming } from './session';

/*
 * The beginner path end to end through the call object with the providers faked: Settling-in
 * Chapters 1–3 played with recorded beginner answers (one-word answers, Vietnamese, a long
 * silence, "Sorry? Again, please", "Slowly, please"), every card turn decided by its words with no
 * model; the placement call setting the stage; "again" and the pace in a Newcomer Episode 1 call.
 */

let providers: Providers;
/** The outcome of each answer the listener's line judges (the placement's open boxes). */
let outcomes: string[];
beforeEach(() => {
  providers = new Providers().install();
  outcomes = [];
  providers.reply = (request) => {
    const direction = JSON.stringify(request.messages.at(-1)?.content ?? '');
    if (direction.includes('what the learner just said')) {
      const outcome = outcomes.shift() ?? 'fine';
      return `[${outcome}] Okay! Next box.${control({ outcome })}`;
    }
    return `Oof! Is it yours?${control({ outcome: 'fine' })}`;
  };
  vi.spyOn(env.JOBS, 'send').mockResolvedValue(
    undefined as unknown as Awaited<ReturnType<Queue['send']>>,
  );
});
afterEach(() => {
  providers.uninstall();
  quietTiming.offerMs = 30_000;
  vi.restoreAllMocks();
});

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** A learner who has onboarded with a name, on a start path. */
async function learner(startPath: 'visitor' | 'placement' = 'visitor') {
  const session = await newGuest();
  const response = await call('/api/me/profile', {
    method: 'PUT',
    token: session.token,
    body: {
      displayName: 'Lan',
      firstLanguage: 'vi',
      roommate: { species: 'redpanda', name: 'Pip' },
      track: 'work',
      quietHours: null,
      timezone: 'Asia/Ho_Chi_Minh',
      notificationsAllowed: true,
      startPath,
    },
  });
  expect(response.status).toBe(200);
  return session;
}

const beat = (phone: Phone, beatId: string, from = 0) =>
  phone.next('beat', (b) => b.beatId === beatId, { from, timeoutMs: 10_000 });

/** One spoken turn; returns where its frames start and what was heard. */
async function say(phone: Phone, text: string) {
  providers.speech.push(text);
  const from = phone.frames.length;
  phone.speak(900);
  const heard = await phone.next('heard', () => true, { from });
  return { from, heard };
}

const played = (phone: Phone, from = 0) =>
  phone.frames.slice(from).flatMap((f) => (f.type === 'play_rec' ? [f.lineId] : []));

/** The call's plain data, read inside the call object. */
async function dataOf(resumeToken: string): Promise<CallData> {
  const stub = env.CALL.get(env.CALL.idFromString(resumeToken.split('.')[0] ?? ''));
  return runInDurableObject(stub, (instance) => {
    const session = (instance as unknown as { session: { data: CallData } }).session;
    return structuredClone(session.data);
  });
}

/** The turn log lines so far. */
const turnLogs = (log: { mock: { calls: unknown[][] } }) =>
  log.mock.calls
    .map(([entry]) => entry as Record<string, unknown>)
    .filter((entry) => entry['msg'] === 'call turn');

async function settling(sceneId: string, token: string, stage: Stage = 'visitor') {
  const phone = await Phone.call(token, { kind: 'settling', sceneId, stage });
  const ready = await phone.next('ready');
  return { phone, ready };
}

describe('Settling in', () => {
  it('plays Chapter 1 with one-word answers, Vietnamese, a long silence and "again"', async () => {
    const log = vi.spyOn(console, 'log');
    const { token, userId } = await learner();
    const before = await userObject(env, userId).balance();
    const { phone, ready } = await settling('s1-set1', token);
    // The card is up from the start, with its Vietnamese and the line that says it.
    await beat(phone, 'say-hi');
    const hint = await phone.next('hint');
    expect(hint).toMatchObject({
      phrase: 'Hi!',
      gloss: 'Chào!',
      choices: [{ phrase: 'Hi!', gloss: 'Chào!' }],
      modelLineId: 's1-set1-01',
      persistent: true,
    });
    await sleep(100);
    let turn = await say(phone, 'Hi!');
    expect(turn.heard.text).toBe('Hi!');
    // Pip copies the learner straight away, from its recording: no model line.
    await phone.next('play_rec', (p) => p.lineId === 's1-set1-03', { from: turn.from });

    await beat(phone, 'say-name');
    const nameCard = await phone.next('hint', (h) => h.phrase.includes('Lan'), { from: turn.from });
    expect(nameCard.choices?.[0]).toEqual({ phrase: "I'm Lan.", gloss: 'Mình là Lan.' });
    await sleep(100);
    // Vietnamese is never a try: Linh asks, once, for the card in English.
    turn = await say(phone, 'Mình là Lan.');
    await phone.next('play_rec', (p) => p.lineId === 's1-set-linh-english', { from: turn.from });
    // A long silence leaves the beat waiting, with nothing said.
    quietTiming.offerMs = 400;
    const quiet = phone.frames.length;
    phone.silence(3_000);
    await sleep(1_200);
    expect(phone.frames.slice(quiet).filter((f) => f.type !== 'minutes')).toEqual([]);
    expect((await dataOf(ready.resumeToken)).runner).toMatchObject({
      beatId: 'say-name',
      tries: 0,
    });
    turn = await say(phone, "I'm Lan.");
    // The name in Linh's live voice, then her recording.
    const splice = await phone.next('say_end', () => true, { from: turn.from });
    expect(splice).toMatchObject({ character: 'linh', text: 'Lan!' });
    await phone.next('play_rec', (p) => p.lineId === 's1-set1-05', { from: turn.from });

    await beat(phone, 'say-nice');
    await sleep(100);
    // "Again" replays the line, from its recording, and is not a try.
    turn = await say(phone, 'Sorry? Again, please.');
    await phone.next('play_rec', (p) => p.lineId === 's1-set1-05', { from: turn.from });
    expect((await dataOf(ready.resumeToken)).runner).toMatchObject({
      beatId: 'say-nice',
      tries: 0,
    });
    await sleep(200);
    turn = await say(phone, 'Nice to meet you, too.');
    await beat(phone, 'say-bye', turn.from);
    await sleep(100);
    turn = await say(phone, 'Bye!');
    const ended = await phone.next('ended', () => true, { from: turn.from, timeoutMs: 10_000 });
    expect(ended.reason).toBe('scene_complete');

    // Every turn passed on its words, the first try; the again ask and the Vietnamese weren't tries.
    const logs = turnLogs(log);
    expect(logs.map((l) => l['pass'])).toEqual(['match', null, 'match', null, 'match', 'match']);
    expect(logs.map((l) => l['replay'])).toEqual([null, null, null, 'repeat', null, null]);
    expect(logs.map((l) => (l['judge'] as { by: string }).by)).toEqual(Array(6).fill('words'));
    // No reply was generated for any card turn, and no minutes were used.
    expect(providers.directions()).toEqual([]);
    expect((await userObject(env, userId).balance()).leftSeconds).toBe(before.leftSeconds);
  }, 40_000);

  it('plays Chapter 2: a miss asks again, the second passes, and Jev reads a misheard card', async () => {
    const log = vi.spyOn(console, 'log');
    providers.jevCard = (request) =>
      request.state.learner_said === 'Bucks.' ? 'card_a' : 'neither';
    const { token } = await learner();
    const { phone } = await settling('s1-set2', token);
    await beat(phone, 'yes-or-no');
    await sleep(100);
    let turn = await say(phone, 'US.');
    await phone.next('play_rec', (p) => p.lineId === 's1-set-linh-okay', { from: turn.from });

    await beat(phone, 'books-or-clothes-answer');
    await sleep(100);
    turn = await say(phone, 'Bucks.');
    await beat(phone, 'pip-tea', turn.from);

    await beat(phone, 'tea-for-you');
    await sleep(100);
    // An English miss: Pip asks "Again?" (in the live voice, it has no recording) and its line plays again.
    turn = await say(phone, 'Tea.');
    await phone.next('say_end', (s) => s.text === 'Again?', { from: turn.from });
    await phone.next('play_rec', (p) => p.lineId === 's1-set2-05', { from: turn.from });
    await sleep(200);
    turn = await say(phone, 'I like it.');
    await beat(phone, 'gift', turn.from);

    await beat(phone, 'thank-linh');
    await sleep(100);
    await say(phone, 'Thanks.');
    expect((await phone.next('ended', () => true, { timeoutMs: 10_000 })).reason).toBe(
      'scene_complete',
    );
    const logs = turnLogs(log);
    expect(logs.map((l) => l['pass'])).toEqual(['match', 'match', null, 'generous', 'match']);
    expect(logs.map((l) => l['cardMatch'])).toEqual([null, true, false, false, null]);
    // Jev was asked only about the English misses.
    expect(providers.jevRequests.map((r) => r.state.learner_said)).toEqual([
      'Bucks.',
      'Tea.',
      'I like it.',
    ]);
    expect(providers.directions()).toEqual([]);
  }, 40_000);

  it('plays Chapter 3: the lifesavers, and asking Pip passes with its line said slower', async () => {
    const log = vi.spyOn(console, 'log');
    const { token } = await learner();
    const { phone } = await settling('s1-set3', token);
    await beat(phone, 'say-again');
    await sleep(100);
    // Saying it is the answer here, not a request.
    let turn = await say(phone, 'Sorry? Again, please.');
    await beat(phone, 'model-slowly', turn.from);
    await beat(phone, 'say-slowly');
    await sleep(100);
    turn = await say(phone, 'Slowly, please.');
    await beat(phone, 'pip-fast', turn.from);

    await beat(phone, 'use-a-lifesaver');
    await sleep(100);
    const voices = providers.ttsVoices.length;
    turn = await say(phone, 'Slowly, please.');
    // "Okay! Slowly." from Pip's recording, then its fast line in its live voice, slower.
    await phone.next('play_rec', (p) => p.lineId === 's1-set-pip-slowly', { from: turn.from });
    const slow = await phone.next('say_end', () => true, { from: turn.from });
    expect(slow).toMatchObject({ character: 'pip', text: findLine('s1-set3-04')?.caption });
    expect(providers.ttsVoices.slice(voices).at(-1)?.speed).toBe(0.7);
    await beat(phone, 'pip-slow', turn.from);

    await beat(phone, 'thank-linh');
    await sleep(100);
    await say(phone, 'Thank you.');
    expect((await phone.next('ended', () => true, { timeoutMs: 10_000 })).reason).toBe(
      'scene_complete',
    );
    const logs = turnLogs(log);
    expect(logs.map((l) => l['pass'])).toEqual(['match', 'match', 'match', 'match']);
    expect(logs.map((l) => l['replay'])).toEqual([null, null, 'slower', null]);
    // The fast line's recording played once; said again, it was the live voice.
    expect(played(phone).filter((id) => id === 's1-set3-04')).toHaveLength(1);
  }, 40_000);

  it('moves on after "Bỏ qua", and keeps the place and the turn counts when left as too hard', async () => {
    const { token, userId } = await learner();
    const { phone } = await settling('s1-set1', token);
    await beat(phone, 'say-hi');
    await sleep(100);
    const turn = await say(phone, 'Hi!');
    await beat(phone, 'say-name', turn.from);
    await sleep(100);
    // "Bỏ qua": Linh says it's okay, from her recording, and the scene goes on.
    const from = phone.frames.length;
    phone.send({ type: 'skip' });
    await phone.next('play_rec', (p) => p.lineId === 's1-set-linh-skip', { from });
    await beat(phone, 'say-nice', from);
    await sleep(100);
    // "Khó quá" → "Tập với Linh trước": the call ends as too hard.
    phone.send({ type: 'hangup', reason: 'too_hard' });
    const ended = await phone.next('ended', () => true, { timeoutMs: 10_000 });
    expect(ended.reason).toBe('too_hard');
    const row = await env.DB.prepare(
      'SELECT end_reason, scene_state, turn_passes FROM calls WHERE id = ? AND user_id = ?',
    )
      .bind(ended.callRecordId, userId)
      .first<{ end_reason: string; scene_state: string | null; turn_passes: string | null }>();
    expect(row?.end_reason).toBe('too_hard');
    // The scene waits where it was left.
    expect(JSON.parse(row?.scene_state ?? 'null')).toMatchObject({
      sceneId: 's1-set1',
      beatId: 'say-nice',
    });
    // The record tells the phone how the turns passed.
    const record = await call(`/api/calls/${ended.callRecordId}`, { token });
    expect(await record.json()).toMatchObject({
      turnPasses: { match: 1, generous: 0, skip: 1, fallback: 0 },
    });
  }, 40_000);

  it('starts with the minutes used up, and charges none', async () => {
    const { token, userId } = await learner();
    await userObject(env, userId).charge(3_600, 'learner');
    const { phone } = await settling('s1-set1', token);
    await beat(phone, 'say-hi');
    expect(phone.of('error')).toEqual([]);
    phone.close();
  }, 20_000);
});

describe('the placement call', () => {
  async function place(answers: { text: string; outcome: string }[]) {
    const log = vi.spyOn(console, 'log');
    const { token, userId } = await learner('placement');
    const phone = await Phone.call(token, { kind: 'placement', sceneId: 'placement' });
    await beat(phone, 'warm-up');
    await phone.next('say_end');
    await sleep(150);
    // The warm-up box is a card turn, never scored.
    let turn = await say(phone, 'Yes.');
    for (const answer of answers) {
      await phone.next('say_end', () => true, { from: turn.from });
      await sleep(150);
      outcomes.push(answer.outcome);
      turn = await say(phone, answer.text);
    }
    await phone.next('ended', () => true, { timeoutMs: 15_000 });
    const placement = log.mock.calls
      .map(([entry]) => entry as Record<string, unknown>)
      .find((entry) => entry['msg'] === 'call placement');
    return { placement, profile: await readProfile(env.DB, userId) };
  }

  it('places A0 answers at Visitor, stopping early after two missed boxes', async () => {
    const { placement, profile } = await place([
      { text: 'Um… I don’t know.', outcome: 'unclear' },
      { text: 'Yes.', outcome: 'unclear' },
      { text: 'Sorry, no.', outcome: 'unclear' },
      { text: 'Teacher.', outcome: 'unclear' },
    ]);
    expect(placement).toMatchObject({ boxes: [false, false], rule: 'visitor', applied: true });
    expect(profile?.stage).toBe('visitor');
  }, 40_000);

  it('places A2 answers at Newcomer', async () => {
    const { placement, profile } = await place([
      { text: "I'm a teacher at a school.", outcome: 'fine' },
      { text: 'After work, I like to play badminton.', outcome: 'fine' },
      { text: 'I want to speak more naturally at meetings.', outcome: 'fine' },
    ]);
    expect(placement).toMatchObject({ boxes: [true, true, true], rule: 'newcomer', applied: true });
    expect(profile?.stage).toBe('newcomer');
  }, 40_000);
});

describe('again, slowly and the pace in a Newcomer Episode 1 call', () => {
  async function episode() {
    const { token } = await newGuest();
    const phone = await Phone.call(token);
    await phone.next('ready');
    await beat(phone, 'ask-whats-wrong');
    await sleep(200);
    return phone;
  }

  it('replays the last line when "Nói lại" is tapped, from its recording', async () => {
    const phone = await episode();
    const from = phone.frames.length;
    phone.send({ type: 'replay', slower: false });
    await phone.next('play_rec', (p) => p.lineId === 's1-e1-03', { from });
    await sleep(200);
    expect(phone.frames.slice(from).some((f) => f.type === 'heard' || f.type === 'beat')).toBe(
      false,
    );
    phone.close();
  }, 20_000);

  it('says it slower when "Chậm thôi" is tapped, and when Jev is down hears "again" itself', async () => {
    const phone = await episode();
    const normal = providers.ttsVoices[0]?.speed ?? 0.8;
    let from = phone.frames.length;
    phone.send({ type: 'replay', slower: true });
    const slow = await phone.next('say_end', () => true, { from });
    expect(slow.text).toBe(findLine('s1-e1-03')?.caption);
    expect(providers.ttsVoices.at(-1)?.speed).toBeCloseTo(normal - 0.1, 5);
    await sleep(300);
    // Jev down: the phrase list hears the ask, and the line is said again, not answered.
    from = (await say(phone, 'Sorry? Again, please.')).from;
    const again = await phone.next('say_end', () => true, { from });
    expect(again.text).toBe(findLine('s1-e1-03')?.caption);
    expect(phone.frames.slice(from).some((f) => f.type === 'beat')).toBe(false);
    phone.close();
  }, 25_000);

  it('speaks slower from the next line after a pace change', async () => {
    const phone = await episode();
    const normal = providers.ttsVoices[0]?.speed ?? 0.8;
    phone.send({ type: 'pace', pace: 'slower' });
    await sleep(100);
    const { from } = await say(phone, "What's wrong?");
    await phone.next('say_end', () => true, { from });
    expect(providers.ttsVoices.at(-1)?.speed).toBeCloseTo(normal - 0.1, 5);
    phone.close();
  }, 20_000);
});
