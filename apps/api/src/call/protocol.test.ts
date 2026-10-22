import { runDurableObjectAlarm, runInDurableObject } from 'cloudflare:test';
import { env } from 'cloudflare:workers';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { newGuest } from '../auth/testing/client';
import { readProgress } from '../progress';
import { userObject } from '../user';
import { pcm, Phone } from '../../test/call/phone';
import { lineTiming } from './line';
import { appClockOffset } from './socket-route';
import { control, Providers } from '../../test/call/providers';

/*
 * The call protocol end to end through the Worker and the call object, with the providers faked
 * in-process: auth, a whole Episode 1 call, corrections, hints, safety, minutes and resume.
 */

let providers: Providers;
let jobs: unknown[];
beforeEach(() => {
  providers = new Providers().install();
  jobs = [];
  vi.spyOn(env.JOBS, 'send').mockImplementation((body: unknown) => {
    jobs.push(body);
    return Promise.resolve(undefined as unknown as Awaited<ReturnType<Queue['send']>>);
  });
});
afterEach(() => {
  providers.uninstall();
  vi.restoreAllMocks();
});

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Replies by the kind of turn: answers to the learner say `fine` unless scripted. */
function script(outcomes: Record<string, unknown>[] = []) {
  providers.reply = (request) => {
    const direction = JSON.stringify(request.messages.at(-1)?.content ?? '');
    if (direction.includes('what the learner just said')) {
      const c = outcomes.shift() ?? { outcome: 'fine', phrasesUsed: [] };
      const line = c['outcome'] === 'target_error' ? 'You go… yesterday?' : 'Oh, thank you! Okay.';
      return `${line}${control(c)}`;
    }
    if (direction.includes('Time is nearly up'))
      return `We can finish next time. Thank you!${control({ outcome: 'fine' })}`;
    return `Okay, here we go. Ready?${control({ outcome: 'fine' })}`;
  };
}

/** One learner turn: the words Scribe will hear, the audio, and the reply's end. */
async function turn(phone: Phone, text: string, voicedMs = 1_200) {
  providers.speech.push(text);
  const from = phone.frames.length;
  phone.speak(voicedMs);
  const heard = await phone.next('heard', () => true, { from });
  await phone.next('say_end', () => true, { from });
  return heard;
}

/** Plays a phone through to a beat: waits for that beat's frame. */
const beat = (phone: Phone, beatId: string, from = 0) =>
  phone.next('beat', (b) => b.beatId === beatId, { from });

describe('the call socket', () => {
  it('refuses a hello without a valid session token', async () => {
    const phone = await Phone.call('not-a-real-session-token-at-all');
    expect(await phone.next('error')).toMatchObject({ code: 'unauthorized', fatal: true });
    expect(phone.of('ready')).toHaveLength(0);
  });

  it('refuses an app on another protocol or with a scene it does not know', async () => {
    const { token } = await newGuest();
    const old = await Phone.call(token, { protocol: 99 });
    expect(await old.next('error')).toMatchObject({ code: 'update_required' });
    const unknown = await Phone.call(token, { sceneId: 's9-e9' });
    expect(await unknown.next('error')).toMatchObject({ code: 'unknown_scene', fatal: true });
  });

  it('refuses a call when no live minutes are left', async () => {
    const { token, userId } = await newGuest();
    await userObject(env, userId).charge(3_600, 'learner');
    const phone = await Phone.call(token);
    expect(await phone.next('error')).toMatchObject({ code: 'minutes_exhausted', fatal: true });
  });
});

describe('an Episode 1 call', () => {
  it('runs the whole scene through the runner and writes the record', async () => {
    script();
    const { token, userId } = await newGuest();
    const phone = await Phone.call(token);
    expect(await phone.next('ready')).toMatchObject({ resumed: false });
    expect(await phone.next('safety')).toMatchObject({ kind: 'ai_disclosure' });
    expect(await phone.next('play_rec')).toMatchObject({ lineId: 's1-e1-02', character: 'mei' });
    await beat(phone, 'ask-whats-wrong');
    await sleep(150);

    expect((await turn(phone, "What's wrong?")).text).toBe("What's wrong?");
    await sleep(150);
    await turn(phone, 'Can I help you?');
    await phone.next('play_rec', (p) => p.lineId === 's1-e1-05');
    await beat(phone, 'teach-rent');
    await sleep(150);
    await turn(phone, 'Rent is the money you pay for a place.');
    await phone.next('play_rec', (p) => p.lineId === 's1-e1-06');
    await beat(phone, 'agree-to-call');
    await sleep(150);
    const agreed = phone.frames.length;
    await turn(phone, 'Sure, I can help.');
    // Mei reacts, then the office answers in its own line.
    await phone.next('say_start', (s) => s.character === 'office', { from: agreed });
    await phone.next('say_end', (s) => s.character === 'office', { from: agreed });
    await sleep(150);
    await turn(phone, "Hi, I'm Lan. I'm calling for Mei.");
    await phone.next('play_rec', (p) => p.lineId === 's1-e1-07');
    await beat(phone, 'advice');
    await sleep(150);
    await turn(phone, 'I think you should go to the meeting.');
    const ended = await phone.next('ended', () => true, { timeoutMs: 10_000 });
    expect(ended).toMatchObject({ reason: 'scene_complete', summaryPending: true });

    const beats = phone.of('beat').map((b) => b.beatId);
    expect(beats).toEqual([
      'open',
      'notice',
      'ask-whats-wrong',
      'mei-deflects',
      'mei-shows-letter',
      'letter',
      'double',
      'rent-question',
      'teach-rent',
      'notebook',
      'pip-writes',
      'ask-call',
      'agree-to-call',
      'dial',
      'office-answers',
      'office-resolves',
      'hang-up',
      'what-now',
      'advice',
      'mei-warm',
      'pip-job',
      'close',
    ]);
    // Recorded beats in order; the recorded reactions ("Ooh," "Mm,") lead generated replies.
    const recorded = phone.of('play_rec').map((p) => p.lineId);
    const reactions = recorded.filter((id) => id.startsWith('s1-react-'));
    expect(reactions.length).toBeGreaterThan(0);
    expect(recorded.filter((id) => !id.startsWith('s1-react-'))).toEqual([
      's1-e1-02',
      's1-e1-03',
      's1-e1-04',
      's1-e1-05',
      's1-e1-06',
      's1-e1-07',
      's1-e1-08',
      's1-e1-09',
    ]);
    expect(phone.of('heard').map((h) => h.turn)).toEqual([1, 2, 3, 4, 5, 6]);
    const progress = phone.of('beat').map((b) => b.progress);
    expect(progress).toEqual([...progress].sort((a, b) => a - b));

    // Every generated line streamed audio with alignment, and no control text reached the voice.
    for (const say of phone.of('say_end'))
      expect(phone.audioBytes.get(say.streamId) ?? 0).toBeGreaterThan(0);
    expect(phone.of('alignment').length).toBeGreaterThan(0);
    for (const texts of providers.ttsTexts) {
      expect(texts.join('')).not.toMatch(/[§{}]|outcome/);
    }
    // Newcomer pace: the stage's speed, and breaks between phrases.
    expect(providers.ttsVoices.every((v) => v.speed === 0.8)).toBe(true);
    expect(providers.ttsTexts.flat().join('')).toContain('<break time="0.35s" />');
    for (const a of phone.of('alignment')) expect(a.chars.join('')).not.toMatch(/[<>]/);

    const row = await env.DB.prepare('SELECT * FROM calls WHERE id = ?')
      .bind(ended.callRecordId)
      .first<{
        user_id: string;
        end_reason: string;
        summary_pending: number;
        transcript_key: string;
        cost: string;
        timings: string;
      }>();
    expect(row).toMatchObject({
      user_id: userId,
      end_reason: 'scene_complete',
      summary_pending: 1,
    });
    const cost = JSON.parse(row?.cost ?? '{}') as {
      ttsChars: number;
      sttSeconds: number;
      usd: number;
    };
    expect(cost.ttsChars).toBeGreaterThan(0);
    expect(cost.sttSeconds).toBeGreaterThan(0);
    expect(JSON.parse(row?.timings ?? '{}')).toMatchObject({ turns: 6 });
    const transcript = await env.BLOBS.get(row?.transcript_key ?? '');
    const file = (await transcript?.json()) as { lines: { speaker: string; words?: unknown[] }[] };
    expect(file.lines.filter((l) => l.speaker === 'learner')).toHaveLength(6);
    expect(jobs).toEqual([{ type: 'post_call', callId: ended.callRecordId, userId }]);
  }, 60_000);

  it('asks a target error back and resolves it on the second try', async () => {
    script([
      { outcome: 'target_error', targetId: 'past_ed' },
      { outcome: 'fine', phrasesUsed: ['whats-wrong'] },
    ]);
    const { token, userId } = await newGuest();
    await readProgress(env.DB, userId, Date.now());
    await env.DB.prepare('UPDATE progress SET error_targets = ? WHERE user_id = ?')
      .bind(
        JSON.stringify([
          {
            id: 'past_ed',
            status: 'active',
            selfCorrections: 0,
            selfCorrectionDays: [],
            activatedAt: 1,
            graduatedAt: null,
          },
        ]),
        userId,
      )
      .run();
    const phone = await Phone.call(token);
    await beat(phone, 'ask-whats-wrong');
    await sleep(200);
    await turn(phone, 'What happen yesterday?');
    const correction = await phone.next('correction');
    expect(correction).toMatchObject({
      targetId: 'past_ed',
      original: 'What happen yesterday?',
      prompt: 'You go… yesterday?',
    });
    expect(providers.directions().at(-1)).toContain('past_ed');
    await sleep(150);
    await turn(phone, 'What happened yesterday?');
    expect(await phone.next('correction_resolved')).toMatchObject({
      targetId: 'past_ed',
      fixed: true,
    });
    expect(providers.directions().at(-1)).toContain('second try');
    await beat(phone, 'mei-deflects');
    phone.send({ type: 'hangup' });
    expect(await phone.next('ended')).toMatchObject({ reason: 'hangup' });
  }, 30_000);

  it('slides the phrase hint up after the stage pause of silence', async () => {
    script();
    const { token } = await newGuest();
    const phone = await Phone.call(token);
    await beat(phone, 'ask-whats-wrong');
    await sleep(200);
    phone.silence(3_000);
    await sleep(200);
    expect(phone.of('hint')).toHaveLength(0);
    phone.silence(1_500);
    expect(await phone.next('hint')).toMatchObject({
      type: 'hint',
      phrase: "What's wrong?",
      gloss: 'Có chuyện gì vậy?',
    });
    phone.close();
  }, 20_000);

  it('waits while the learner holds, then hints', async () => {
    script();
    const { token } = await newGuest();
    const phone = await Phone.call(token);
    await beat(phone, 'ask-whats-wrong');
    await sleep(200);
    phone.send({ type: 'hold', seconds: 30 });
    await sleep(50);
    phone.silence(6_000);
    await sleep(400);
    expect(phone.of('hint')).toHaveLength(0);
    phone.send({ type: 'hold', seconds: 0 });
    await sleep(50);
    phone.silence(4_500);
    await phone.next('hint');
    phone.close();
  }, 20_000);

  it('steps out of the scene for a crisis and ends the call', async () => {
    script([{ outcome: 'fine', safety: 'crisis' }]);
    const { token } = await newGuest();
    const phone = await Phone.call(token);
    await beat(phone, 'ask-whats-wrong');
    await sleep(200);
    providers.speech.push('I do not want to live anymore.');
    phone.speak();
    expect(await phone.next('safety', (s) => s.kind === 'crisis')).toMatchObject({
      resourcesKey: 'crisis.vn',
    });
    const ended = await phone.next('ended');
    expect(ended.reason).toBe('safety');
    const row = await env.DB.prepare('SELECT safety_flag FROM calls WHERE id = ?')
      .bind(ended.callRecordId)
      .first();
    expect(row).toEqual({ safety_flag: 'crisis' });
  }, 20_000);

  it('wraps up kindly when the minutes run low, then ends and keeps the scene’s place', async () => {
    script();
    const { token, userId } = await newGuest();
    await userObject(env, userId).charge(3_530, 'learner');
    const phone = await Phone.call(token);
    expect(await phone.next('ready')).toMatchObject({ secondsLeft: 70 });
    await beat(phone, 'ask-whats-wrong');
    await sleep(200);
    providers.speech.push("What's wrong?");
    phone.speak(15_000);
    expect(await phone.next('minutes', (m) => m.wrappingUp)).toMatchObject({ wrappingUp: true });
    await phone.next('say_end', () => true);
    const ended = await phone.next('ended', () => true, { timeoutMs: 10_000 });
    expect(ended.reason).toBe('minutes_exhausted');
    expect(providers.directions().some((d) => d.includes('Time is nearly up'))).toBe(true);
    const row = await env.DB.prepare('SELECT scene_state FROM calls WHERE id = ?')
      .bind(ended.callRecordId)
      .first<{ scene_state: string }>();
    expect(JSON.parse(row?.scene_state ?? 'null')).toMatchObject({
      sceneId: 's1-e1',
      beatId: 'mei-deflects',
    });

    // The next call of the scene picks up at the saved beat.
    await userObject(env, userId).setPlan('plus', Date.now());
    const next = await Phone.call(token);
    expect(await next.next('ready')).toMatchObject({ resumed: false });
    expect((await next.next('beat')).beatId).toBe('mei-deflects');
    next.close();
  }, 40_000);

  it('resumes the beat when the phone reconnects with its resume token', async () => {
    script();
    const { token } = await newGuest();
    const phone = await Phone.call(token);
    const ready = await phone.next('ready');
    await beat(phone, 'ask-whats-wrong');
    await sleep(200);
    await turn(phone, "What's wrong?");
    await beat(phone, 'mei-deflects');
    await sleep(200);
    phone.close();
    await sleep(100);

    const again = await Phone.call(token, { resumeToken: ready.resumeToken });
    const resumed = await again.next('ready');
    expect(resumed).toMatchObject({ resumed: true, sessionId: ready.sessionId });
    expect(again.of('safety')).toHaveLength(0);
    expect(await again.next('beat')).toMatchObject({ beatId: 'mei-deflects' });
    await sleep(200);
    await turn(again, 'Can I help?');
    await again.next('play_rec', (p) => p.lineId === 's1-e1-04');
    again.send({ type: 'hangup' });
    expect(await again.next('ended')).toMatchObject({
      reason: 'hangup',
      callRecordId: ready.sessionId,
    });
  }, 30_000);

  it('a stale or foreign resume token starts a new call instead', async () => {
    script();
    const { token } = await newGuest();
    const phone = await Phone.call(token, { resumeToken: `${'a'.repeat(64)}.nope-nope-nope` });
    expect(await phone.next('ready')).toMatchObject({ resumed: false });
    phone.close();
  });
});

describe('help in the call', () => {
  it('explains a line in simple English with the gloss a tap deeper, then says it', async () => {
    script();
    const { token } = await newGuest();
    const phone = await Phone.call(token);
    await phone.next('play_rec', (p) => p.lineId === 's1-e1-02');
    phone.send({ type: 'meaning_request', subject: { kind: 'last_line' } });
    const meaning = await phone.next('meaning');
    expect(meaning).toMatchObject({ simple: 'It means money.', gloss: 'tiền' });
    expect(meaning.about.length).toBeGreaterThan(0);
    phone.send({ type: 'meaning_request', subject: { kind: 'phrase', text: "What's wrong?" } });
    expect(await phone.next('meaning', (m) => m.about === "What's wrong?")).toMatchObject({
      gloss: 'Có chuyện gì vậy?',
    });
    const said = await phone.next('say_end', (s) => s.text === 'It means money.');
    expect(said.character).toBe('pip');
    phone.close();
  }, 20_000);
});

describe('a dropped call', () => {
  it('is written up as idle once the resume window passes', async () => {
    script();
    const { token, userId } = await newGuest();
    const phone = await Phone.call(token);
    const ready = await phone.next('ready');
    await beat(phone, 'ask-whats-wrong');
    phone.close();
    await sleep(150);
    const stub = env.CALL.get(env.CALL.idFromString(ready.resumeToken.split('.')[0] ?? ''));
    await runInDurableObject(stub, async (_instance, state) => {
      const data = await state.storage.get<{ detachedAt: number | null }>('call');
      expect(data?.detachedAt).toEqual(expect.any(Number));
      await state.storage.put('call', { ...data, detachedAt: 1 });
    });
    await runInDurableObject(stub, (instance) => {
      const session = (instance as unknown as { session: { data: { detachedAt: number } } | null })
        .session;
      if (session) session.data.detachedAt = 1;
    });
    expect(await runDurableObjectAlarm(stub)).toBe(true);
    const row = await env.DB.prepare('SELECT end_reason FROM calls WHERE id = ? AND user_id = ?')
      .bind(ready.sessionId, userId)
      .first();
    expect(row).toEqual({ end_reason: 'idle' });
    expect(await stub.canResume(ready.resumeToken)).toBe(false);
  }, 20_000);
});

describe('turn-taking', () => {
  it('never answers a pause under 700 ms, and drops a reply when the learner goes on', async () => {
    script();
    const { token } = await newGuest();
    const phone = await Phone.call(token);
    await beat(phone, 'ask-whats-wrong');
    await sleep(200);
    const from = phone.frames.length;
    const before = providers.directions().length;
    providers.speech.push('I think we put the books.', 'On the shelf.');
    phone.speak(1_000, 400);
    await sleep(300);
    expect(phone.frames.slice(from).filter((f) => f.type === 'say_start')).toHaveLength(0);
    phone.speak(800, 900);
    const heard = await phone.next('heard', () => true, { from });
    expect(heard.text).toBe('I think we put the books... on the shelf.');
    await phone.next('say_end', () => true, { from });
    expect(phone.frames.slice(from).filter((f) => f.type === 'say_start')).toHaveLength(1);
    expect(phone.of('heard').filter((h) => h.turn === 1)).toHaveLength(1);
    // The first segment's reply was started speculatively, then dropped.
    expect(providers.directions().length - before).toBeGreaterThanOrEqual(2);
    phone.close();
  }, 20_000);

  it('waits longer after a word that rarely ends a sentence', async () => {
    script();
    const { token } = await newGuest();
    const phone = await Phone.call(token);
    await beat(phone, 'ask-whats-wrong');
    await sleep(200);
    const from = phone.frames.length;
    providers.speech.push('I put the books on the');
    phone.speak(1_000, 900);
    await sleep(400);
    expect(phone.frames.slice(from).filter((f) => f.type === 'say_start')).toHaveLength(0);
    phone.silence(400);
    await phone.next('say_start', () => true, { from });
    phone.close();
  }, 20_000);
});

describe('a slow or failed reply', () => {
  afterEach(() => {
    lineTiming.stallMs = 10_000;
  });

  /** Hold-to-talk: the learner presses, says it, and lets go. */
  const holdAndSay = (phone: Phone, text: string) => {
    providers.speech.push(text);
    phone.mic(pcm(1_200, true));
    phone.mic(pcm(200, false));
    phone.send({ type: 'end_turn' });
  };

  it('tilts the head while a hold-to-talk reply is slow, then answers', async () => {
    script();
    const { token } = await newGuest();
    const phone = await Phone.call(token, { turnMode: 'hold_to_talk' });
    await beat(phone, 'ask-whats-wrong');
    await sleep(200);
    providers.firstTokenDelayMs = 1_500;
    const from = phone.frames.length;
    holdAndSay(phone, "What's wrong?");
    const thinking = await phone.next('thinking', (t) => t.state === 'start', { from });
    const start = await phone.next('say_start', () => true, { from });
    expect(phone.frames.indexOf(thinking)).toBeLessThan(phone.frames.indexOf(start));
    await phone.next('heard', () => true, { from });
    phone.close();
  }, 20_000);

  it('says the reply failed when the model goes quiet, and lets the learner answer again', async () => {
    script();
    lineTiming.stallMs = 400;
    const { token } = await newGuest();
    const phone = await Phone.call(token, { turnMode: 'hold_to_talk' });
    await beat(phone, 'ask-whats-wrong');
    await sleep(200);
    providers.firstTokenDelayMs = 15_000;
    const from = phone.frames.length;
    holdAndSay(phone, "What's wrong?");
    expect(await phone.next('error', () => true, { from })).toMatchObject({
      code: 'llm_failed',
      fatal: false,
    });
    expect(phone.frames.slice(from).filter((f) => f.type === 'heard')).toHaveLength(0);
    // The scene still waits on the same beat: the next try is answered.
    providers.firstTokenDelayMs = 5;
    const again = phone.frames.length;
    holdAndSay(phone, "What's wrong?");
    await phone.next('heard', () => true, { from: again });
    await phone.next('say_end', () => true, { from: again });
    phone.close();
  }, 25_000);
});

describe('latency', () => {
  it('plays the reaction at once in hold-to-talk and files the phone’s lag for both lines', async () => {
    script();
    const { token } = await newGuest();
    const phone = await Phone.call(token, { turnMode: 'hold_to_talk' });
    await beat(phone, 'ask-whats-wrong');
    await sleep(200);
    providers.firstTokenDelayMs = 400;
    const from = phone.frames.length;
    providers.speech.push("What's wrong?");
    phone.mic(pcm(1_200, true));
    phone.send({ type: 'end_turn' });
    const reaction = await phone.next('play_rec', (p) => p.lineId.startsWith('s1-react-mei'), {
      from,
    });
    const reply = await phone.next('say_start', () => true, { from });
    expect(phone.frames.indexOf(reaction)).toBeLessThan(phone.frames.indexOf(reply));
    await phone.next('say_end', () => true, { from });
    await sleep(300);
    phone.send({ type: 'hangup' });
    const ended = await phone.next('ended');
    const row = await env.DB.prepare('SELECT timings FROM calls WHERE id = ?')
      .bind(ended.callRecordId)
      .first<{ timings: string }>();
    // The test phone reports 900 ms for every line it plays.
    expect(JSON.parse(row?.timings ?? '{}')).toMatchObject({
      phoneLag: 900,
      phoneReaction: 900,
      phoneReply: 900,
    });
  }, 20_000);
});

describe("a test build's clock", () => {
  const DAY = 24 * 3_600_000;

  it('is honoured only by the dev Worker, and only when it makes sense', () => {
    const now = 1_790_000_000_000;
    expect(appClockOffset('dev', String(now + 4 * DAY), now)).toBe(4 * DAY);
    expect(appClockOffset('prd', String(now + 4 * DAY), now)).toBe(0);
    expect(appClockOffset('dev', undefined, now)).toBe(0);
    expect(appClockOffset('dev', 'tomorrow', now)).toBe(0);
    expect(appClockOffset('dev', String(now + 400 * DAY), now)).toBe(0);
  });

  it('stamps the call record and the transcript on the app’s day', async () => {
    script();
    const { token } = await newGuest();
    const shift = 4 * DAY;
    const phone = await Phone.call(token, {}, `?clock=${Date.now() + shift}`);
    await beat(phone, 'ask-whats-wrong');
    await sleep(200);
    await turn(phone, "What's wrong?");
    phone.send({ type: 'hangup' });
    const ended = await phone.next('ended');
    const row = await env.DB.prepare(
      'SELECT started_at, ended_at, transcript_key FROM calls WHERE id = ?',
    )
      .bind(ended.callRecordId)
      .first<{ started_at: number; ended_at: number; transcript_key: string }>();
    expect(row?.started_at ?? 0).toBeGreaterThan(Date.now() + shift - 60_000);
    expect(row?.ended_at ?? 0).toBeGreaterThanOrEqual(row?.started_at ?? 0);
    const file = await env.BLOBS.get(row?.transcript_key ?? '');
    // The post-call job stamps phrase use with the transcript's end.
    const transcript = (await file?.json()) as { endedAt: number; lines: { at: number }[] };
    expect(transcript.endedAt).toBeGreaterThan(Date.now() + shift - 60_000);
    for (const line of transcript.lines)
      expect(line.at).toBeGreaterThan(Date.now() + shift - 60_000);
  }, 20_000);
});
