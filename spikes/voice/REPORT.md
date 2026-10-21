# Voice spike report: the live call cascade

22 Oct 2026. Throwaway spike for the Gate 0 voice check. Code in this folder, raw per-turn data in `results/raw/*/turns.jsonl`, aggregates in `results/summary.json` (`npm run summary` prints the tables).

## Verdict

**Passes, by a thin margin, and only after three changes to the planned design.** The tuned configuration, measured from this Mac to the deployed Worker over 36 turns:

| | P50 | P90 | Gate |
|---|---|---|---|
| End of learner speech → first generated reply audio | **1.489 s** | **1.686 s** | ≤ 1.5 s / ≤ 2.2 s: pass |
| End of learner speech → first character audio (recorded reaction, then the reply) | 0.924 s | 0.988 s | |
| Cut-offs on paused speech (42 turns with 700–750 ms pauses, 84 paused turns in all) | 0 | | none allowed: pass |

The three 12-turn blocks had P50s of 1.463, 1.437 and 1.517 s, so the P50 sits right on the line. On a real phone, mic capture and playout buffers add roughly 50–100 ms that this bench does not see, which would push the P50 just over 1.5 s. The recorded reaction gives a lot of headroom on *first character audio*; the founder decides whether that is the number the gate means.

The design as first written in `tech-decisions.md` §3 **fails**:

- **Scribe turn prediction does not exist for the realtime model.** `commit_strategy=turn_prediction` with `scribe_v2_realtime` (the only realtime model) returns `invalid_request: commit_strategy 'turn_prediction' is not supported by model_id 'scribe_v2_realtime'`.
- **Scribe VAD at 0.7 s fails the pause rule and the budget.** Deployed: P50 2.145 s, P90 2.476 s. Of 12 paused turns, 3 were cut off, 7 sent a reply to a fragment, and 7 answered only the last fragment.
- **Without hedging, Haiku's slow tail breaks P90.** Deployed with smart endpointing but no hedge: P50 1.688 s, P90 2.758 s.

What made it pass: endpointing in the DO with a speculative reply held until the silence is long enough, hedged LLM requests, and an earlier TTS flush. A fourth change is forced by geography: the CallDO has to run in US West, because Cloudflare's Hong Kong colo is refused by the Anthropic API.

## Architecture as built

    Node bench client ──wss──▶ Worker /call?token=… ──▶ CallDO (locationHint wnam: LAX/SJC/DEN/DFW)
      20 ms PCM16 frames (binary)          │
      JSON controls                        ├─ ws ─▶ Scribe v2 Realtime (api.elevenlabs.io, commit_strategy=manual)
                                           │        DO-side energy endpointing decides when to commit
                                           ├─ https stream ─▶ Claude Haiku 5.5 ×2 (hedged), cached system prompt
                                           └─ ws ─▶ ElevenLabs TTS (Flash: stream-input; v4 Turbo: text-to-dialogue)
      ◀── JSON: partial, final, tts_audio (base64 + alignment), play_rec, mark, turn_aborted, turn_done

Files: `src/call-do.ts` (the DO), `src/endpointing.ts` (energy gate, patience rule, segment join, reaction pick), `src/hedge.ts`, `src/upstream.ts` (ElevenLabs sockets), `src/persona.ts` (Pip prompt from the cast-bible template: Newcomer stage, day-one burrow unpacking), `src/protocol.ts` (frames), `src/config.ts` (query-string knobs; the defaults are the passing configuration).

**Frames.** Up: binary frames are raw PCM16LE 16 kHz mono (640 bytes = 20 ms). Text frames are JSON: `end_turn` (hold-to-talk release, which sends a manual commit), `hangup`, and `mark speech_end` (bench only, for timing). Down: JSON text frames only. TTS audio is the provider's base64 chunk with its character alignment (`chars`, `charStartTimesMs`, `charDurationsMs`, times relative to the chunk). Others: `partial`, `final` (learner text, fresh or merged), `words` (Scribe word timestamps), `play_rec` (play a bundled clip), `mark first_audio` (DO-clock stage times), `turn_aborted`, `turn_done` (texts, timings, usage), `call_summary` (totals).

**Turn flow (smart endpointing, the default):**

1. Every 20 ms frame goes to Scribe (`input_audio_chunk`) and through an energy gate (RMS > 400). Two voiced frames start speech.
2. After **180 ms** of silence the DO sends `commit: true`; Scribe returns the final text about 300 ms later (DO clock). The reply starts at once, speculatively: Haiku streams into TTS and the audio is **held in the DO**.
3. The hold is released at **700 ms** of silence, or **1,200 ms** if the text ends on a word that rarely ends a sentence ("the", "is", "and", "to", "my"…). At release the phone plays a recorded reaction (`play_rec`: "Ooh," "Oh!" "Mm," "Hmm,"; 350–460 ms) and the generated audio follows.
4. If the learner speaks again before any reply audio has reached the phone, the reply is dropped (`turn_aborted learner_resumed`). Committed segments are joined as a hesitation ("I think we put the books... on the shelf.") so the model doesn't read Scribe's full stops as finished sentences.
5. LLM: `claude-haiku-5-5`, thinking disabled, effort low, `max_tokens: 200`, a cached system prompt of 1,023 tokens (read from cache on every turn; a `max_tokens: 0` prewarm at call start writes it in about 620 ms), top-level auto-caching for the history. Two identical requests stream in parallel; the first to produce text wins and the other is aborted. When a reaction is played, a mid-conversation `system` message tells the model Pip has already said it.
6. TTS: text is pushed at word boundaries; the first push is flushed once a clause ends or about 20 characters are buffered. Flash uses `chunk_length_schedule [50,120,160,250]`, `pcm_24000`, `speed 0.92`. A spare TTS socket is opened ahead of each turn.

Hold-to-talk (`commit=manual` + `end_turn`) and Scribe VAD (`commit=vad`) are the alternative modes measured.

**Bench client** (`client/run.ts`): streams each utterance at real-time pace in 20 ms frames with a −55 dBFS noise floor, then trailing silence until the reply is done. End of speech is the send time of the frame holding the last voiced sample; every e2e number is on the client clock. **Learner audio** (`client/make-utterances.ts`, `client/utterances.json`): 12 A2 turns in Linh's Vietnamese-accented voice (`eleven_v4`, speed 0.85), converted to PCM16 16 kHz. Six have scripted mid-sentence pauses of 700–1,000 ms.

## Results

All times in ms. "Local" = `wrangler dev` on this Mac (DO in Vietnam, every upstream hop from the home connection). "Deployed" = Worker `yapling-voice-spike` on workers.dev, DO in US West, bench on this Mac.

| Run | Turns | Reply P50 | Reply P90 | First char P50 | STT final¹ | LLM 1st token P50 (P90) | TTS 1st audio² | Misfires on pauses |
|---|---|---|---|---|---|---|---|---|
| **Deployed, smart, Flash, hedge 2, tuned** | 36 | **1489** | **1686** | 924 | 521 | 513 (624) | 285 | 0 |
| Deployed, smart, v4 Turbo, hedge 2, tuned | 12 | 1434 | 1555 | 899 | 503 | 551 (596) | 131 | 0 |
| Deployed, smart, Flash, hedge 2 (spec 250 ms, clause flush) | 24 | 1591 | 1663 | 937 | 602 | 509 (630) | 161 | 0 |
| Deployed, smart, Flash, no hedge | 36 | 1688 | 2758 | 926 | 591 | 799 (1791) | 154 | 0 |
| Deployed, smart, v4 Turbo, no hedge | 12 | 2143 | 2820 | 923 | 626 | 1357 (1876) | 125 | 0 |
| Deployed, smart, Flash, DO in Sydney (`oc`) | 12 | 2160 | 3251 | 930 | 756 | 925 (2012) | 292 | 0 |
| Deployed, Scribe VAD 0.7 s, Flash | 12 | 2145 | 2476 | — | 1272 | 623 (779) | 171 | 3 cut-offs, 4 replies to fragments |
| Deployed, hold-to-talk, Flash, no hedge | 6 | 1461 | 2530 | — | 328 | 797 (1961) | 128 | n/a |
| Local, smart, Flash, hedge 2, tuned | 12 | 1943 | 2011 | 700 | 533 | 825 (947) | 291 | 0 |
| Local, smart, Flash, no hedge | 12 | 1997 | 2197 | 700 | 611 | 1070 (1243) | 293 | 0 |
| Local, smart, v4 Turbo, no hedge | 12 | 1927 | 2304 | 700 | 610 | 1003 (1440) | 151 | 0 |
| Local, Scribe VAD 0.7 s, Flash | 12 | 2706 | 3304 | — | 1235 | 1050 (1817) | 254 | 1 cut-off, 3 replies to fragments |
| Local, hold-to-talk, Flash | 6 | 1629 | 2197 | — | 338 | 885 (1466) | 318 | n/a |

¹ Client clock, end of speech → final transcript; includes the 180 ms (tuned) or 250 ms speculative wait. Scribe's own commit-to-final is about 300 ms on the DO clock.
² First text sent to TTS → first audio chunk in the DO. Tuned runs flush earlier, so compare end-to-end figures.

**Stage breakdown, passing run (P50 / P90):** speech end → final transcript 521 / 609. LLM request → first token 513 / 624. First token → first TTS audio about 210. DO speech end → audio ready 1,231 / 1,361. Client minus DO offset 259. Gap between end of reaction and first reply audio 191 / 348.

**What moved the numbers:** hedging cut LLM first-token P90 from 1,791 to 624 ms (median 799 → 513; runs were sequential, so part of the median change may be API load). The 180 ms speculative commit plus early flush took about 100 ms off the median. Placement: Sydney is 600 ms slower than US West; local (DO in Vietnam) about 450 ms slower.

### Turn-taking on paused speech

| Endpointing | Paused turns | 700–750 ms pauses | Cut-offs | Replies to a fragment | First fragment lost |
|---|---|---|---|---|---|
| Smart (DO hold 700 / 1,200 ms, speculative reply, abort on resume) | 84 | 42 | 0 | 0 | 0 |
| Scribe VAD 0.7 s | 12 | 6 | 3 | 7 | 7 |
| Scribe turn prediction | — | — | not available (400 `invalid_request`) | | |

Not tested: real phone noise and room echo (the energy gate threshold is fixed), barge-in while Pip is speaking, the "Chờ chút" pause.

### Flash v2.5 vs v4 Turbo with Pip's designed voice

| | `eleven_flash_v2_5` | `eleven_v4_turbo` |
|---|---|---|
| Works with `EloPaUZKG0CW1gv8SwPD` | Yes, `/text-to-speech/{voice}/stream-input` | Yes, but **only on `/v1/text-to-dialogue/stream-input`** |
| First audio after text (Mac / in DO) | 230–350 / ~150–290 ms | 160–270 / ~125–150 ms |
| Character alignment | Yes | **None** |
| Speed control | 0.7–1.2 | None |
| Pip's measured pace | 230–265 wpm at 0.92; ~155 wpm at 0.7 | 145–200 wpm |
| Intelligibility (4 replies each, Scribe batch) | Word-exact | Word-exact |
| Price | 0.5 credit/char, $0.04 / 1K chars | same |

Samples in `results/samples/`; nobody has listened yet. The larger problem is **pace**: Newcomer wants about 110 wpm and Pip's designed voice is far faster on both models.

### Cost per conversation-minute

Public list prices: Scribe v2 Realtime $0.39/audio hour (https://elevenlabs.io/pricing/api); Flash/v4 Turbo TTS $0.04/1K chars (same page); Claude Haiku 5.5 $0.10/MTok input, $0.01/MTok cache hits, $0.125/MTok 5-min cache writes, $0.50/MTok output (https://platform.claude.com/docs/en/about-claude/pricing).

| Run | TTS chars/min | Tokens/min (in+cache / out) | STT | TTS | LLM | **Total $/min** |
|---|---|---|---|---|---|---|
| Deployed, smart, Flash, hedge 2, tuned | 517 | 7,635 / 198 | 0.0065 | 0.0207 | ≈ 0.0008 (hedged) | **≈ 0.028** |
| Deployed, smart, v4 Turbo, hedge 2, tuned | 495 | 6,209 / 178 | 0.0065 | 0.0198 | 0.0008 | ≈ 0.027 |
| Deployed, hold-to-talk, Flash | 537 | 6,805 / 226 | 0.0065³ | 0.0215 | 0.0002 | ≈ 0.028 |

³ Hold-to-talk could stream only while held (~40% of the minute): about $0.003.

**TTS is about 75% of the cost.** Levers: shorter Pip turns (median 19 words, 3 of 36 over 25), more recorded lines, cheaper TTS. Credits used by the spike: 7,040.

## Findings that change the plan

1. **The CallDO must not run in Hong Kong.** A DO created from this Mac lands in HKG, and Anthropic answers every request from there with `403 forbidden: Request not allowed`. `locationHint: "apac"` also landed in HKG. `wnam` works (LAX, SJC, DEN or DFW); `oc` (SYD) works but is slow. A relay Worker with `placement.region` did not help (subrequests still left from HKG). Production: keep `wnam`, or test Claude on Vertex AI / Bedrock in a nearby region.
2. **The Singapore residency STT host rejects this account's key** (`auth_error`); the global host works.
3. **Turn prediction is unavailable** and Scribe VAD fails the pause rule, so endpointing lives in the CallDO.
4. **v4 Turbo is a different socket with no alignment or speed**, which the alignment-based lipsync plan needs.
5. **Pip's voice is too fast for Newcomer pace** on both models.
6. Workers detail: with a recent `compatibility_date`, binary WebSocket frames arrive as `Blob` unless `binaryType = "arraybuffer"` is set on both accepted and outbound sockets.

## Recommendations for the production CallDO

- **Frames:** binary PCM16 16 kHz 20 ms up; TTS audio down as binary frames with a separate alignment JSON frame; typed JSON for the rest; a `timings` block on turn end for the dev dashboard.
- **Endpointing:** `commit_strategy=manual` with DO endpointing (speculative commit at ~180 ms of silence, release at 700 ms, 1,200 ms after a dangling word, indefinitely during Chờ chút); abort an undelivered reply when speech resumes; join segments as hesitations. Before launch replace the fixed energy gate with phone-side VAD flags (the phone knows the mic and echo cancellation) or an adaptive noise floor. Hold-to-talk sends `commit: true` on release.
- **Model:** `claude-haiku-5-5`, thinking disabled, effort low, cached persona, prewarm at call start, 2-way hedging (or hedge only after ~350 ms without a first token). Cap `max_tokens` around 80, trim to two sentences before TTS; strip a leading "Ooh/Oh/Mm/Hmm" after a recorded reaction.
- **TTS:** `eleven_flash_v2_5` for generated turns (alignment, speed, same price). Re-brief Pip's voice for slower, deliberate delivery.
- **Pre-bake:** per-character reaction clips (3–5 each), "Sorry, say that again?", the wrap-up, scene openers and exits, the AI disclosure.
- **Placement:** pin the CallDO to `wnam` until Anthropic access from nearer colos is solved. Opening the socket takes 1.0–1.3 s from Vietnam; open it while the call screen rings.

## Running it

    cd spikes/voice && npm ci
    cp .dev.vars.example .dev.vars                # fill from the approved sources; never commit
    npm run utterances
    npm run dev                                   # wrangler dev on :8799
    node client/run.ts --label local-test
    node client/run.ts --url wss://yapling-voice-spike.bkdev98.workers.dev/call --label deployed-test --rounds 3
    npm run summary

Deployed Worker: **https://yapling-voice-spike.bkdev98.workers.dev**; `/call` needs `?token=` equal to the `SPIKE_TOKEN` secret.
