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
| After the call | Feedback still being written | The summary arrives a few seconds after the call. The page shows "Xong rồi!", the roommate thinking and "Pip đang ghi lại…", with "Về hang" still available; it fills in when the server has the summary (polled, backing off) |
| After the call | A call with no wins (a short one) | No win rows and no fix: "Pip rất vui được trò chuyện" and a kind line in their place. Never a miss |
| After the call | One win only | The label reads "1 ĐIỀU LÀM TỐT" instead of "2 ĐIỀU LÀM TỐT" |
| After the call | Phrases that leaf or bloom, or are only met | The phrases label follows the biggest move ("TỪ MẦM THÀNH LÁ", "ĐÃ NỞ HOA", "GÓI HẠT MỚI"); each tile shows its new stage and grows from its old object. More than four phrases wrap to a second row of four |
| After the call | Bar line after week one | Only week one has boxes to unpack. Later calls say how many things are new in the burrow (newly sprouted phrases), or show the ring tag alone |
| After the call | Fluency numbers | The first call shows none (nothing to compare with). Later calls show a small receipt from the post-call board (Flow, Pace, Pauses in Courier New), with "up from" only when Flow grew since the first call, highlighted mint instead of the board's green text (no dark-mint colour in the theme) |
| After the call | Something follows (fix graduation, keepsake) | The button reads "Tiếp tục" instead of "Về hang", and goes to the graduation, then the keepsake, then the burrow |
| After the call | A phrase in bloom | The bloom card from the phrase-lifecycle board ("NỞ HOA · CỦA RIÊNG BẠN", the bloom, sparkles) sits under the phrase tiles |
| Fix graduation | Roommate pose | The board's Pip holds a book; `@yapling/art`'s critter has no props, so Pip stands proud without it |
| Keepsake | Full ring with no can-do ticked that week | The certificate reads "fill a whole week with calls", signed by the roommate |
| Keepsake | Several keepsakes from one call | Each is drawn and hung in turn; the ring header shows on the first only |
| Keepsake | A can-do ticked mid-week (ring not full) | The can-do board's bar: track tag, "Thêm một điều bạn làm được", the count in that track; the frame hangs higher with no ring header |
| Keepsake | Hanging it | "Treo lên tường" shows the "Đã treo trên tường hang" toast with the roommate's face and returns to the burrow, whose wall lists every earned keepsake |
| Ferry (first run) | The age check | The week prototype goes from the language sheet straight on; the hub's ferry arrival has the "I'm 18 or older" row and "Step off the ferry". Both are kept: the language sheet, then a second sheet on the same harbour with the age row and that button |
| Ferry (first run) | The learner's name | The profile needs a display name (the keepsakes are signed to it) and the placement scene doesn't ask for one. A "Your name" field, the roommate picker's frosted field at 56 tall, sits above the age row; "Step off the ferry" opens once the name is typed and the box ticked |
| Ferry (first run) | Wordmark | Design review fix 1: no glass backing (its edge clipped the left cloud); the wordmark is set at 62 under the status bar and the top cloud, ending before the moon, its line under it |
| Ferry (first run) | The guest session can't be made | A muted line above the button: no connection, or Natterwick not answering; the button tries again |
| Roommate picker | Status bar | Design review fix 5: the town is drawn from the top of its map frame, starting under the status bar, so its two top clouds don't show |
| Roommate picker | The profile can't be saved | A muted line under the name row ("Couldn't move in yet…"); "Move in" tries again |
| Unpacking chat (before the call) | Microphone not asked yet | The hub's first chat: the day-one burrow with Pip waving, the "First chat · about a minute" pill, and the white "So Pip can hear you" card with "Allow microphone" before the system sheet. When iOS has already asked, the call opens at once |
| Residency card | Back button | Left out: the placement call can't be taken back, and "Continue" is the only way on |
| Residency card | Summary still being written | One frosted row with a spinner and "Pip is writing it down…" in place of the strengths; after a minute without a summary, the three general strengths show |
| Residency card | Strengths from the call | The summary's wins are written in simple English, so they show in English under the chrome's title; the general strengths that fill the three are Pip's own line after unpacking, in the chrome's language |
| Residency card | First aims | The can-do catalogue's titles ("Ask someone what's wrong and offer help"), not the prototype's shorter wording |
| Notifications | Changing the quiet hours | A small "Change" chip under the quiet hours row opens two rows of choice chips: from 21:00, 22:00 or 23:00, until 07:00, 08:00 or 09:00 |
| Notifications | Pip's phone | The art's critter has no phone pose yet: Pip is drawn excited, without the phone |
| Voice story | Before Pip reaches a line | The design shows the story's lines all at once. Each line of the story appears as Pip starts it, first line from the start; once the story has played they all stay |
| Voice story | "Chờ chút" pressed | The design has the button, not the state. The audio and the caption stop where they are; the button inks over to "Tiếp tục" as in the call bar, and the story carries on from the same word |
| Voice story | Duration in the top pill | The prototype says "0:40"; the pill shows the recording's own length ("0:29") |
| Voice story | A line's gloss | The design shows the line cards closed. A tap opens the gloss under the line in the hand font (as the letter does) and toasts "Đã thêm vào hang thành gói hạt"; another tap closes it |
| Postcard | Its gloss | A tap on the hand-written note opens the gloss under the signature, in the hand font |
| Voicemail | Opening | Before the call's first frame the voicemail card shows with an idle waveform and the mic waits, white and grey |
| Voicemail | Pip worked it out | The learner stayed quiet and Pip fixed its own phrase (the scene's fallback). The leaf sticker shows white with the phrase's current object and "Pip tự nhớ ra rồi"; nothing grows, nothing is lost |
| Voicemail | Fix on the same day as the last use | The learning model keeps a sprout a sprout until another day: the sticker says "Đã nảy mầm" with the sprout, without the grow |
| Voicemail | The line dropped or never opened | A glass note ("Đường dây đang rè. Thư thoại của Pip vẫn chờ bạn ở đây.") with a small "Thử lại" button under the pill; "Xem bản đồ mùa" stays available |
| Season map | Finished episode | From the R5 journey board: a green pin with a small white keepsake card tilted at its top right |
| Season map | Next episode already open | Without the day: "Help Wanted" alone, and "Tiếp tục" opens its call |
| Season map | Season done | No next-episode card; the route is walked to the last pin |
| End of an episode | Whole screen | Designed (hub/epend) but not built in this release: it needs a per-episode cliffhanger scene and a "Remind me" knock for the next episode. Release 2 |
