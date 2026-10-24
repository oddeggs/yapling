# The first build of the rewrite

Built on 24 Oct 2026 from `docs/rewrite/brief.md` §11. TestFlight build 8 (version 0.2.0), dev API `https://yapling-api-dev.bkdev98.workers.dev`.

## The loop

1. **Open the app.** It opens straight into a painted place at the real local time. On the very first open that is the burrow with Pip, who asks your name.
2. **A moment begins by itself.** The resident opens with the director's own line, so there is no wait for a model. You answer out loud, hands-free.
3. **Each reply.** Haiku writes the reply from the beat it is on. The reply also reports whether the beat's goal was met: if yes, it moves on; if not, it helps another way. After three replies on one beat, code moves on anyway. After your second reply, code picks a lane: simple Visitor lines for a beginner, open questions for a strong speaker. Beginners see their own language under each line; it is written with the reply, so the voice never waits for it. "Again" or "slowly" says the last line again. Jev watches every turn for a crisis.
4. **The moment ends** on its own, or when you leave it. It becomes a kept painting: its closing title at once, the judge's notes a few seconds later (what you did, what the resident learned from you, the phrases you used well).
5. **Behind the scenes.** Sonnet updates the learner model: level, interests, life, culture. Then Opus plans the next moment from the learner model, the story so far, who is in town at your hour, the town's weather, and your own country. This takes about 40–80 s.
6. **Go on.** If the next plan is ready, it plays. If not, Pip's free moment in the burrow fills the gap. From the menu you can visit any place whose resident is in right now.

This loop never runs out of story. Each plan is about $0.11–0.18 of Opus, each judge about $0.02, and each conversation about $0.03 of live costs plus TTS.

## What is in it

- **The scene.** Twelve places painted live from the atlas's own code in a web view, with light from the real clock and the town's weather. Residents keep their hours. The camera leans in while you talk. The 45 comes at :00, :20 and :40, with its sound.
- **Words arrive like paint**, as the voice says them; yours show grey while heard and white once final.
- **The one glass control** (liquid glass on iOS 26+): a hint, the ember while you speak, three choices (say it again, pause, menu), "go on", and the kind out-of-time line.
- **The menu sheet:** who is where right now (tap to visit), the wall, your words, settings (gloss, sound, what the town remembers, delete everything), and Plus (shown, not yet on sale).
- **Sound:** each place's ElevenLabs music and ambience, with rain and wind on top. It is off until the first tap. During a conversation it plays through the call's own graph, so echo cancellation keeps it out of the mic.
- **The safety sheet** for a crisis: the AI disclosure as each conversation opens, and the break reminder after three hours.
- **Free minutes are daily:** 20 a day for the first 7 days, then 10 a day. Plus is set at 120 a day.

## The learner's own world

The director knows the learner's country (from the phone's region) and first language, and whatever they have told the town about home. Neighbours ask about real life there: a dish, a festival near on the learner's own calendar, the commute. The learner is the expert. There is at most one such touch per moment, choices are offered when something is unknown, and there are no stereotypes and no politics or religion. Natterwick keeps its own festivals. See `CULTURE_RULES` in `apps/api/src/director/world.ts`.

## Decisions taken without the founder

- **The painting runs in a web view.** The atlas's canvas code runs as it is in a WebView, not ported to Skia. The art matches the design exactly, it runs on JavaScriptCore with its JIT (faster than Hermes for this drawing code), and it costs nothing to keep in step with the atlas. Native UI (control, sheets, kept card) sits on top. This can be ported to Skia later if profiling on devices says so.
- **No onboarding wall, so no age screen.** The guest is created on the first open with `ageConfirmed: true`. **Founder: decide how the 18+ rule is met** (App Store age rating alone, or a one-line confirm before the first talk).
- **"Say it again" repeats the resident's last line.** Redoing your own line needs a server change, so it waits for the next pass.
- **Only the resident speaks in each place.** The paintings have one character each; others are talked about.
- **Replays on the wall are text only.** The audio of past conversations isn't stored yet.
- **Plus isn't on sale** in this build: the sheet says it opens soon. Prices are the founder's to set.

## Known rough spots

- The planner's first attempt sometimes breaks a rule (a long Visitor line, a place that's closed at that hour) and needs a repair. That makes a plan 70–80 s instead of 40.
- When the reply is trimmed, the gloss can show slightly more than was said.
- Pip's learner English follows the cast bible ("Bus 45 come soon"). It's worth listening to whether it is too broken for Newcomers.
- The web view takes a moment to paint on a cold start, so the screen is dark for about a second.
- ElevenLabs credits: about 13k are left until 30 Oct. A conversation uses roughly 300–600.

## Testing without a phone

`apps/api/scripts/play-moment.mts` plays a moment against `wrangler dev` (or `API_BASE=<dev>/api`), speaking the learner's lines with macOS `say`. That is how the loop above was checked end to end.
