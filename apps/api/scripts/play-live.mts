// A scripted phone that plays one moment end to end against the real API: the hello, the
// learner's turns as real audio (macOS `say`) held to talk like the app, and a simulated learner
// who answers what the character actually said. Prints the call with timings.
// Usage: ANTHROPIC_API_KEY=… API_BASE=<dev>/api pnpm exec tsx scripts/play-live.mts <token> <momentId> <stage> "<learner persona>"
import Anthropic from '@anthropic-ai/sdk';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { encodeAudioFrame, PROTOCOL_VERSION } from '@yapling/contracts';

const BASE = process.env['API_BASE'] ?? 'http://127.0.0.1:8787/api';
const [token, momentId, stage, persona = 'a B1 Vietnamese learner'] = process.argv.slice(2);
const client = new Anthropic({ apiKey: process.env['ANTHROPIC_API_KEY'] ?? '' });
const tmp = mkdtempSync(join(tmpdir(), 'live-'));
const pcmOf = (text: string, i: number) => {
  const aiff = join(tmp, `l${i}.aiff`),
    wav = join(tmp, `l${i}.wav`);
  execFileSync('say', ['-v', 'Samantha', '-r', '160', '-o', aiff, text]);
  execFileSync('afconvert', ['-f', 'WAVE', '-d', 'LEI16@16000', '-c', '1', aiff, wav]);
  const b = readFileSync(wav);
  return new Uint8Array(b.subarray(b.indexOf('data') + 8));
};
const t0 = Date.now();
const ts = () => `${((Date.now() - t0) / 1000).toFixed(1)}s`.padStart(6);
let seq = 0;
let turn = 0;
let busy = false;
let lastSayEnd = 0;
let endTurnAt = 0;
let ended = false;
const talk: string[] = [];
const chars = new Map<number, string>();
const who = new Map<number, string>();
const lags: number[] = [];
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const ws = new WebSocket(`${BASE.replace('http', 'ws')}/calls/socket`);
ws.binaryType = 'arraybuffer';
const send = (f: object) => ws.send(JSON.stringify({ ...f, seq: ++seq }));

async function reply(): Promise<string> {
  const r = await client.messages.create({
    model: 'claude-sonnet-5-5',
    max_tokens: 200,
    system: `You are ${persona}, talking out loud in an English practice app. Reply with ONLY what you say next, one or two short sentences, at your level. If something makes no sense to you, say so like a real person.`,
    messages: [{ role: 'user', content: `${talk.join('\n')}\n\nWhat do you say?` }],
  });
  return r.content.flatMap((b) => (b.type === 'text' ? [b.text] : [])).join('').trim() || 'Okay.';
}

async function speak(text: string) {
  busy = true;
  const pcm = pcmOf(text, turn);
  send({ type: 'hold', seconds: 0 });
  for (let i = 0; i < pcm.length; i += 640) {
    const c = pcm.subarray(i, Math.min(pcm.length, i + 640));
    const padded = c.length % 2 ? new Uint8Array([...c, 0]) : c;
    ws.send(encodeAudioFrame({ kind: 'mic_pcm16', seq: ++seq, streamId: 0, payload: padded }));
    await sleep(18);
  }
  send({ type: 'end_turn' });
  endTurnAt = Date.now();
  talk.push(`YOU: ${text}`);
  console.log(`${ts()} LEARNER: ${text}`);
}

ws.onopen = () =>
  send({
    type: 'hello',
    protocol: PROTOCOL_VERSION,
    token,
    kind: 'moment',
    sceneId: momentId,
    stage,
    firstLanguage: 'vi',
    clientVersion: '0.2.0',
    turnMode: 'hold_to_talk',
    resumeToken: null,
    pace: null,
  });
ws.onmessage = (e) => {
  if (typeof e.data !== 'string' || e.data === 'pong' || e.data === 'ping') return;
  const f = JSON.parse(e.data);
  switch (f.type) {
    case 'ready':
      console.log(`${ts()} ready`);
      break;
    case 'say_start':
      who.set(f.streamId, f.character);
      if (endTurnAt) {
        lags.push(Date.now() - endTurnAt);
        endTurnAt = 0;
      }
      break;
    case 'alignment':
      chars.set(f.streamId, (chars.get(f.streamId) ?? '') + f.chars.join(''));
      break;
    case 'say_end': {
      const text = chars.get(f.streamId) ?? '';
      const name = (who.get(f.streamId) ?? '?').toUpperCase();
      console.log(`${ts()} ${name}: ${text}`);
      talk.push(`${name}: ${text}`);
      send({ type: 'played', streamId: f.streamId, interrupted: false, lagMs: null });
      lastSayEnd = Date.now();
      busy = false;
      break;
    }
    case 'heard':
      console.log(`${ts()}    heard: ${f.text}`);
      break;
    case 'not_heard':
      console.log(`${ts()}    not heard`);
      busy = false;
      lastSayEnd = Date.now();
      break;
    case 'error':
      console.log(`${ts()} ERROR ${f.code}`);
      break;
    case 'ended':
      console.log(`${ts()} ENDED ${f.reason}`);
      ended = true;
      break;
  }
};
const loop = setInterval(() => {
  if (ended) {
    clearInterval(loop);
    const avg = lags.reduce((a, b) => a + b, 0) / Math.max(1, lags.length);
    console.log(`reply lag after release: avg ${Math.round(avg)} ms, ${lags.map((l) => l).join(', ')}`);
    setTimeout(() => process.exit(0), 300);
    return;
  }
  if (busy || !lastSayEnd || Date.now() - lastSayEnd < 1200) return;
  if (turn >= 12) {
    send({ type: 'hangup' });
    return;
  }
  lastSayEnd = 0;
  busy = true;
  turn += 1;
  void reply().then(speak);
}, 200);
setTimeout(() => {
  console.log('timeout');
  process.exit(1);
}, 9 * 60_000);
