# Undesigned states

States built from existing components because the design does not show them.

| Screen | State | Reason |
|---|---|---|
| Shared buttons (StickerButton, call bar exit) | Pressed | The prototype has no pressed look. The face sinks onto its flat ink shadow while held; glass buttons and chips squeeze slightly |
| StickerButton | Disabled | Only the brand sheet's glass "Disabled" exists. Any tone, disabled, shows the glass button with dim text and no ink |
| Residency card aims (CheckRow `aim`) | Aim met | The design only shows the empty box. A met aim fills the box mint with the strengths' tick |
| Call bar mic | Paused ("Chờ chút" on) | The design gives the caption ("Tạm dừng · cứ từ từ") and the inked hold button, not the mic. The mic shows its waiting look (white, grey bars) until "Tiếp tục" |
| Call bar mic | VoiceOver | Hold-to-talk cannot be held with VoiceOver. A double-tap starts talking and the next double-tap ends the turn |
| Week call slots (CallSlotRow) | Call done | The prototype fills the dashed status ring with the call kind's colour and keeps the dashed edge; built that way, with no tick |
| Speech bubble | Line without a gloss | No "Chạm để xem nghĩa" and no tap action; the bubble is read as text by VoiceOver |
| Lock-screen card preview | Time label | The system writes the lock screen's time ("bây giờ"); the in-app preview takes the time from its screen, and the catalogues have no "now" key yet |
| Any art spot (CritterSlot) | Before `@yapling/art` lands | A dashed outline of the art's exact box (critter 1 : 1.2, object 3 : 4, face square) |
| Burrow home | Bottom of the screen | The hub's Burrow / Chat / Town bar needs the town map (release 2). The day's one thing to do is a primary button in the glass bar, as on the keepsake screen; no button on day 1 after Linh's knock (the day is done) |
| Burrow home | The card at the top, day by day | The design shows one card ("Mei sent a voice postcard"). Each first-week day has its own card from the week plan (the letter, the box unpacked, Pip's story, the feather, the favour, Bus 45, the keepsake, the voicemail, the first week done, the next episode), never the same two days running; the copy is new and needs the native review |
| Burrow home | Pip's line | The design's line in the burrow is unrecorded and not in the story. The burrow shows Pip's own knock line of the day (days 2 and 4), in a Pip bubble with the AI tag and no gloss; other days show no bubble |
| Burrow home | Ring chip | From the R4 home board ("2/3 cuộc gọi"): a glass pill with the small week ring; it opens the week view |
| Burrow home | Keepsake on the wall | The design shows only the hanging moment. The newest keepsake stays on the wall over the map picture as the same drawn frame, small and tilted |
| Burrow home | Mailbox | From the hub burrow: it appears with Linh's postcard on day 3 and holds a letter while the postcard or the voicemail is unopened |
| Burrow home | Seagull feather | The prototype's toast draws the feather as the first-stage plant; it stands on the shelf with that art and its name under it |
| Burrow home | More than six phrases | The two shelves hold three each: the newest six phrases stand there (nothing leaves because of time) |
| Burrow, Linh's knock, coming back | Status bar | Design review fix 5: the room is drawn below the status bar (lowered by the safe area less the prototype's 40-point bar); the band above is the scene's own top edge stretched, in the scene's light |
| Coming back | Last button | "Kết thúc tuần" is prototype-only (design review fix 6); the button reads "Về hang" and the burrow then shows the next episode |
| Coming back (day 8) | Next-episode card | Shown at once after days away; on a normal day 8 it rises after the learner's answer, as the prototype's beat does |
| Coming back | No story yet to recap | Away before the first episode: Pip says its knock line "You're back? I kept your seat warm." (no recording, no gloss) and the card shows Episode 1 |
| Week view | Week across two months | "28 tháng 9 – 4 tháng 10" / "Sep 28 – Oct 4" |
| Week view | Every call done | No primary button under the phrases |
| Week view | Calls not open yet | Their rows are not buttons; VoiceOver reads "Sắp tới" |
| Paywall | Restore purchases, terms, privacy, auto-renew wording | Required by the App Store, not drawn. A row of small underlined links and the auto-renew note under the students line, inside the sheet's scroll, above the equal button pair |
| Paywall | Store prices loading, or the store not answering | Plan cards show "…" for the price, the upgrade is disabled, and a one-line note says the App Store isn't answering |
| Paywall | Development build without a RevenueCat key | The design's prices with a dev-only note above the cards; the upgrade is disabled. Never in a store build |
| Paywall | A free trial configured in App Store Connect | The upgrade reads "Try N days free" and the yearly card carries it as its green tag instead of "Intro" |
| Me sheet | AI explainer and delete my data | A second rows card under the settings rows, same row style; the delete row is plain ink, not red |
| Me sheet | Loading | The sheet with a spinner until the profile and progress arrive |
| Me sheet | Delete my data confirmation | The sheet's content becomes a title, what is deleted and when, and an equal pair: "Keep my data" (white) and "Delete everything" (ink) |
| Me sheet | The memory page ("What Pip remembers") | The R5 board names it but doesn't draw it. In the sheet: a back button and the title, a line on what it is, then one rows card per section (about you, coming up, about us) with each note's text and Edit / Delete links; editing turns the note into a text field with Cancel and Save |
| Me sheet | Fixes you now own | Left out of the first-week sheet: no fix can graduate in the first week (five self-corrections over three days) |
| Safety sheet | A country with no verified number | No call button; the emergency row asks the learner to call their local emergency number |
| "Pip is an AI" sheet | Opened from the Me sheet | The C2 board's sheet, with the onboarding catalogue's lines (the voice line reads "Delete it any time") |
