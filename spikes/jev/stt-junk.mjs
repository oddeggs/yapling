// Runs each clip through Scribe v2 Realtime (language_code=en, manual commit) as the call does.
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
const dir = new URL('./audio/', import.meta.url).pathname;
const key = process.env.ELEVENLABS_API_KEY;
const url = 'wss://api.elevenlabs.io/v1/speech-to-text/realtime?model_id=scribe_v2_realtime&audio_format=pcm_16000&commit_strategy=manual&include_timestamps=true&language_code=en';
const out = {};
for (const f of readdirSync(dir).filter((f) => f.endsWith('.pcm')).sort()) {
  const id = f.replace('.pcm', '');
  const pcm = Buffer.concat([Buffer.alloc(32 * 300), readFileSync(dir + f), Buffer.alloc(32 * 400)]);
  const ws = new WebSocket(url, { headers: { 'xi-api-key': key } });
  const texts = [];
  let done;
  const finished = new Promise((r) => (done = r));
  ws.onmessage = (e) => {
    const m = JSON.parse(e.data);
    if (m.message_type === 'committed_transcript' || m.message_type === 'committed_transcript_with_timestamps') {
      texts.push(m.text ?? '');
      done();
    } else if (m.message_type?.includes('error')) { console.error(id, m.message_type, m.error); done(); }
  };
  await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
  let next = performance.now();
  for (let i = 0; i < pcm.length; i += 640) {
    next += 10; // twice real time
    await new Promise((r) => setTimeout(r, Math.max(0, next - performance.now())));
    ws.send(JSON.stringify({ message_type: 'input_audio_chunk', audio_base_64: pcm.subarray(i, i + 640).toString('base64'), commit: false, sample_rate: 16000 }));
  }
  ws.send(JSON.stringify({ message_type: 'input_audio_chunk', audio_base_64: Buffer.alloc(640).toString('base64'), commit: true, sample_rate: 16000 }));
  await Promise.race([finished, new Promise((r) => setTimeout(r, 4000))]);
  ws.close();
  out[id] = texts[0] ?? '';
  console.log(id, JSON.stringify(out[id]));
}
writeFileSync(new URL('./audio/transcripts.json', import.meta.url), JSON.stringify(out, null, 1));
