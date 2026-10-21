# Yapling: design review of the Week 1 prototype

Reviewed 22 Oct 2026 against `docs/prompts/claude-design-prototype.md`, `docs/season-1-script.md` and `docs/cast-bible.md`. Source: `design/prototype/` (Claude Design export of 22 Oct). Fixes here override the visuals; they don't need another design round.

## Verdict

The prototype does what the prompt asked and is ready to build from. All 26 steps from day 1 to day 8 are there, in Vietnamese chrome with English learning content. The facilitator panel works, the recorded voices play with synced mouths, and the four answer modes (Script, Fine, Target error, Silent) exercise the correction, hint and "didn't catch that" paths. The week reads as a story, and each day has a different payoff: a call, a story with nothing to fail, a teach-back, a timed retell, a keepsake, a voicemail and a fair paywall.

## What's strong (keep exactly)

- **The call frame:** a speaker pill (name, AI tag, place), a big speech bubble with a progressive caption and "Chạm để xem nghĩa", the critter in its place, and a bottom bar of "Chờ chút" (give me a second), the mic and an exit. One layout serves every call.
- **Lock screens between days** carry each day's hook in the character's voice.
- **The week view** ("Tuần này"): three call slots with a character face each, and the four phrases as seed packets with Vietnamese glosses in the hand font.
- **After the call:** two wins, one fix shown as "I calling → I'm calling", seeds turning into sprouts, a box unpacked, ring 1/3.
- **The keepsake:** Pip draws a certificate signed by Linh with the date and hangs it on the wall. This is the emotional payoff of the week.
- **The paywall:** honest copy, "Không phải bây giờ" the same size as the upgrade button, and "Pip, the burrow and the story stay either way."

## Fixes (build these, not the visuals)

1. **Splash logo:** the moon overlaps the end of the "yapling" wordmark, and a stray shape clips at the left edge. The wordmark must sit clear of the art.
2. **"Dùng thử Plus" promises a free trial we don't have.** The first week is the trial. The button reads "Nâng cấp lên Plus" (en: "Get Plus"), unless an introductory free trial is configured in App Store Connect, in which case the copy shows its real length.
3. **The paywall needs the App Store basics:** restore purchases, links to terms and privacy, auto-renew wording, and the price from StoreKit (never hard-coded). The student price needs a real flow; until then the line links to support.
4. **Lock-screen dates** run Tue 22 Sep to Mon 28 Sep (a demo year). In the app the dates are real, relative to install day.
5. **The status bar** is overdrawn by art on the roommate picker (d1-pick) and the burrow strings. Art stays below the safe area.
6. **"Kết thúc tuần" (End week) on day 8** is prototype-only. In the app, day 8 continues into Episode 2.
7. **The end screen ("Cảm ơn bạn đã thử Yapling!") and the facilitator panel** belong only to the learner-test build (a dev menu), never to the store build.
8. **The keepsake signature** "Lan can now…" uses the user's name from onboarding; the date comes from the day it was earned.
9. **The Mei call** must show the café scene and Mei behind the counter for the whole call; Pip appears small at the side, as on d2-call.
10. **Captions** highlight word by word from TTS alignment (live) or timing JSON (recorded). Never fake a reading speed.

## Gaps the prototype leaves (build from existing components; log in `docs/undesigned-states.md`)

- Sign-in / account recovery (Apple), and "delete my data".
- The memory page ("What Pip remembers") with edit and delete. It exists on the R5 boards; port it from there.
- A long silence or a network drop mid-call: reconnect, resume the same beat.
- Minutes running out mid-call: Pip wraps up kindly, and the scene saves its place.
- Microphone and speech-recognition permission prompts on iOS (pre-prompt in the app's voice, then the system sheet).
- The 3-hour break reminder and the crisis protocol (the safety sheet exists; the trigger flow does not).

## Copy notes

- Keep Vietnamese chrome casual and warm ("tụi mình", "bạn"), as written. Run every string past a native reviewer before TestFlight to learners.
- English learning lines come only from `docs/season-1-script.md` and the cast bible, never invented in a screen.
