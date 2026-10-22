# Yapling: releases

Status: in progress · Started 22 Oct 2026
Inputs: `docs/concept.md`, `docs/journey-and-story.md`, `docs/season-1-script.md`, `docs/cast-bible.md`, `docs/tech-decisions.md`, `docs/design-review.md`, `docs/story-engine.md` (the engine, the visual library, collecting and the shop; Releases 2–4), `design/README.md` (screen index with the release for every screen), `CLAUDE.md` (the agent contract).

## The releases

| Release | Ships as | Name | The pitch | Ships | Proof it worked |
|---|---|---|---|---|---|
| 1 | Internal TestFlight (learner test) | **First Week** | The prototype's week, for real: live AI calls, recorded cast, the burrow changing day by day | Onboarding and placement call; burrow and week view; Episode 1 call with Mei; voice story and postcard; teach Pip; Pass it on; keepsake; voicemail; season map; the Plus paywall (sandbox); lock-screen knocks; Me sheet lite; safety and error states; a dev-only time-travel menu for test sessions | 5–8 Vietnamese professionals each run day 1–8 in a moderated session; the founder's checklist in `docs/prompts/claude-design-prototype.md` ("What we're testing") |
| 1.1 | Over-the-air update to the TestFlight build | **Settling in** | A way in for true beginners: six short calls with Linh before the story, and an easier week 1 | The Visitor stage; the level question and a placement call that sets the stage; Settling-in Chapters 1–6; Visitor versions of week 1; "again" and "slowly" honoured in every call; "too hard" anywhere | 3 true beginners each finish Chapter 1 unaided and at least 2 finish Chapters 1–6 and the café call (measures in `docs/beginner-path.md` §9) |
| 1.2 | Over-the-air update, carried by the next TestFlight build | **Every day, every week** | The learner keeps learning after week 1: a story every week and one short thing every day | Episodes 2–6 written in full and recorded, with a Visitor version of each and Hank at every stage; real-week and practice calls for weeks 2–6 (Dex's voice); Pip's stories, postcards and voicemails; Pip's minute (daily phrase practice, no live minutes); the festival week; rings, keepsakes, bloom and fix graduation, then and now; knocks after week 1; the level guide | On the simulator a Visitor and a Newcomer play days 8–49 with one thing every day and every ring filled; then 6 testers keep a weekly ring for 6 real weeks (`docs/every-week-loop.md`) |
| 2 | **App Store launch (Vietnam)** | **Season One** | Six weeks of story and a reason to talk every day | Season One's loop from Release 1.2; Bring your homework (Dex) on the real-week calls; the content cache and share sheet in the store build; the library's first 30 scenes and 300 props (long lead, shown in Release 3); the full Me sheet with the memory page; voicemail and voice notes; minutes resting, break reminder, crisis protocol; Sign in with Apple; Plus live; analytics; cost meters | Gates in `docs/concept.md` §15: D30 > 10%, ≥ 30 learner-talk minutes per weekly active, free → Plus ≥ 5% by day 30, AI cost ≤ 30% of net revenue |
| 3 | Update | **Town Weeks** | The town keeps living after Season One | The story engine (a shared town week per stage, a personal pass, the safety filter, a review page); the visual library (~100 scenes, ~1,000 props, each prop a word); the album with rarity and achievements; share cards and a shared town goal; accent move-ins with listening checkpoints (Arjun first); stage-up to Neighbour; the monthly time capsule; incoming calls with a Live Activity; widgets; the town map | Learners who finish Season One keep a weekly ring (≥ 60% of finishers fill a ring in the 4 weeks after); engine cost ≤ $0.15 per learner per month; zero unsafe items reach a learner; median Flow +20% by week 6; call answer rate ≥ 20% |
| 4 | Update and Android build | **The Mystery Boat** | Season 2, Android, and the shop | Season 2 (six hand-written episodes) with the engine filling the weeks around it; the cosmetic shop (wearables for Pip's three species, burrow decor); opt-in friends boards; Android launch; Indonesia's Home Neighbour | Store rating, D30 holds on Android; shop revenue per payer offsets ≥ 50% of AI cost per payer with no drop in D30 |

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

Gate 0 progress (22 Oct 2026): 0a, 0b, 0c, 0d merged. **Voice spike passed narrowly** (deployed P50 1.489 s, P90 1.686 s, first character audio 0.92 s, no cut-offs; `spikes/voice/REPORT.md`) after four changes now in `tech-decisions.md` §3: endpointing in the DO, hedged Haiku, Flash v2.5 for alignment, the CallDO pinned to US West (Hong Kong is refused by Anthropic). Open for the founder: Pip's voices are too fast for Newcomer pace (re-brief the voice designs); whether the gate counts the recorded reaction as first audio. 0e art port merged (all 1443 art states within 2/255 of the renders, worst 0.48). **Gate 0 passed 22 Oct 2026.** Wave 1: 1a, 1b, 1d, 1e merged; 1c, 1f, 1g in progress. Wave 2: 2f and 2g started early (no call dependency). Designer question: Mei's whiskers smudge beside her body (24 outline copies of 30% ink whiskers), reproduced faithfully.

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

**Dev deploy** (22 Oct 2026): the dev API runs at `https://yapling-api-dev.bkdev98.workers.dev` (Worker `yapling-api-dev`, workers.dev). Resources in the founder's Cloudflare account: D1 `yapling-dev` (id in `apps/api/wrangler.jsonc`), R2 `yapling-blobs-dev`, Queues `yapling-jobs-dev` and its dead-letter queue `yapling-jobs-dlq-dev`; secrets `ANTHROPIC_API_KEY`, `ELEVENLABS_API_KEY`, `BETTER_AUTH_SECRET`. Deploy order: migrations (`wrangler d1 migrations apply yapling-dev --env dev --remote`), then the Worker (`wrangler deploy --env dev --var COMMIT_SHA:<sha>`), then any new secrets (`wrangler secret put <NAME> --env dev`). Smoke: health, guest session, profile, progress and minutes answer; a live Episode 1 call from this Mac (edge HKG, call object in US West) measured end of speech → recorded reaction 0.90 s and → first reply audio P50 1.47 s, P90 1.53 s over 6 answered turns, with the reply audio ready before the reaction ends in 5 of 6; the post-call summary was written.

**TestFlight setup** (22 Oct 2026): App Store Connect app "Yapling Dev" **6825602448** (`studio.oddeggs.yapling.dev`, team YFND2EEW8S, SKU `yapling-dev`; the App ID has Sign in with Apple and Push enabled ahead of use, so builds run with `EXPO_NO_CAPABILITY_SYNC=1`). EAS: organization `yapling` (free plan), project `@yapling/yapling` `3a0b1da8-0906-4d5c-bba7-c4b639048e37`. Signing reuses the team's shared distribution certificate (serial `1341AC74…`, expires 18 Oct 2027, also used by Bricked and Kithfield) copied into the `yapling` org; EAS made the App Store profile. Submit uses the App Store Connect API key `76UJKRZ6A7` stored on EAS. Build and ship: `cd apps/mobile && EXPO_NO_CAPABILITY_SYNC=1 eas build -p ios --profile dev --auto-submit` (the `dev` profile points at the dev Worker). Build 3 was the pipeline check, built from main before the connecting pass. From build 6 the app takes over-the-air updates on channel `dev` (fingerprint runtime): ship JS-only changes with `pnpm --filter @yapling/mobile update:dev`; the app downloads at launch or when it comes back to the front, and restarts into the update on the burrow, week or season map. Native changes (dependencies, config plugins, `app.config.ts`) still need a new build.

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

Gate 2 progress (22 Oct 2026): all lanes and the connecting pass merged (vitest 2706, mobile 348, API 139). The connecting pass joined every screen to live data, added pace on the profile (migration 0007), fixed hold-to-talk quiet time and redeployed the dev Worker. On the simulator a fresh install plays day 1 to day 8 against the dev Worker. Build 3 (pipeline check) is valid in TestFlight; **build 4** is TestFlight build 1. Open: call audio on the simulator fails after another audio player in the same session (relaunch works; hardening lane), the voicemail fixture reaches the "Pip worked it out" ending, and a phone run.

## Wave 3: Learner test · critical path 1 run

| Lane | Does |
|---|---|
| 3a Instrumentation | PostHog funnel (install → placement → first call → ring full → day 8), Sentry, per-call cost logging and a small cost page in the dev menu |
| 3b Test kit | [`docs/learner-test.md`](../../docs/learner-test.md): the session script, tasks per day, questions, what to watch; consent copy for recording; a reset and seed flow per tester |
| 3c Hardening | Audit of the call path (latency, reconnect, audio session), accessibility pass, copy review list for a native Vietnamese reviewer |

Wave 3 progress (22 Oct 2026): 3a, 3b, 3c merged (vitest 2707, mobile 392, API 153). Call audio after a story or an earlier call fixed (voice processing was enabled on the previous player's engine before the call's graph existed); reconnect, slow reply, interruption and route-change paths land in designed states; hold-to-talk reacts in under 1 s; the voicemail accepts the story's "Can I help?"; the dev Worker honours the test menu's clock so the day-6 leaf grows. PostHog, Sentry and per-call cost records (migration 0200) are in and stay off until the keys are set. Dev Worker `65e5708d` at `5b53dd2`; TestFlight build 5 carries all of it. Still needs a phone: echo cancellation, interruptions, Bluetooth, latency from Vietnam. Founder: PostHog and Sentry keys, the questions at the end of `docs/learner-test.md`, the Vietnamese review in `docs/vi-copy-review.md`.

Gate 3 (founder): run the 5–8 learner sessions.

---

# Release 1.1 · Beginner path (Settling in)

Design: [`docs/beginner-path.md`](../../docs/beginner-path.md). A beginner (A0–A1) couldn't get through days 1–8. This release adds a new lowest stage, Visitor, six short Settling-in calls with Linh before week 1, Visitor versions of week 1's hard turns, a placement call that actually sets the stage, and "again" / "slowly" honoured in every call. No new art. 66 recorded lines.

Runs after the two call lanes now in flight (thinking time, line history) merge, because B1c and B2c own the same folders. Concurrency stays at 6 lanes at most.

## Wave B0: Contracts and script · critical path 1 run

| Lane | Owns | Does | Runs | Done when |
|---|---|---|---|---|
| B0a Contracts | `packages/contracts`; plus the mechanical Visitor rows (copied from Newcomer) in every `Record<Stage, …>` that the new stage breaks, so `main` stays green | `visitor` first in `STAGES`; `CallKind` gains `settling`; the `hint` frame gains `choices` (up to two, phrase + gloss), `modelLineId` and `persistent`; client frames `replay` (`slower`) and `pace`; profile gains `storyStartedOn` and the onboarding `startPath` (`visitor` or `placement`); a stage-request body (`to`, `reason`: self-select, too hard, too easy, stage-up, stay); progress gains the Settling-in chapters done; the call record's exit reason gains `too_hard` | 1 | Every new schema has a round-trip test; `pnpm typecheck && pnpm test` green across the repo |
| B0b Script and copy | `docs/cast-bible.md`, `docs/journey-and-story.md`, `docs/season-1-script.md`, `docs/vi-copy-review.md`, `audio/season-1/lines.json` (text entries only) | Turns `beginner-path.md` §4 and §7 into the script of record after the founder's decisions: the Visitor row in the stage tables (cast bible, journey §1.1, §1.2 can-dos, §1.10 help, §2.4 scaling), Linh's Vietnamese in her bible entry, a Settling-in section in the season script; the 66 lines in `lines.json` with `speed: 0.7`; the review list with the 7 spoken Vietnamese lines first | 1 | `yap_voice.py estimate` lists the 66 new lines; the review list is with the reviewer |

Gate B0: contracts frozen; the founder has answered decisions 1–4 in `beginner-path.md` §10; the 7 spoken Vietnamese lines are reviewed (the rest of the review can run alongside wave B1).

## Wave B1: Engines · critical path 2 runs

| Lane | Owns | Does | Runs | Done when |
|---|---|---|---|---|
| B1a Learning model | `packages/domain` | Visitor speech settings (about 85 wpm, TTS 0.7, 0.5 s phrase breaks, 8 words a turn, hints shown from the start); gloss policy at Visitor (meanings Vietnamese first); Pip at Visitor is a Visitor, otherwise at least Newcomer; "too hard" at Newcomer offers Visitor; the placement rule (Visitor when at most one of the three open boxes is fine) and the stage-up rule (at least 70% of week-1 turns passed without the generous pass); the six Visitor can-dos and the six phrases; week-1 days counted from `storyStartedOn`; the ledger leaves Settling-in calls unmetered and starts the first-week allowance on `storyStartedOn` (if decision 2 is yes) | 1 | Tests for each rule; every existing Newcomer-and-up test passes unchanged |
| B1b Story | `packages/story` | `Answer` gains `choices`, `accept` (the beat's words), `showHint: 'always'` and `model` (the line to repeat); runner events `repeat_request` and `slower_request` (never a try), the generous pass (second English try) and `skip`; the six Settling-in scenes; Visitor beats in the placement call (warm-up box, three open boxes, early stop), Episode 1, the day-3 postcard, the real-week and practice calls and the voicemail; the Visitor row in persona prose; validation that every Visitor character line has at most 8 words | 2 | Runner tests: every Settling-in scene ends for each answer kind (word match, two English misses, Vietnamese, silence, again, slowly, skip); every Visitor line is in `lines.json`; Newcomer beat paths unchanged |
| B1c Call server | `apps/api/src/call/**`, `apps/api/src/profile/**`, `apps/api/src/calls/**`, migrations `0300–0319` | Word-match judging for beats with `accept` (no model call), with a list of common mis-hearings; "again" and "slowly" detected from the transcript at every stage before the model runs, and the replay: the last line's text through live TTS one speed step slower with longer breaks; the `replay` and `pace` frames; Visitor prompt rules; Vietnamese-first meanings at Visitor; persistent hints with choices; the placement call's end sets the stage by the rule; the stage-request route; Settling-in calls unmetered; the turn log records outcome, pass kind (match, generous, skip) and replay requests; profile columns `story_started_on` and `start_path`. Check with the thinking-time lane that a short hold with a real word ("Yes") counts at Visitor | 2 | Protocol suite under `wrangler dev` with recorded beginner audio (one-word answers, a Vietnamese answer, a long silence, "Sorry? Again, please", "Slowly, please"): Chapters 1–3 end with every turn passed within two tries; placement with A0 audio sets Visitor and with A2 audio Newcomer; "again" replays in the Newcomer Episode 1 call; minutes unchanged after a Settling-in call; deployed to the dev Worker |
| B1d Voice | `tools/voice`, `audio/season-1/lines/**` | `estimate` first; a 3-line audition for the founder of Linh speaking Vietnamese and of Pip and Linh at 0.7; after the founder's OK, render the 66 lines; a `pace` command that reads each timing file and fails any Visitor line over 100 wpm; re-render or split the ones that fail | 1 (after B0b and the founder's OK) | All 66 lines rendered; every Visitor line at or under 100 wpm; credits used reported |

Merge order: B1a, B1b, B1c, then B1d whenever it's ready (until then the call speaks unrecorded lines with the live voice).
Gate B1: under `wrangler dev`, a scripted Visitor plays placement, Chapters 1–6 and the Episode 1 call with recorded beginner audio, and every scene ends `complete`.

## Wave B2: The app · critical path 2 runs · ends in an over-the-air update

| Lane | Owns | Screens and behaviour | Runs |
|---|---|---|---|
| B2a Onboarding | `features/onboarding`, `app/(onboarding)/**`, `packages/i18n/src/onboarding.*` | The level question (a new step between the AI explainer and the roommate); the Visitor residency card ("Làm quen với Linh" / "Vào thẳng truyện"); the "Khó quá" sheet on the Newcomer card; day 1 for Visitors: Linh's knock is Chapter 1 as a live call, no letter at dusk | 2 |
| B2b Burrow and week | `features/burrow`, `features/week`, `packages/i18n/src/burrow.*` | Settling-in day plans (chapter card, the day's button, "Để mai" / "Làm tiếp" after two chapters); one box unpacks per chapter; the letter after Chapter 6; week 1's days from `storyStartedOn`; the Settling-in list (replay any chapter, "Vào truyện luôn") | 2 |
| B2c Calls | `features/call`, `packages/i18n/src/call.*` | The persistent say-this card with two choices and tap-to-hear; the "Nói lại" and "Chậm thôi" pills (one replay control with the line-history lane's); the Vietnamese task card; "Bỏ qua"; "Khó quá" in the exit sheet (slower from the next line, or practise with Linh, saving the scene's place) | 2 |
| B2d Payoffs and Me | `features/payoff`, `features/me`, `packages/i18n/src/{payoff,me}.*` | The Visitor after-call card (the learner's own sentences, the phrase seed, a one-tap "Vừa / Khó quá"); the stage-up keepsake (Linh hands over the Newcomer card; "Ở lại thêm"); the Me sheet's stage row, "Làm quen lại với Linh" and "Thử nhanh hơn" | 1 |
| B2e Knocks, test menu, analytics | `features/knocks`, `features/devmenu`, `apps/mobile/src/observability/**`, `packages/i18n/src/{knocks,devmenu}.*` | Five Settling-in knocks (from Yapling, in Vietnamese); test menu: start as a Visitor, jump to chapter N, jump to the letter day; PostHog events: path chosen, placement result, chapter start and end, turn pass kind, again and slowly used, "too hard" taps and choices, stage-up offered and accepted | 1 |

Done when (every lane): built from existing components, with each new state logged in `docs/undesigned-states.md` (no renders exist for them); every interaction works against the dev Worker; copy comes from i18n; VoiceOver labels set.
Merge order: B2a, B2b, B2c, B2d, B2e.
Gate B2: on a phone, a fresh install that picks "Mình mới bắt đầu" plays Chapters 1–6 and the café call as a Visitor; one that picks "Mình nói được một chút" plays the placement call and lands where the rule says. Published with `pnpm --filter @yapling/mobile update:dev`.

## Wave B3: Learner test · critical path 1 run

| Lane | Owns | Does |
|---|---|---|
| B3a Test kit | `docs/learner-test.md` | The screener takes 3 true beginners (self-rated 1–2) alongside 3 testers like round 1; a beginner session script (day 1, Chapters 1–6, the café call, about 1 h 15 min); measures B1–B10 from `beginner-path.md` §9 in the synthesis sheet |

Gate B3 (founder): run the 6 sessions.

## What ships how

| Change | Ships by |
|---|---|
| Call server, profile, migrations | Dev Worker deploy (migrations first, then the Worker) |
| Contracts, domain, story data, screens, copy | EAS Update on channel `dev` (JS) |
| The 66 recorded lines | EAS Update: bundled as assets through `@yapling/story` (short mp3s, about 1–2 MB) |
| The slow replay | Server-side TTS, so the phone's native audio module doesn't change |
| A new build | Only if a lane adds a native dependency or touches `app.config.ts` or `modules/`; none is planned. The runtime is fingerprinted, so any native change stops the update reaching installed builds. Testers need build 6 or later (the first that takes updates) |

## Autonomous run (from 23 Oct 2026)

The founder's brief: "a hand-free mode that user dont need to hold everytime would be a good addition. get the plan, implement and build once we had a working version that would be able to learn and educate with the users, every days, every weeks." Order of work:

1. **Hands-free, for everyone.** The engine already has a `hands_free` turn mode (reached only through a route parameter). Make it a real choice: a setting and an in-call switch, turn-taking that respects unlimited thinking time, gating so idle listening doesn't stream to Scribe, echo-safe while a character speaks, the "real words" rule, and Jev's again/slowly. Lane H1 below.
2. **Release 1.1 to its gate:** the Visitor call server after the Jev judge merges, then the app lanes B2a–B2e, then Gate B2 on the simulator and an over-the-air update.
3. **Every day, every week:** the learner keeps learning after week 1. Planned as **Release 1.2** below (design: [`docs/every-week-loop.md`](../../docs/every-week-loop.md)): Episodes 2–6 compiled and recorded, the weekly ring after week 1, Pip's minute every day; the parts of Release 2 that don't need the App Store launch work.
4. **A new TestFlight build** once the whole loop works on the simulator (needed anyway if hands-free or anything else touches native code), then over-the-air updates on top.

| Lane | Owns | Does | Done when |
|---|---|---|---|
| H1 Hands-free | `apps/mobile/src/voice/**`, `features/call/**` (turn-mode parts), the turn-mode preference in `src/data/**`, `apps/api/src/call/learner-turn.ts` and `endpointing.ts`, `packages/i18n/src/call.*` | The setting (onboarding default stays hold-to-talk; a clear switch in the call and a row the Me sheet can show), turn-taking for hands-free with unlimited thinking time, client-side voice gating with pre-roll, echo-safe listening, visuals that say "listening, I'll answer when you pause" | A live E1 call on the simulator in hands-free with long pauses, a "Sorry, again?" and a Vietnamese answer; idle cost measured; full gate green |

---

# Release 1.2 · Every day, every week

Design: [`docs/every-week-loop.md`](../../docs/every-week-loop.md). After day 8 the app teaches one draft call a week and nothing else (section 1 of that doc). This release gives weeks 2–7 the shape week 1 has: each week one hand-written, recorded episode (Season One E2–E6, each with a Visitor version), one real-week call and one practice call to fill the ring, a recorded Pip story, a postcard and the voicemail; and every day **Pip's minute**, a one-minute card practice with recorded lines and no live minutes, that grows the learner's phrases on the days between calls. Then a festival week closes the season. Built in the shapes the story engine fills later (week slots, ring slots with scene ids, scenes from phrases), so Release 3 replaces content, not code.

About 160 new recorded lines (about 10,000 characters, about 25,000 ElevenLabs credits with retakes and Dex's voice). No new art. No native change. Migrations: `0330–0349` (none expected). Concurrency stays at 6 lanes at most.

**Running now** (23 Oct 2026): H1 hands-free, B2a Visitor onboarding, B2c the Settling-in call screen, B2e Settling-in knocks. That leaves two lane slots.

| Can start | Lanes |
|---|---|
| **Now** (no simulator, nothing in flight owns their files) | D0a Script, D0b Level guide; D0d Learning model as soon as a slot frees |
| After H1 and B2c merge (they switch on call kinds and own `features/call` and `call.*` copy) | D0c Contracts, D2e Call places. D1c may start on memory and the ring rule before then, staying out of `learner-turn.ts` and `endpointing.ts`; its daily-call parts wait for D0c |
| After B2e merges (it owns `features/knocks`, `features/devmenu`) | D2d Knocks and test menu |

## Wave D0: Script, rails, contracts · critical path 2 runs

| Lane | Owns | Does | Runs | Done when |
|---|---|---|---|---|
| D0a Script | `docs/season-1-script.md`, `docs/cast-bible.md`, `docs/journey-and-story.md`, `docs/vi-copy-review.md`, `audio/season-1/lines.json` (text entries in `pending`) | Episodes 2–6 in full (every turn with a hint; Arjun's idea passed on by Nell); a Visitor version of each hard turn as `every-week-loop.md` §2.2 sets out (cards with Vietnamese, the model line first, at most 8 words, Visitor timers); Hank's opener at Visitor, Neighbour and Regular; the real-week and practice scenes for weeks 2–6 (§2.2's table, no pasted homework); Pip's stories for weeks 2–6 as recorded lines; postcards for weeks 3, 4 and 6; for every Season One and Settling-in phrase a Pip's-minute set-up line and, where it fits, a slightly-wrong line; the festival week; draft knock copy for weeks 2–7; Dex's Visitor and Newcomer rows in the cast bible | 2 | The founder approves the script; `yap_voice.py estimate` lists the pending lines; the Vietnamese review list (Visitor task cards first) is with the reviewer |
| D0b Level guide (from Release 2's S0c) | `packages/domain/src/level-guide.ts`, `packages/domain/data/**` (word list), `packages/story/src/level-check.ts` and their tests | `LEVEL_GUIDE` per `story-engine.md` (a); `checkLevel(stage, lines)`; a test over every hand-written scene; the word list's licence recorded | 1 | Season One and Settling in pass, or the failures are listed for D0a; the licence is in the data folder |
| D0c Contracts | `packages/contracts`; the mechanical rows the new kind breaks | `CallKind` gains `daily` (Pip's minute: never metered, never a ring slot); `PhraseProgress` gains `pipReusedAt` (optional, nullable) | 1 | Round-trip tests; `pnpm typecheck && pnpm test` green across the repo |
| D0d Learning model | `packages/domain` (except D0b's files) | The story-week plan for week 2 on, read from an episode's `week` slots (what opens on days 1–7; ring slots open on the days of their scenes, `LATER_WEEK_SLOT_OPENS` as the fallback); the story week: the week of the next unfinished episode, never ahead of the calendar, with earlier open slots listed as waiting; ring slots tied to their scene (a call fills the open slot whose scene it is; a slot with no scene takes any call of its kind, oldest first); Pip's-minute choice (one due phrase from `duePhrases`, one reuse from `pickPipReuse`, none when nothing is due); knocks for weeks 2 on (new things only, at most one a day, quiet hours, 14 days ahead of the last open); the Visitor's Newcomer card at every full ring; after D0c, `daily` unmetered; the free weekly allowance as the founder sets it | 2 | Unit and property tests for each rule, including a learner who misses week 3 (Episode 3 waits, fills ring 3, and the season map agrees); every week-1 test unchanged |

Gate D0: the founder has approved the script and made decisions 1–5 in `every-week-loop.md` §5; contracts frozen.

## Wave D1: Engines · critical path 2 runs

| Lane | Owns | Does | Runs | Done when |
|---|---|---|---|---|
| D1a Story | `packages/story` (except D0b's file) | The script as data: Episodes 2–6 final (`draft: false`), Visitor beats (`maxStage: 'visitor'`) and Newcomer-only beats (`minStage: 'newcomer'`); real-week and practice scenes for weeks 2–6; stories, postcards and voicemails as recorded beats; each episode's `week` slots for days 1–7; a `daily` scene kind and the Pip's-minute builder (a phrase, its set-up and wrong lines → a two-turn card scene); the festival week; checks that every week has its three ring scenes, every listening scene is recorded or `ui` only, and every Visitor character line is at most 8 words | 2 | Runner tests: every Episode 2–6 scene, real-week, practice and Pip's minute ends for each answer kind at Visitor, Newcomer and Regular; the level check passes; week-1 and Settling-in paths unchanged |
| D1b Voice | `tools/voice`, `audio/season-1/lines/**`, `audio/cast-voices.json` | `estimate` and `credits` first; Dex's voice designed with a 3-take audition for the founder; Hank's three stage takes; after the founder's OK, render every pending line (Pip's stories and Pip's minute first if credits are short); `pace` on every Visitor line; `heard` on every take | 1 (after D0a and the founder's OK) | All lines rendered; every Visitor line at or under 100 wpm; credits used reported |
| D1c Call server | `apps/api/src/call/**` (not `learner-turn.ts` or `endpointing.ts` until H1 merges), `apps/api/src/jobs/**`, `apps/api/src/user/**`, migrations `0330–0349` | Daily calls: unmetered, card-judged, no reply model and no summary job, the phrase uses written from the turn log as prompted uses; Pip's reuse recorded in progress; Dex speaks with his own voice (stand-in removed once D1b lands); the ring rule through the domain; live calls read the learner's memory items into the prompt (today the post-call job writes them and no call reads them), so real-week calls can use the learner's job and last week's news | 2 | Protocol suite under `wrangler dev` with recorded learner audio: Episodes 2–6 end `complete` at Visitor and Newcomer; a week-2 real-week call uses the learner's job from memory; a Pip's minute leaves minutes unchanged and sprouts a seed; Episode 3 played in week 4 fills ring 3; deployed to the dev Worker |
| D1d App data | `apps/mobile/src/data/**` (not H1's turn-mode preference) | Moments seen by scene id (week 1's names map onto them); `useWeek` gives the story week and the slots still waiting from earlier weeks; a hook for whether Pip's minute has a phrase today | 1 | Store tests; a learner in week 4 with week 3's practice open reads both; week 1 reads as before |

Merge order: D1a, D1c, D1d, then D1b whenever it's ready (until then unrecorded lines speak with the live voice).
Gate D1: under `wrangler dev`, a scripted Newcomer and a scripted Visitor each play Episodes 2–6, their real-week and practice calls and five Pip's minutes; every scene ends `complete`; rings 2–6 fill.

## Wave D2: The app · critical path 2 runs · ends in a TestFlight build

| Lane | Owns | Screens and behaviour | Runs |
|---|---|---|---|
| D2a Burrow and week | `features/burrow`, `features/week`, `packages/i18n/src/{burrow,week}.*` | The days of weeks 2–7 from the story-week plan (one top card a day, never the same two days running; the day's thing, then the oldest waiting call); the Pip's-minute chip; week rows from their slot's scene, all three tappable, and a "still waiting" row; back after days away with Episodes 2–6's recaps; weeks 8 on as rings of replays. Designs: Journey board J1 (week) | 2 |
| D2b Listening and season | `features/story`, `features/season`, `packages/i18n/src/{story,season}.*` | Stories, postcards and voicemails for weeks 2–7 (Vietnamese under each line at Visitor); the season map's dates from the story's start; replay any finished episode at today's stage; the festival week (Pip's season story, Mei's postcard, the boat). Designs: Town board T1 (recap), T2 (episode end), Home board H6 (voicemail) | 1 |
| D2c Payoffs and Me | `features/payoff`, `features/me`, `packages/i18n/src/{payoff,me}.*` | After-call for Episodes 2–6 and a small Pip's-minute card (the phrase and its new state); bloom (L6) and fix graduation (L9); the week's wrap (ring, phrases grown, can-dos ticked, the next episode's day); then and now (week 1's Pass it on next to week 5's petition, and at the season's end); Linh's Newcomer card at every full ring for a Visitor; the season keepsake; can-dos across the season on the Me sheet | 2 |
| D2d Knocks and test menu | `features/knocks`, `features/devmenu`, `packages/i18n/src/{knocks,devmenu}.*` | Knocks for weeks 2–7 from the domain plan; test menu: jump to week N day D, fill a week's ring, back after N days | 1 (after B2e merges) |
| D2e Call places | `features/call/scene-layout.ts` and the place pieces, `packages/i18n/src/call.*` | The Inn and the Square with existing art (the square for Episode 6; the town until the Inn's set exists); Pip's-minute layout (the burrow, Pip, the cards); episode tags for 2–6; Dex on the real-week call | 1 (after H1 and B2c merge) |

Done when (every lane): built from existing components, with new states logged in `docs/undesigned-states.md`; designed states match their renders side by side; every interaction works against the dev Worker; copy comes from i18n; VoiceOver labels set.
Merge order: D2a, D2b, D2c, D2e, D2d.
Gate D2: on the simulator, with the test menu, a Newcomer and a Visitor each play day 8 to day 49: every day offers one thing; rings 2–6 fill; phrases reach leaf and at least one blooms; the Visitor is offered Linh's card at ring 2; no screen or knock mentions anything missed. Then the new TestFlight build (step 4 of the autonomous run) and over-the-air updates on top.

## Wave D3: Six real weeks · critical path 1 run

| Lane | Owns | Does |
|---|---|---|
| D3a Test kit | `docs/learner-test.md` | A six-week diary study: 6 testers (3 Visitors, 3 Newcomers) on the build, a 10-minute check-in each week; measures: days a week with any activity, rings filled, Pip's minutes a week, phrases at leaf and bloom, Flow week 1 against week 5, "would you miss it?" (1–5); kill signal: fewer than half fill ring 3 |

Gate D3 (founder): run it. What it finds refines Release 2.

## What ships how (Release 1.2)

| Change | Ships by |
|---|---|
| Story data, domain, screens, copy | EAS Update on channel `dev` (JS) |
| About 160 new recorded lines (about 10–15 MB) | EAS Update, bundled through `@yapling/story`; Release 2's content cache serves them from R2 later by the same ids |
| Call server, progress | Dev Worker deploy (no migration expected) |
| A new build | Not needed by this release; it rides the TestFlight build the autonomous run makes anyway |

---

# Release 2 · Season One (App Store, Vietnam)

Season One launches hand-written: Episodes 2–6 are scripted, recorded and checked like Episode 1. **That loop is built in Release 1.2** (the script, Visitor versions, recordings, the level guide, the ring after week 1, Pip's minute, bloom and fix graduation); Release 2 is the store and launch work on top of it. The engine isn't live yet. Release 2 lays the remaining cheap foundations for it, so Release 3 can arrive server-side and over the air:

- a content cache and the share sheet in the store build;
- the visual library's first 30 scenes and 300 props, as a long-lead lane.

(The third foundation, the level guide, moved to Release 1.2 as D0b.) The lanes below are refined after the learner test and the six-week study (gate D3). Design for the engine pieces: [`docs/story-engine.md`](../../docs/story-engine.md). Migrations: `0400–0499`.

## Wave S0: Script, contracts, level guide · critical path 2 runs

| Lane | Owns | Does | Runs | Done when |
|---|---|---|---|---|
| S0a Contracts | `packages/contracts` | Bodies for Bring your homework (pasted text or a calendar event), memory edits with an `interests` list, voice notes, minutes resting, Apple sign-in linking; remote line audio (file URL and timing URL) so Episodes 2–6 can be served from R2 | 1 | Every new schema has a round-trip test; repo green |
| S0b Script | `docs/season-1-script.md`, `packages/story/src/season-1/**`, `audio/season-1/lines.json` (text entries) | Episodes 2–6, their Visitor versions, Hank's takes, the between-call content and the real-week and practice scenes **moved to Release 1.2** (D0a, D1a). Left here: the Bring your homework variants of the real-week calls for S1a, and fixes from gate D3 | 1 | The homework variants end for each answer kind at every stage; the level check passes |
| S0c Level guide | | **Moved to Release 1.2** (D0b) | | |
| S0d Voice | `tools/voice`, `audio/season-1/lines/**` | Episodes 2–6 recorded in Release 1.2 (D1b). Left here: re-takes after the native-speaker accent review (founder gate before Release 2) | 1 | Every reviewed line re-rendered where asked; credits reported |

## Wave S1: Features · critical path 3 runs

| Lane | Owns | Does | Runs | Done when |
|---|---|---|---|---|
| S1a Bring your homework | `apps/api/src/homework/**`, `features/homework`, migrations `0400–0419` | Paste a job post, agenda or email (or pick a calendar event); a real-week scene for Dex built from it; the pasted text screened first (crisis → safety flow, sensitive → no scene); one free trial, unlimited on Plus | 2 | Protocol test with a sample job post plays a full real-week call; a sensitive paste gives the kind check-in |
| S1b Learning model | | **Moved to Release 1.2**: bloom and fix graduation shown (D2c), "back after N days" for Episodes 2–6 (D2a), the rules in D0d | | |
| S1c Me and memory | `features/me`, `apps/api/src/memory/**`, migrations `0420–0429` | The full Me sheet (can-dos across the season arrive in Release 1.2): the memory page (view, edit, delete, plus an interests list the engine reads later), settings | 2 | Every memory item round-trips and deletes; renders match |
| S1d Voicemail and voice notes | `features/voicenotes`, `apps/api/src/voicenotes/**`, migrations `0430–0439` | Voice notes on the free tier (batch STT), voicemail replies | 2 | A note records, sends and gets a reply; minutes unchanged |
| S1e Guardrails | `apps/api/src/call/safety.ts`, `features/safety` | Minutes resting, the 3-hour break reminder, the crisis protocol end to end, AI disclosure cadence | 1 | Protocol tests for each |
| S1f Accounts and Plus | `apps/api/src/auth/**`, `apps/api/src/purchases/**`, `features/plus`, migrations `0440–0449` | Sign in with Apple linking a guest; Plus live in production | 2 | Guest → Apple keeps progress; sandbox and production purchases verified |
| S1g Content cache and sharing | `apps/mobile/src/content/**`, `apps/mobile/src/share/**`, the native config for a file store and image sharing (through the integration agent) | Downloads each week's line audio, timing files and scene data ahead and keeps them offline; Episodes 2–6 audio served from R2 this way (a smaller bundle, and proof of the path the engine needs); the share sheet helper with one real card (a neighbour's postcard) | 2 | Episodes 2–6 play in airplane mode after one download; a postcard shares as an image; the native change is in the store build |
| S1h Analytics and cost meters | `apps/mobile/src/observability/**`, `apps/api/src/costs/**` | The launch gates (D30, talk minutes, conversion, AI cost per payer), with an engine line that reads zero for now | 1 | The dashboard shows each gate from real events |
| S1i Library base (long lead; ships in Release 3) | `packages/art/src/library/**`, `tools/library/**` | The catalogue schema (sets, slots, props with word, gloss, category, level, burrow family, fits, rarity); the 13 existing scenes and burrow objects tagged; the generator pipeline as the art spike confirms it; the first 30 sets and 300 props | 3 | Founder's style check at 30 sets and 300 props; goldens within 2/255; nothing shown in the app yet |

## Wave S2: Store · critical path 1 run

| Lane | Does |
|---|---|
| S2a Store kit | Icon, screenshots, privacy labels, App Review notes with a demo account, age rating (18+) |
| S2b Release build | Store variant build with the S1g native modules; production Worker, D1 and R2; EAS Update channel `production` |

## Wave S3: Launch

Plus live, the analytics gates watched. Gate: `concept.md` §15.

## What ships how (Release 2)

| Change | Ships by |
|---|---|
| Everything native (file store, image sharing, Apple sign-in) | The store build. Put every native module the engine, album and share cards will need in this build, so Release 3 needs no new build for them |
| Episodes 2–6 audio | Served from R2 through the content cache |
| Server, migrations | Production Worker deploy |

---

# Release 3 · Town Weeks (update)

The story engine goes live, with the visual library, the album and share cards. Release 3 also brings Move-ins (accent move-ins, stage-up to Neighbour), the time capsule, incoming calls and widgets. **Deadline:** the first launch-day learners finish Season One about 7 weeks after launch (six episodes and the festival interlude). Until Release 3 is live, finishers get the evergreen shelf from M3a. Design: [`docs/story-engine.md`](../../docs/story-engine.md). Migrations: `0500–0599`.

## Wave M0: Contracts, canon, gold scenes · critical path 2 runs

| Lane | Owns | Does | Runs | Done when |
|---|---|---|---|---|
| M0a Contracts | `packages/contracts`; the mechanical updates where `Scene.place` is matched | The week pack (`story-engine.md` Appendix B), `Scene.set`, place ids from the library, album items with rarity, share invite codes, the town goal | 1 | Round-trip tests; repo green; Season One unchanged |
| M0b Canon and gold scenes | `docs/town-canon.md` (new), `packages/story/src/canon/**`, `docs/story-engine.md` | The hand-made town canon as data (cast facts, places, who knows whom, what's open); the backbone prompt finalised; the named payoff and twist lists; one gold scene each for Neighbour, Regular, Local and Voice | 2 | The founder approves the four gold scenes; they pass the level check |

## Wave M1: Engines · critical path 3 runs

| Lane | Owns | Does | Runs | Done when |
|---|---|---|---|---|
| M1a Story packs | `packages/story/src/pack/**` | Lines and phrases looked up from a pack as well as the season (`validateScene(scene, lookup)`); `checkPack`, which runs shape, level, targets, canon ids, assets and budget; the phrase bank per stage | 2 | Season One tests unchanged; a fixture pack passes; each broken fixture fails with the right problem |
| M1b Prep jobs | `apps/api/src/prep/**`, migrations `0500–0529` | The town week (Opus 5.5 with web search), stage passes (Sonnet 5.5, Batch API), the personal pass (Haiku 5.5); the `find_assets` and `canon_facts` tools; structured output; one repair run, then the evergreen shelf; cost caps and a cost record per job; model calls from a Durable Object pinned to US West; Cron and Queues; packs in R2, pack ids in D1 | 3 | Against the dev Worker, one real town week yields six packs that pass `checkPack`; a seeded learner's personal pass passes; every job's cost is within `story-engine.md`'s budget |
| M1c Safety filter | `apps/api/src/screen/**` | Jev routes (reference topic, the pack's never list, the learner's text) with Haiku 5.5 as the fallback; thresholds in code; an English and Vietnamese eval set | 2 | On the eval set no unsafe reference or pack passes; false drops are reported; a missing answer counts as a fail |
| M1d Pack voices | `apps/api/src/voice-render/**`, `tools/voice` | Shared lines rendered with v4 after review, at each stage's speed, with timing files, into R2; personal lines rendered by Flash on first play and cached per learner (deleted with the account); prop words recorded once | 2 | A reviewed pack is fully voiced with lipsync timing; a personal line plays within the latency budget and replays from cache; credits per week reported |
| M1e Review page | `apps/api/src/review/**` | A small guarded page on the Worker: read and listen to the six packs, approve, or send one back with a note; manage the evergreen shelf | 1 | The founder approves a week from a phone |
| M1f Library to 100 / 1,000 | `packages/art/src/library/**`, `tools/library/**` | The remaining sets and props after the style check; rarity and limited (festival) items; goldens | 3 | About 100 sets and 1,000 props tagged and golden-tested; `find_assets` answers every place at every stage |

## Wave M2: The app · critical path 2 runs

| Lane | Owns | Screens and behaviour | Runs |
|---|---|---|---|
| M2a Town weeks | `features/week`, `features/season` | The town week on the week view after Season One; past weeks on the season map, replayable any time; packs come through the content cache | 2 |
| M2b Album and achievements | `features/album` (new), `features/burrow` (prop objects), migrations `0530–0549` | Album shelves by category, places and sets, rarity, achievements that become keepsakes; tap any prop to see its word and gloss and hear Pip say it; words become things: a prop moves into the burrow when its word is used | 2 |
| M2c Share cards and the town goal | `features/share`, `features/town-goal` | Share cards (album shelf, story recap, postcards, time capsule) with the AI tag, the Yapling mark and an invite link, and no transcripts; the shared town goal; personal bests | 2 |
| M2d Move-ins | `features/movein`, `packages/story/src/movein/**` | Accent move-ins with listening checkpoints (Arjun first); the stage-up to Neighbour | 2 |
| M2e Time capsule and town map | `features/capsule`, `features/map` | The monthly time capsule; the town map | 1 |
| M2f Incoming calls and widgets | `apps/mobile/targets/**`, native config (through the integration agent) | Incoming calls with a Live Activity; home-screen widgets | 2 |

Done when (every lane): built from existing components or the library, with new states logged in `docs/undesigned-states.md`; copy comes from i18n; VoiceOver labels set.

## Wave M3: Shadow weeks and go-live

| Lane | Does |
|---|---|
| M3a Shadow weeks | Four weeks of real town weeks generated, reviewed on the review page and never shown to learners; four standalone weeks per stage recorded as the evergreen shelf; checks tuned on what review catches |

Gate M3 (founder): the shadow weeks read well and pass review; the engine goes live for learners who finish Season One.

## What ships how (Release 3)

| Change | Ships by |
|---|---|
| Prep jobs, safety filter, review page, voices | Production Worker deploy |
| Each week's packs | Server content through the content cache: no app update |
| Town weeks, album, share cards, town goal, move-ins, capsule, map, library | EAS Update (JS and Skia generators), because Release 2's build has the native modules |
| Live Activity and widgets | A new store build (native targets); it can follow the rest |

---

# Release 4 · The Mystery Boat (update and Android build)

Season 2 is hand-written, with the engine filling the weeks around it. The cosmetic shop opens once retention is proven. Android launches. Migrations: `0600–0699`.

## Wave T0: Season 2 · critical path 2 runs

| Lane | Owns | Does | Runs | Done when |
|---|---|---|---|---|
| T0a Season 2 script | `docs/season-2-script.md` (new), `packages/story/src/season-2/**`, `audio/season-2/lines.json` | Six episodes written by us (the agent may draft; a person edits every line), with a Visitor version of each hard turn and stage scaling; recaps and cliffhangers | 2 | Every scene ends for each answer kind at every stage; the level check passes |
| T0b Season 2 voices | `tools/voice`, `audio/season-2/lines/**` | Render, pace gate, served through the content cache | 1 | All lines rendered; credits reported |
| T0c Engine around Season 2 | `apps/api/src/prep/**`, `packages/art/src/library/**` | Town weeks pause during a learner's Season 2 episode weeks; the personal pass fills real-week and practice calls around them; boat and festival sets and props; festival limited items | 2 | A learner in Season 2 gets episode weeks with personal calls around them, and no town week clashes |

## Wave T1: Shop, friends, Android · critical path 2 runs

| Lane | Owns | Does | Runs | Done when |
|---|---|---|---|---|
| T1a Shop | `features/shop`, `apps/api/src/purchases/**` (shop products), migrations `0600–0619` | Cosmetic items as non-consumables in RevenueCat at direct prices (about ₫25k / ₫49k / ₫99k at Apple's Vietnam price points); a wardrobe and decor slots; restore purchases; bought items kept out of the album and boards; no currency, no random items | 2 | Sandbox purchase, restore and refund paths; ownership is server-side; a bought item never changes Pip's mood or counts toward an achievement (tests) |
| T1b Wearables | `packages/art/src/wearables/**` | Fit points on each starter species' generator; about 60 wearables × red panda, capybara and cat; goldens per item, species and mood | 3 | Goldens pass; the founder approves the first 10 on all three species |
| T1c Outfit card and friends boards | `features/friends`, `features/share` (outfit card), migrations `0620–0639` | An opt-in friends list by invite code; friends-only boards on album items and stories finished (never live minutes); hide yourself any time; the outfit share card | 2 | Boards show only opted-in friends; no last-place styling; nothing ranks on minutes |
| T1d Android | Android config in `apps/mobile` (through the integration agent) | The Android build and store launch | 3 | Plays Settling in, Season One and a town week on a mid-range Android phone |
| T1e Indonesia's Home Neighbour | `packages/story/src/neighbours/**`, Indonesian glosses in packs | Sari, and glosses per first language in the stage and personal passes | 2 | An Indonesian learner's week has Indonesian glosses throughout |

Gate T1 (founder): the shop opens only if D30 > 10% has held since launch, after decision 7 in `story-engine.md` (the "never sell care" amendment) is made and CLAUDE.md and `concept.md` §13 are updated.

## What ships how (Release 4)

| Change | Ships by |
|---|---|
| Season 2 lines and data | Content cache (audio from R2) and EAS Update |
| Shop, wearables, friends boards | EAS Update and server, if the purchases SDK in the Release 2 build handles non-consumables (it does for Plus); the products are set up in App Store Connect |
| Android | A new Android build and store submission |

---

## Founder gates

| When | What |
|---|---|
| Before wave 2's TestFlight | Done 22 Oct 2026 (see TestFlight setup above) |
| Before wave 2f | RevenueCat project and the Plus products (monthly ₫149k, yearly ₫799k with ₫599k intro) in App Store Connect |
| Before the learner test | ElevenLabs plan with enough credits for live calls (Creator has ~50k left this cycle); an Anthropic key for Yapling (reusing 6pm's for now) |
| Before Release 1.1 wave B1 | Decisions 1–4 in `docs/beginner-path.md` §10 (Linh speaks Vietnamese; Settling-in calls free and the first week starting with the story; about 5,000 ElevenLabs credits; the Visitor name); native review of the 7 spoken Vietnamese lines |
| Before Release 1.2 wave D1 | The Episodes 2–6 script approved; decisions 1–5 in `docs/every-week-loop.md` §5 (free minutes after week 1, about 25,000 ElevenLabs credits, Dex's voice now, Arjun off-mic, the festival week); Dex's audition; native review of the Visitor task cards |
| Before Release 2 | yapling.app domain and trademark; native Vietnamese copy review; native-speaker review of every accent |
| Before Release 2 wave S1 | The art spike's verdict on the library pipeline (`story-engine.md` (e)); the style check at 30 scenes and 300 props during S1i |
| Before Release 3 wave M1 | Decisions 1–6 and 9 in `docs/story-engine.md` (the engine's shape, weekly review, festivals, about 70,000 ElevenLabs credits a month, the library at go-live, Jev, leaderboards); a TypeSafe key for Yapling if Jev is chosen |
| Before Release 3 go-live | The four shadow weeks reviewed (gate M3) |
| Before Release 4 wave T1 | Decisions 7, 8 and 10 in `docs/story-engine.md` (the "never sell care" amendment, direct prices, the shop after the retention gate); shop products in App Store Connect |
