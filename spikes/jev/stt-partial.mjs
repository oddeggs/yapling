// Real-time pace: the last partial before the 180 ms commit vs the committed text, per clip.
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
const dir = new URL('./audio/', import.meta.url).pathname;
const url = 'wss://api.elevenlabs.io/v1/speech-to-text/realtime?model_id=scribe_v2_realtime&audio_format=pcm_16000&commit_strategy=manual&include_timestamps=true&language_code=en';
const rows = [];
for (const f of readdirSync(dir).filter((f) => f.endsWith('.pcm') && !f.startsWith('nz')).sort()) {
  const speech = readFileSync(dir + f);
  const ws = new WebSocket(url, { headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY } });
  let partial = '', committed = null, partialAt = 0, committedAt = 0, done;
  const fin = new Promise((r) => (done = r));
  ws.onmessage = (e) => { const m = JSON.parse(e.data);
    if (m.message_type === 'partial_transcript') { partial = m.text ?? ''; partialAt = performance.now(); }
    if (m.message_type === 'committed_transcript') { committed = m.text ?? ''; committedAt = performance.now(); done(); } };
  await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
  const send = (b, commit = false) => ws.send(JSON.stringify({ message_type: 'input_audio_chunk', audio_base_64: b.toString('base64'), commit, sample_rate: 16000 }));
  const pcm = Buffer.concat([Buffer.alloc(32 * 200), speech, Buffer.alloc(32 * 180)]);
  let next = performance.now();
  for (let i = 0; i < pcm.length; i += 640) { next += 20; await new Promise((r) => setTimeout(r, Math.max(0, next - performance.now()))); send(pcm.subarray(i, i + 640)); }
  const atCommit = partial; const commitT = performance.now();
  send(Buffer.alloc(640), true);
  await Promise.race([fin, new Promise((r) => setTimeout(r, 3000))]);
  ws.close();
  rows.push({ id: f.replace('.pcm', ''), atCommit, committed, finalMs: Math.round(committedAt - commitT) });
  console.log(f, JSON.stringify(atCommit), '→', JSON.stringify(committed), Math.round(committedAt - commitT), 'ms');
}
writeFileSync(new URL('./results/stt-partial.json', import.meta.url), JSON.stringify(rows, null, 1));
