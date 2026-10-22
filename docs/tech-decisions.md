# Yapling: technical decisions

Decided 22 Oct 2026. Change one only with new evidence, and record the change here. The shape follows Bricked Party (`~/oddeggs/bricked-party/docs/tech-decisions.md`) and Kithfield, so pins, tooling and native fixes carry across. Cost reasoning: `~/oddeggs/reports/Critter English app research.md` (the cascade section).

## 1. Shape of the system

| Part | Choice | Why |
|---|---|---|
| App | Expo 58, React Native 0.88 (New Architecture, Hermes), Expo Router native stack. iPhone only at launch, portrait; Android follows the store launch | iOS first (founder, 21 Oct 2026); same pins as Bricked Party and Kithfield |
| Identifiers | `studio.oddeggs.yapling` (store) and `studio.oddeggs.yapling.dev` (dev builds); scheme `yapling` | Reverse DNS of a domain we own |
| Motion | Reanimated 4 worklets on the UI thread, Gesture Handler 3. Curves and timings from the prototype's `@keyframes` (`pIn`, `rIn`, `ypop`, `ywig`, `yhint`, `ytoast`…) as tokens in `@yapling/theme` | The bounce is part of the joy |
| Art | The prototype's parametric SVG generators (`design/prototype/art/yap-cast.js`, `yap-sticker.js`, `yap-art.js`, `yap-r4/r5/r6.js`) synced into `@yapling/art` and drawn with `@shopify/react-native-skia`. No Rive | Bricked's proven path; agents can port and golden-test generators; nobody here authors `.riv` |
| Lipsync | Mouth shapes are part of the critter generators. A viseme scheduler maps characters (Flash TTS alignment, or the `.timing.json` of recorded lines) to mouth shapes and runs on the audio clock | Same timing data for recorded and live lines; this is why live turns use Flash, which returns alignment (v4 Turbo doesn't) |
| Type | Lexend 500–900 (UI) and Kithfield Hand Bold (glosses, keepsakes, notes), embedded from `tools/fonts`. Vietnamese covered by both | What the prototype renders |
| Audio | `react-native-audio-api` for mic capture (PCM16 16 kHz mono), streamed TTS playback, recorded-line playback and effects; AVAudioSession `playAndRecord` with speaker default and Bluetooth | One graph for the call; low latency |
| API | Hono on Cloudflare Workers. `CallDO` (one per live call), `UserDO` (one per learner: schedule, alarms, live-minute ledger), D1 for accounts and progress, R2 for transcripts and voice capsules, Queues for post-call jobs, Cron for daily knocks | Same platform as Bricked and Kithfield; near-zero idle cost |
| Live voice | A cascade inside `CallDO` (§3): ElevenLabs Scribe v2 Realtime (STT, manual commit) → Claude Haiku 5.5 (turns, hedged) → ElevenLabs Flash v2.5 streaming TTS with the cast voices in `audio/cast-voices.json`. Measured in `spikes/voice/REPORT.md` | Transcripts and word timings for feedback and fluency; character alignment for captions and mouths; the same voices as the recorded lines |
| Feedback and memory | Claude Sonnet 5.5 after the call: two wins, one fix, phrase events, can-do evidence, memory items | Quality matters more than latency here |
| Content | `@yapling/story`: seasons as typed data (beats, recorded lines, generated slots with intent and guaranteed exits), compiled from `docs/season-1-script.md`; recorded audio from `tools/voice` | Written once, served to everyone, zero AI cost for recorded lines |
| Learning model | `@yapling/domain`: stages and speech settings, can-dos, the phrase lifecycle, error targets and graduation, the weekly ring, the live-minute ledger, fluency metrics. Pure TypeScript, fully tested | One implementation shared by the app and the API |
| Auth | Better Auth on Workers + D1: guest first, Sign in with Apple to keep progress across phones | Kithfield's decision |
| Purchases | RevenueCat (StoreKit 2): Yapling Plus monthly and yearly with an introductory yearly price. The server owns the live-minute ledger | Apple requires IAP; the server stops minute cheating |
| Notifications | Local notifications for day knocks scheduled by the app from the server's plan, APNs (Expo push) for voicemails and incoming calls; quiet hours enforced on both sides | Knocks work offline; voicemails need the server |
| Analytics and errors | PostHog (funnels, flags), Sentry | Same as Bricked |
| i18n | Typed TS catalogues in `@yapling/i18n`, one file per feature: Vietnamese and English at launch (chrome); learning content stays English with Vietnamese glosses inside `@yapling/story` | Vietnam first |
| Repo | pnpm workspace with `catalog:` pins copied from Bricked Party, TS strict, ESLint flat config, Prettier, Vitest (packages, api), Jest (mobile) | Studio tooling |

Deliberately absent: Rive, Pipecat or any server outside Workers, WebRTC, speech-to-speech models, WebViews for scenes, NativeWind, TanStack Query.

## 2. Art pipeline

- **Port, don't redraw.** `tools/art-sync` copies the generator functions from `design/prototype/art/*.js` into `packages/art/src/generated/*.ts`, faithful apart from module wrapping. A hand-written adapter turns their SVG output into Skia paths and paints. Nobody edits `generated/`.
- **Layers and caching.** A critter is body, face, mood parts and a mouth. Each layer is drawn once into an `SkPicture`, cached by its parameters, and moved with transforms. Mouth shapes are cached separately so lipsync swaps one small picture per frame.
- **Scenes** (burrow, café, office, Bus 45, town map, lock-screen wallpapers) come from the same generators and are cached whole. Glass panels are native views (`expo-blur`) over the Skia scene.
- **Golden tests.** `tools/design` renders each prototype step and component state in headless Chrome; `packages/art` renders the same state on CanvasKit in Node. CI fails on a mean difference over 2/255.

## 3. The live call

Measured 22 Oct 2026 in `spikes/voice/REPORT.md` (deployed: P50 1.49 s, P90 1.69 s end of speech → first reply audio; first character audio 0.92 s with a recorded reaction; no cut-offs on 700 ms pauses). Changes from the first design are marked *(spike)*.

```
phone ──ws──▶ CallDO (locationHint wnam) ──ws──▶ Scribe v2 Realtime (global host, commit_strategy=manual, word timestamps)
                  │
                  ├──▶ Claude Haiku 5.5 ×2, first to answer wins (stream; cached persona; prewarmed at call start)
                  │
                  └──ws──▶ ElevenLabs Flash v2.5 stream-input (character voice, alignment, speed) ──▶ phone
```

- **One socket per call** from the phone to `CallDO`. Frames are typed in `@yapling/contracts` (`call/*`). Audio goes up as binary PCM16 16 kHz; TTS audio comes down as binary chunks with alignment frames for captions and mouths. Open the socket while the call screen rings (it takes 1.0–1.3 s from Vietnam).
- **Placement** *(spike)*: the CallDO is created with `locationHint: 'wnam'` (US West). Cloudflare's Hong Kong colo, where calls from Vietnam land, is refused by the Anthropic API (403), and Sydney is 600 ms slower. Revisit with Claude on Bedrock or Vertex in Singapore.
- **Turns** *(spike)*: Scribe's turn prediction doesn't exist for the realtime model, and its VAD cuts learners off, so the DO decides. Speculative commit at 180 ms of silence (the reply starts generating), but nothing is spoken before 700 ms of silence (1,200 ms after a word that rarely ends a sentence: "the", "is", "and", "to", "my"…). If the learner speaks again before reply audio reaches the phone, the reply is dropped and the segments are joined as one hesitant sentence. Hold-to-talk commits on release. "Chờ chút" holds indefinitely until the learner speaks. Before launch, the phone sends speech-start/end flags from its own VAD (echo-cancelled mic) instead of the DO's fixed energy gate.
- **Reactions** *(spike)*: at release the phone plays a recorded per-character reaction ("Ooh," "Mm," "Oh!", "Hmm,") from the bundle, and the generated reply follows. Replies never start with a second reaction.
- **The model** *(spike)*: `claude-haiku-5-5`, thinking off, low effort, `max_tokens` ~80, two identical requests in parallel (first to produce text wins; the other is aborted), replies trimmed to two sentences before TTS. Text goes to TTS after about four words.
- **The director.** The scene runner from `@yapling/story` holds the beat. Each generated turn gets the persona prompt (cached static prefix), then the beat's intent and exits, the learner's stage settings, due phrases and two target errors. The model streams the spoken reply, then a control line (beat advance, correction flag, phrase used, can-do evidence, safety). The DO strips control before TTS. A reply to a learner turn starts with a two-token case tag (`[fine]`, `[unclear]`, `[question]`, `[off_topic]`, `[target_error]`) so the line is written for the case it picked; only `fine` moves the beat, the rest rephrase, answer briefly or steer back and count toward the beat's tries, never answering for the learner. A narration guard keeps notes about the scene, stage directions and quotation marks out of the voice and captions, holding a sentence only when its first words look like narration. Recorded beats are sent as `play_rec` and played from the app's bundle: no TTS cost.
- **Correction is a prompt.** On a target error, the character repeats it back as a question and waits; the learner's second try is scored. Other errors are recast silently.
- **Voice pace** *(spike)*: the designed voices run 230–265 wpm on Flash at 0.92 and ~155 wpm at the 0.7 floor; Newcomer wants ~110. Re-brief the voice designs for slow, deliberate delivery (founder listens and picks), and keep speed per stage from `@yapling/domain`.
- **Latency budget.** End of learner speech → first character audio (reaction) ≤ 1.0 s; → first reply audio P50 ≤ 1.5 s, P90 ≤ 2.2 s, measured from the phone. A thinking head-tilt covers the wait.
- **Metering.** `CallDO` counts learner-talk and character-talk seconds and charges the ledger in `UserDO` (rules from `@yapling/domain`). At 60 s left the character wraps up the scene kindly; the scene saves its place.
- **Safety.** Every learner turn passes a light classifier (in the control line). Crisis signals end the scene, step out of character and open the safety sheet with the country's numbers (115 in Vietnam). The AI badge is always on; a disclosure plays at session start and every 3 hours.
- **Cost** *(spike)*: ≈ $0.028 per conversation-minute (STT $0.0065, TTS $0.021, Haiku < $0.001 hedged). TTS is three quarters of it: keep turns short, pre-bake more, and look at cheaper TTS for generated turns before the store launch. Every call logs STT seconds, TTS characters, tokens and per-stage timings.

## 4. Data

| Where | What |
|---|---|
| D1 | users, profiles (first language, roommate species and name, stage, quiet hours), progress (phrases and states, error targets, can-dos, keepsakes, ring per week), memory items, call records (summary, metrics), purchases mirror |
| `UserDO` | day clock and the knock schedule, live-minute ledger, alarm for voicemails and incoming calls |
| R2 | call transcripts (JSON), voice capsules (opt-in learner audio, deleted on request) |
| Phone (SQLite) | cached progress for offline use; the server wins on conflict |

Deleting an account deletes D1 rows, R2 objects and the DO state within 24 h.

## 5. Workspace layout

```
apps/mobile      Expo app: src/app routes, src/features, src/ui, src/voice (mic, socket, playback, lipsync)
apps/api         Hono Worker, CallDO, UserDO, D1 migrations, queues, cron
apps/web         landing, privacy, terms, support (later)
packages/contracts  zod: call frames, HTTP bodies
packages/domain     learning model (pure)
packages/story      seasons, beats, recorded line index, persona prompts, scene runner
packages/art        critter, scene and sticker generators + Skia adapter
packages/theme      tokens: colour, type, spacing, radii, shadows, motion
packages/i18n       vi + en catalogues
tools/voice         recorded-line pipeline (yap_voice.py)
tools/design        headless renders of the prototype
tools/art-sync      generator sync
tools/fonts         Lexend, Kithfield Hand
```

## 6. This Mac

- Xcode 27.1 at `/Applications/Xcode-27.1.app` (also `xcode-select`ed); iOS 27.0 and 27.1 simulator runtimes. The Simulator app is "Device Hub" in Xcode 27.
- Builds: `pnpm --filter @yapling/mobile exec expo run:ios` for a dev build; `apps/mobile/ios` is generated and ignored (`expo prebuild -p ios --clean` after native changes).
- Workers run locally with `wrangler dev`; the dev Worker deploys to `yapling-api-dev` on workers.dev.
