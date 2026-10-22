# Yapling: releases

Status: in progress · Started 22 Oct 2026
Inputs: `docs/concept.md`, `docs/journey-and-story.md`, `docs/season-1-script.md`, `docs/cast-bible.md`, `docs/tech-decisions.md`, `docs/design-review.md`, `design/README.md` (screen index with the release for every screen), `CLAUDE.md` (the agent contract).

## The releases

| Release | Ships as | Name | The pitch | Ships | Proof it worked |
|---|---|---|---|---|---|
| 1 | Internal TestFlight (learner test) | **First Week** | The prototype's week, for real: live AI calls, recorded cast, the burrow changing day by day | Onboarding and placement call; burrow and week view; Episode 1 call with Mei; voice story and postcard; teach Pip; Pass it on; keepsake; voicemail; season map; the Plus paywall (sandbox); lock-screen knocks; Me sheet lite; safety and error states; a dev-only time-travel menu for test sessions | 5–8 Vietnamese professionals each run day 1–8 in a moderated session; the founder's checklist in `docs/prompts/claude-design-prototype.md` ("What we're testing") |
| 1.1 | Over-the-air update to the TestFlight build | **Settling in** | A way in for true beginners: six short calls with Linh before the story, and an easier week 1 | The Visitor stage; the level question and a placement call that sets the stage; Settling-in Chapters 1–6; Visitor versions of week 1; "again" and "slowly" honoured in every call; "too hard" anywhere | 3 true beginners each finish Chapter 1 unaided and at least 2 finish Chapters 1–6 and the café call (measures in `docs/beginner-path.md` §9) |
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

---

# Release 2 · Season One (App Store, Vietnam) — outline

Planned in detail after the learner test. Waves: content (Episodes 2–6 scripts compiled with a Visitor version of each hard turn, as `docs/beginner-path.md` §7 does for week 1; Hank's stage takes, real-week and practice catalogues), features (Bring your homework with Dex, phrase lifecycle to bloom, fix graduation, memory page, voicemail and voice notes, minutes resting, break reminder, crisis protocol, Sign in with Apple), store (icon, screenshots, privacy labels, App Review notes with a demo account), launch (Plus live, analytics gates).

## Founder gates

| When | What |
|---|---|
| Before wave 2's TestFlight | Done 22 Oct 2026 (see TestFlight setup above) |
| Before wave 2f | RevenueCat project and the Plus products (monthly ₫149k, yearly ₫799k with ₫599k intro) in App Store Connect |
| Before the learner test | ElevenLabs plan with enough credits for live calls (Creator has ~50k left this cycle); an Anthropic key for Yapling (reusing 6pm's for now) |
| Before Release 1.1 wave B1 | Decisions 1–4 in `docs/beginner-path.md` §10 (Linh speaks Vietnamese; Settling-in calls free and the first week starting with the story; about 5,000 ElevenLabs credits; the Visitor name); native review of the 7 spoken Vietnamese lines |
| Before Release 2 | yapling.app domain and trademark; native Vietnamese copy review; native-speaker review of every accent |
