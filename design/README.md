# Yapling design index

Source of truth: `design/prototype/` (Claude Design export, 22 Oct 2026). Open a file with a local server from this folder (`python3 -m http.server`), not from disk. Renders land in `design/renders/<id>.png` (tool: `tools/design`). Fixes in `docs/design-review.md` override the visuals.

| File | What it is |
|---|---|
| `Yapling Week 1.dc.html` | The clickable first week, day 1 to day 8. Open any step with `?step=<id>`. Shift+F hides the facilitator strip |
| `Yapling Week 1 Map.dc.html` | Every step and branch on one page |
| `Yapling Prototype.dc.html` | The earlier hub prototype: town map, incoming call, Me sheet, Plus, voice postcard, end of episode |
| `boards/*.dc.html` | Rounds 4–5 boards: brand and components, onboarding, home and calls, town, journey, learning, real week, care and errors |
| `art/*.js` | Parametric generators for critters, cast, stickers, scenes. Synced into `@yapling/art`; never edit the copies |
| `audio/` | Recorded lines used by the prototype (copies of `audio/season-1/lines/`) |
| `fonts/` | Kithfield Hand Bold. Lexend comes from Google Fonts |

## Screens by release

Release 1 is the first week (the learner-test build). Ids are `?step=` values in `Yapling Week 1.dc.html` unless a board is named.

| Id | Screen | Release |
|---|---|---|
| d1-splash | Splash and first language (8 options) | 1 |
| d1-ai | Pip and the neighbours are AI | 1 |
| d1-pick | Choose your roommate (red panda, capybara, cat) and name | 1 |
| d1-unpack | Unpacking chat: the one-minute placement call | 1 |
| d1-card | Residency card: Newcomer, three strengths, two can-dos, too easy / too hard | 1 |
| d1-notif | Notifications in context, quiet hours | 1 |
| d1-linh | Linh knocks at dusk; the letter under the café door | 1 |
| d2-lock … d8-lock | Lock-screen knocks (system notifications; copy only) | 1 |
| d2-week | This week: ring with three calls, four seed packets | 1 |
| d2-call | Episode call at the café (Mei): correction, hint, "what does that mean?" | 1 |
| d2-post | After the call: two wins, one fix, seeds sprout, ring 1/3, a box unpacked | 1 |
| d3-story | Voice story and Linh's postcard; nothing to fail | 1 |
| d4-teach | Real week: teach Pip to introduce yourself (30 s ring) | 1 |
| d5-bus | Pass it on on Bus 45 (90/60/45 s, fluency mirror) | 1 |
| d5-keep | Ring full; keepsake drawn and hung on the wall | 1 |
| d6-vm | Pip's voicemail; fix Pip's "Can I helping you?" (phrase becomes a leaf) | 1 |
| d6-season | Season map, Episode 2 glowing | 1 |
| d7-pay | Yapling Plus paywall (Vietnamese) | 1 |
| d8-back | Back in the burrow (normal and after three days away) | 1 |
| Real week board: C3, E1–E4 | Safety sheet; no connection, mic denied, didn't catch that, slow reply | 1 |
| Learning board: Me sheet | Me sheet (stage, can-dos, fixes you own, what Pip remembers, settings) | 1 (lite), 2 (full) |
| Learning board: L6, L9 | Phrase lifecycle, fix graduation | 2 |
| Real week board: R1–R5 | Bring your homework, rehearsal with Dex, good luck, how did it go | 2 |
| Home board: H6, H7, H9, H10 | Voicemail, voice notes, minutes resting, break reminder | 2 |
| Town board: T1, T2, T4 | Recap, episode end, job party | 2 |
| Journey board: J1–J5 | Week, season map, stage-up, Hank at two stages | 2–3 |
| Learning board: L12–L14 | Listening checkpoint before a move-in | 3 |
| Town board: T3, T5, T9 | Move-in, time capsule, home-screen widget | 3 |
| Prototype: town, ring | Town map, incoming call | 2 (map), 3 (incoming call with Live Activity) |
