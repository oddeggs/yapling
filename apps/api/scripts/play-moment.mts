// A scripted phone for local testing: plays one moment against `wrangler dev`, speaking the learner's
// lines with macOS `say`. Usage: pnpm exec tsx scripts/play-moment.mts <token> <momentId> <stage> "line" ...
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { encodeAudioFrame, PROTOCOL_VERSION } from '@yapling/contracts';

const BASE = 'http://127.0.0.1:8787/api';
const [token, momentId, stage, ...lines] = process.argv.slice(2);
const tmp = mkdtempSync(join(tmpdir(), 'moment-'));
const pcmOf = (text: string, i: number) => {
  const aiff = join(tmp, `l${i}.aiff`),
    wav = join(tmp, `l${i}.wav`);
  execFileSync('say', ['-v', 'Samantha', '-r', '150', '-o', aiff, text]);
  execFileSync('afconvert', ['-f', 'WAVE', '-d', 'LEI16@16000', '-c', '1', aiff, wav]);
  const b = readFileSync(wav);
  const at = b.indexOf('data') + 8;
  return new Uint8Array(b.subarray(at));
};
const t0 = Date.now();
const ts = () => `${((Date.now() - t0) / 1000).toFixed(1)}s`;
let seq = 0;
let micMs = 0;
const ws = new WebSocket(`${BASE.replace('http', 'ws')}/calls/socket`);
ws.binaryType = 'arraybuffer';
const send = (f: object) => ws.send(JSON.stringify({ ...f, seq: ++seq }));
const chars = new Map<number, string>();
let turn = 0;
let busy = false;
let lastSayEnd = 0;
let ended = false;
let callId = '';
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const silence = (ms: number) => new Uint8Array(Math.round(16 * ms) * 2);
async function speak(text: string) {
  busy = true;
  const pcm = pcmOf(text, turn);
  // a little room tone first, then the words, then the hands-free tail
  const chunks: Uint8Array[] = [];
  const add = (b: Uint8Array) => {
    for (let i = 0; i < b.length; i += 640) chunks.push(b.subarray(i, Math.min(b.length, i + 640)));
  };
  add(silence(300));
  const speechStart = micMs + 300;
  add(pcm);
  const speechEnd = speechStart + pcm.length / 32;
  add(silence(2200));
  let started = false,
    stopped = false;
  for (const c of chunks) {
    if (!started && micMs >= speechStart) {
      send({ type: 'speech', state: 'start', atMs: Math.round(micMs) });
      started = true;
    }
    if (started && !stopped && micMs >= speechEnd) {
      send({ type: 'speech', state: 'end', atMs: Math.round(micMs) });
      stopped = true;
    }
    const padded = c.length % 2 ? new Uint8Array([...c, 0]) : c;
    ws.send(encodeAudioFrame({ kind: 'mic_pcm16', seq: ++seq, streamId: 0, payload: padded }));
    micMs += padded.length / 32;
    await sleep(10);
  }
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
    turnMode: 'hands_free',
    resumeToken: null,
    pace: null,
  });
ws.onmessage = async (e) => {
  if (typeof e.data !== 'string') return;
  if (e.data === 'pong' || e.data === 'ping') return;
  const f = JSON.parse(e.data);
  switch (f.type) {
    case 'ready':
      console.log(`${ts()} ready, ${f.secondsLeft}s left`);
      callId = f.sessionId;
      break;
    case 'alignment':
      chars.set(f.streamId, (chars.get(f.streamId) ?? '') + f.chars.join(''));
      break;
    case 'say_end':
      console.log(`${ts()} CHARACTER: ${chars.get(f.streamId)}`);
      send({ type: 'played', streamId: f.streamId, interrupted: false, lagMs: null });
      lastSayEnd = Date.now();
      busy = false;
      break;
    case 'gloss':
      console.log(`${ts()}    gloss: ${f.text}`);
      break;
    case 'heard':
      console.log(`${ts()}    heard: ${f.text}`);
      break;
    case 'thinking':
      break;
    case 'safety':
      console.log(`${ts()} safety ${f.kind}`);
      break;
    case 'minutes':
      break;
    case 'error':
      console.log(`${ts()} ERROR ${f.code} fatal=${f.fatal}`);
      break;
    case 'ended':
      console.log(
        `${ts()} ENDED ${f.reason} summaryPending=${f.summaryPending} call=${f.callRecordId}`,
      );
      ended = true;
      callId = f.callRecordId;
      break;
    default:
      if (!['partial', 'say_start'].includes(f.type)) console.log(`${ts()} ${f.type}`);
  }
};
// the learner answers a moment after each character line, until the lines run out
const loop = setInterval(async () => {
  if (ended) {
    clearInterval(loop);
    setTimeout(() => process.exit(0), 500);
    return;
  }
  if (busy || !lastSayEnd || Date.now() - lastSayEnd < 1200) return;
  if (turn >= lines.length) {
    if (Date.now() - lastSayEnd > 20000) {
      console.log('no more lines: hanging up');
      send({ type: 'hangup' });
    }
    return;
  }
  lastSayEnd = 0;
  const line = lines[turn]!;
  turn += 1;
  await speak(line);
}, 200);
setTimeout(() => {
  console.log('timeout');
  process.exit(1);
}, 6 * 60_000);
