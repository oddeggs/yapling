# Yapling: releases

Status: in progress · Started 22 Oct 2026
Inputs: `docs/concept.md`, `docs/journey-and-story.md`, `docs/season-1-script.md`, `docs/cast-bible.md`, `docs/tech-decisions.md`, `docs/design-review.md`, `design/README.md` (screen index with the release for every screen), `CLAUDE.md` (the agent contract).

## The releases

| Release | Ships as | Name | The pitch | Ships | Proof it worked |
|---|---|---|---|---|---|
| 1 | Internal TestFlight (learner test) | **First Week** | The prototype's week, for real: live AI calls, recorded cast, the burrow changing day by day | Onboarding and placement call; burrow and week view; Episode 1 call with Mei; voice story and postcard; teach Pip; Pass it on; keepsake; voicemail; season map; the Plus paywall (sandbox); lock-screen knocks; Me sheet lite; safety and error states; a dev-only time-travel menu for test sessions | 5–8 Vietnamese professionals each run day 1–8 in a moderated session; the founder's checklist in `docs/prompts/claude-design-prototype.md` ("What we're testing") |
| 2 | **App Store launch (Vietnam)** | **Season One** | Six weeks of story and a reason to talk every day | Episodes 2–6 with Hank at every stage; real-week calls with Bring your homework (Dex); the full practice set; phrase lifecycle to bloom and fix graduation; the full Me sheet with the memory page; voicemail and voice notes; minutes resting, break reminder, crisis protocol; Sign in with Apple; Plus live; analytics; cost meters | Gates in `docs/concept.md` §15: D30 > 10%, ≥ 30 learner-talk minutes per weekly active, free → Plus ≥ 5% by day 30, AI cost ≤ 30% of net revenue |
| 3 | Update | **Move-ins** | The town grows with you | Accent move-ins with listening checkpoints (Arjun first); stage-up to Neighbour; the monthly time capsule; incoming calls with a Live Activity; widgets; the town map | Median Flow +20% by week 6; call answer rate ≥ 20% |
| 4 | Update | **The Mystery Boat** | Season 2, and Android | Season 2 (six episodes), Android launch, Indonesia's Home Neighbour | Store rating, D30 holds on Android |

## How this plan runs

Built for parallel agents, following Bricked Party's plan (`~/oddeggs/bricked-party/plans/261020-1200-bricked-party-releases/plan.md`).

- **Waves run in order; lanes inside a wave run at the same time.** Each lane is one agent in its own git worktree and branch (`feat/<area>-<behaviour>`), with a disjoint owns list.
- **Contracts first.** Wave 0 freezes `packages/contracts`, the theme tokens and the art generators. A lane that needs a contract change reports `NEEDS_CONTEXT`; the contracts owner changes it between waves.
- **A run** takes a lane from its inputs to its done-when (or a clean stopping point). Every lane gets one **review run** (an independent reviewer checks the diff against the done-when) and, if needed, one fix run.
- **Between waves**, one integration agent merges the lanes in the listed order into `main`, runs the full suite and the gate, and fixes what breaks.
- **Concurrency:** at most 6 lanes at once (one Mac, simulator builds are heavy).

### Shared-file rules

| Hotspot | Rule |
|---|---|
| Routes | Each feature owns its folder under `apps/mobile/src/app/`. Only the shell lane edits `_layout.tsx` files |
| i18n | One catalogue file per feature: `packages/i18n/src/<feature>.{vi,en}.ts`; `pnpm --filter @yapling/i18n gen` rebuilds the index |
| D1 migrations | Number ranges per lane, given in each wave. Never edit another lane's migration |
| Contracts | `packages/contracts` changes only through its owner lane |
| `package.json` | A lane adds dependencies only to packages it owns, at catalogue versions; new catalogue entries go through the integration agent |
| Native config (`app.config.ts`, `modules/`) | Owned by the scaffold lane in wave 0 and the voice lane in wave 1; others ask through `NEEDS_CONTEXT` |
| Audio assets | `audio/` is produced only by `tools/voice`; the app bundles from `audio/season-1/lines/` through the story package |

---

# Release 1 · First Week (learner-test TestFlight)

## Wave 0: Foundation · critical path 2 runs

| Lane | Owns | Does | Runs | Done when |
|---|---|---|---|---|
| 0a Scaffold | repo root configs, `apps/mobile` skeleton, `apps/api` skeleton, `.github/`, `apps/mobile/app.config.ts` | pnpm workspace with Bricked Party's catalogue pins; TS, ESLint, Prettier, Vitest, Jest; Expo app (dev and store variants `studio.oddeggs.yapling[.dev]`, iPhone only, portrait, New Architecture) booting to a blank screen in Lexend; `apps/api` Hono Worker with `CallDO` and `UserDO` bindings, D1, R2 and a queue in `wrangler.jsonc`, `/api/health`; CI running lint, typecheck and tests | 1 | `pnpm i && pnpm typecheck && pnpm test` green; the app boots on the iOS 27 simulator; `wrangler dev` answers `/api/health` |
| 0b Contracts | `packages/contracts` | zod schemas for the call socket (client: `hello`, `audio`, `end_turn`, `hold`, `hint`, `meaning`, `hangup`; server: `ready`, `partial`, `heard`, `say` (text, character, stream id), `tts_audio` with alignment, `play_rec`, `beat`, `hint`, `correction`, `meaning`, `minutes`, `safety`, `ended`), and HTTP bodies (session, profile, progress, memory, minutes, push tokens) | 1 (after 0a) | Every frame and body has a schema with a round-trip test |
| 0c Theme, type, i18n | `packages/theme`, `tools/fonts`, `packages/i18n` | Colour tokens from the prototype (ink `#17131C`, pink `#EFA3F4`, muted `#5D5366`, mint `#5FD98A`, lilac `#F9DAFB`, sky `#CFF0FD`, cyan `#22BFF2`, cream `#FFFDF6`, butter `#FFE48A` and the rest), sticker shadows as flat offsets, glass, radii, spacing, type scale (Lexend 500–900, Kithfield Hand), motion tokens from every `@keyframes` and easing in the prototype; i18n package (vi + en, per-feature files, `gen`, completeness test) | 1 (after 0a) | Tokens match the prototype's values; both fonts load in the app; the i18n test fails on a missing key |
| 0d Design renders | `tools/design`, `design/renders/` | Headless Chrome renders every `?step=` id with the facilitator hidden, every board frame by `data-screen-label`, and component states (each cast member × mood, mouths) to PNG | 1 | One PNG per id and state; a re-run is byte-stable |
| 0e Art port | `packages/art`, `tools/art-sync` | Sync the generators from `design/prototype/art/` into `generated/`; the SVG → Skia adapter; picture cache; mouth shapes as swappable layers; CanvasKit renderer for Node; golden tests against 0d | 2 (after 0a, 0d) | Goldens for Pip (three species), Linh, Mei, Sol, Hank, Nell, Bea, Dex, Arjun in every mood and mouth, and the burrow, café and Bus 45 scenes, within 2/255 mean |
| 0f Voice spike | `spikes/voice/**` (throwaway, folded into 1c) | A Worker with a `CallDO` that relays phone audio to Scribe v2 Realtime (Singapore), streams Claude Haiku 5.5 with Pip's persona, and streams ElevenLabs TTS with Pip's voice and alignment back; a Node client that plays recorded learner utterances (generated with Linh's Vietnamese-accented voice, including mid-sentence pauses) and measures end-of-speech → first audio; deployed to the dev Worker for a real network measure. Also checks the designed voices on `eleven_flash_v2_5` vs `eleven_v4_turbo` | 2 | `spikes/voice/REPORT.md` with P50/P90 latency from this Mac to the deployed Worker, cost per conversation-minute, voice quality notes, turn-taking misfires on paused speech. Pass: P50 ≤ 1.5 s, P90 ≤ 2.2 s, no cut-offs on 700 ms pauses. On failure: stop and report to the founder |

Gate 0: CI green, contracts frozen, renders and art goldens pass, **the voice spike passes**.

Gate 0 progress (22 Oct 2026): 0a, 0b, 0c, 0d merged. **Voice spike passed narrowly** (deployed P50 1.489 s, P90 1.686 s, first character audio 0.92 s, no cut-offs; `spikes/voice/REPORT.md`) after four changes now in `tech-decisions.md` §3: endpointing in the DO, hedged Haiku, Flash v2.5 for alignment, the CallDO pinned to US West (Hong Kong is refused by Anthropic). Open for the founder: Pip's voices are too fast for Newcomer pace (re-brief the voice designs); whether the gate counts the recorded reaction as first audio. 0e art port in progress. Wave 1 lanes 1a, 1b, 1d merged early (no dependency on the spike); 1e in progress.

## Wave 1: Engines · critical path 3 runs

| Lane | Owns | Does | Runs | Done when |
|---|---|---|---|---|
| 1a Learning model | `packages/domain` | Stages and speech settings (cast bible table); can-dos; the phrase lifecycle (seed → sprout → leaf → bloom, spacing 1/3/7 days, never wilts); two error targets and graduation (5 self-corrections over 3 days); the weekly ring (episode, real week, practice); the live-minute ledger (generous first week, then 10 min/week free, 150 min/month Plus); fluency metrics from word timestamps (Flow, Pace, Pauses); the day clock and the week-one knock plan (copy keys, times, quiet hours); "back after N days" recap selection | 2 | Property and unit tests for every rule in `journey-and-story.md` §1.2–1.8 and §1.10 |
| 1b Story | `packages/story` | Season 1 prologue and Episode 1 as typed data from `docs/season-1-script.md` (beats, recorded lines with audio and timing files, generated slots with intent and guaranteed exits, target phrases, Vietnamese glosses); the week-one between-call content (Pip's seagull story, Linh's postcard, Pip's voicemail, Bea's postcard); the placement chat; persona prompts built from `docs/cast-bible.md`; the scene runner (a pure reducer from events to beats) | 2 | Tests: every recorded line has audio and timing; every beat is reachable and every scene ends, for each answer kind (fine, target error, silence) |
| 1c Call server | `apps/api/src/call/**`, migrations `0100–0149` | `CallDO` from the spike made real: auth, prompt assembly with caching, the director driving the scene runner, correction as a prompt, hints after the stage pause, the meaning chip (simple English, then Vietnamese), the safety classifier and out-of-character handover, metering into `UserDO`, transcripts to R2, the post-call job (Sonnet 5.5: two wins, one fix, phrase and can-do events) | 3 | Protocol suite under `wrangler dev` with recorded learner audio: a full Episode 1 call; a target error corrected; silence → hint; a crisis line → safety; minutes run out → kind wrap-up; reconnect mid-call resumes the beat |
| 1d Accounts and progress | `apps/api/src/{auth,profile,progress,memory,push}/**`, `apps/api/src/user/**`, migrations `0001–0099` | Better Auth guest (Apple sign-in ready), profile, progress sync, memory items CRUD, push tokens, `UserDO` with the ledger and alarms, delete account | 2 | Integration tests for each route, the ledger, alarms and deletion |
| 1e Mobile shell and UI kit | `apps/mobile/src/app/_layout.tsx`, `apps/mobile/src/ui/**` | Router structure, glass sheets, sticker buttons, pills, cards, toasts, the speech bubble with progressive caption and tap-to-gloss, the call bar (Chờ chút, mic, exit), lock-screen-style notification card, haptics, Reduce Motion | 2 | Every shared component matches its render side by side |
| 1f Voice engine | `apps/mobile/src/voice/**`, `apps/mobile/modules/**`, native audio config in `app.config.ts` | Mic capture (PCM16 16 kHz) with permissions; the call socket client with reconnect; streamed TTS playback; recorded-line playback; the viseme scheduler driving `@yapling/art` mouths on the audio clock; hold-to-talk and hands-free; audio session handling (speaker, Bluetooth, interruptions) | 3 | On the simulator, a live call with the dev Worker: Pip speaks with moving mouth and captions; the learner speaks; latency within budget; a phone call interruption resumes cleanly |
| 1g App data | `apps/mobile/src/data/**` | Guest session (create, keep the token in the keychain, Apple link later), a typed API client from `@yapling/contracts`, profile, progress and memory stores with an offline SQLite cache (server wins on revision conflict), minutes, push-token registration, and hooks the feature lanes use (`useProfile`, `useProgress`, `useWeek`, `useMinutes`) | 2 | Store and client tests against a mocked API; on the simulator a fresh install creates a guest against local `wrangler dev`, saves a profile, and reads it back offline |

Merge order: 1a, 1b, 1d, 1c, 1e, 1f, 1g.
Gate 1: on the simulator, a full Episode 1 call with Mei and Pip runs against the dev Worker with recorded and live lines, captions and lipsync, and a post-call summary arrives.

## Wave 2: The first week · critical path 2 runs · ends in TestFlight build 1

| Lane | Owns | Screens | Runs |
|---|---|---|---|
| 2a Onboarding | `features/onboarding`, `app/(onboarding)/**` | d1-splash, d1-ai, d1-pick, d1-unpack (placement call), d1-card, d1-notif | 2 |
| 2b Burrow and week | `features/burrow`, `features/week`, `app/(home)/**` | the burrow by day (boxes unpack), d1-linh, d2-week, d8-back (normal and after days away) | 2 |
| 2c Calls | `features/call`, `app/(call)/**` | d2-call, d4-teach, d5-bus; correction, hint, meaning chip; E1–E4 error states | 2 |
| 2d Payoffs | `features/payoff` | d2-post, d5-keep (keepsake drawn and hung), ring fill, seed → sprout | 2 |
| 2e Story and season | `features/story`, `features/season` | d3-story, d6-vm (fix Pip's phrase), d6-season | 1 |
| 2f Plus, Me and safety | `features/plus`, `features/me`, `features/safety`, `apps/api/src/purchases/**`, migrations `0150–0199` | d7-pay with RevenueCat sandbox, Me sheet lite, C3 safety sheet (115), AI explainer, delete data | 2 |
| 2g Knocks and the test menu | `features/knocks`, `features/devmenu` | Day knocks as local notifications with deep links (d2–d8 lock copy), quiet hours; the dev-only time-travel menu (jump to day, back after 3 days, reset) | 1 |

Done when (every lane): each screen matches its render on the simulator side by side; every interaction works against the dev Worker; copy comes from i18n; VoiceOver labels set.
Gate 2: TestFlight build 1 ("Yapling Dev") installs on a phone and plays day 1 to day 8 with live calls.

## Wave 3: Learner test · critical path 1 run

| Lane | Does |
|---|---|
| 3a Instrumentation | PostHog funnel (install → placement → first call → ring full → day 8), Sentry, per-call cost logging and a small cost page in the dev menu |
| 3b Test kit | `docs/learner-test.md`: the session script, tasks per day, questions, what to watch; consent copy for recording; a reset and seed flow per tester |
| 3c Hardening | Audit of the call path (latency, reconnect, audio session), accessibility pass, copy review list for a native Vietnamese reviewer |

Gate 3 (founder): run the 5–8 learner sessions.

---

# Release 2 · Season One (App Store, Vietnam) — outline

Planned in detail after the learner test. Waves: content (Episodes 2–6 scripts compiled, Hank's stage takes, real-week and practice catalogues), features (Bring your homework with Dex, phrase lifecycle to bloom, fix graduation, memory page, voicemail and voice notes, minutes resting, break reminder, crisis protocol, Sign in with Apple), store (icon, screenshots, privacy labels, App Review notes with a demo account), launch (Plus live, analytics gates).

## Founder gates

| When | What |
|---|---|
| Before wave 2's TestFlight | App Store Connect app record for `studio.oddeggs.yapling.dev`; which Apple team (the team is at its distribution-certificate limit; Bricked reuses Kithfield's) |
| Before wave 2f | RevenueCat project and the Plus products (monthly ₫149k, yearly ₫799k with ₫599k intro) in App Store Connect |
| Before the learner test | ElevenLabs plan with enough credits for live calls (Creator has ~50k left this cycle); an Anthropic key for Yapling (reusing 6pm's for now) |
| Before Release 2 | yapling.app domain and trademark; native Vietnamese copy review; native-speaker review of every accent |
