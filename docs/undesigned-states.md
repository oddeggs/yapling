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
| Linh's knock | The learner's reply | The scene plays on the phone, not as a live call: the knock, Linh's recorded welcome with its caption, then the café at dusk and "Chúc ngủ ngon" as the primary button. The mic rests (no turn nobody would hear) |
| Coming back | Pip's line | The recap line (recorded) plays with its caption; Pip's own day 8 line has no recording and shows whole. "Về hang" turns primary once the line is done |
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
| Residency card | Strengths from the call | The summary's wins are written in the chrome's language (the English the learner said quoted as it is), under the chrome's title; the general strengths that fill the three are Pip's own line after unpacking, in the chrome's language |
| Residency card | First aims | The can-do catalogue's titles ("Ask someone what's wrong and offer help"), not the prototype's shorter wording |
| Level question | Short screens (iPhone SE) | The design's positions move up by what the shorter status bar saves; what doesn't fit in the sheet scrolls above "Tiếp tục", which stays put |
| Level question | English chrome | Linh's line shows in English without the Vietnamese meaning under it (meanings are written in Vietnamese only); the same for the Visitor card's can-dos |
| Level question | No back button | As the design: the learner changes their answer on the screen; the roommate step's back button comes back here |
| Visitor residency card | Short screens (iPhone SE) | As the level question: moved up, the can-dos scroll above the two buttons |
| Visitor residency card | After "Tập với Linh trước" on the Newcomer card | The card turns into the Visitor's (no placement-call strengths), with "Làm quen với Linh" / "Vào thẳng truyện" |
| Visitor residency card | A stage the server hasn't taken yet | The card shows the chosen stage at once; the choice is sent again when the app opens or comes back to the foreground, and dropped if the server refuses it |
| "Khó quá" sheet on the residency card | Copy for the card | The design draws the sheet over a call. On the card: "Nói chậm hơn" says everyone will talk slower with more hints (the pace the card's old chip set), "Tập với Linh trước" says six short calls come before the story, and the way out is "Quay lại thẻ cư trú" |
| Visitor's first evening | Before Settling in's first call | The day-one burrow with Pip and a chip "Linh đang gõ cửa · 2–3 phút", with the microphone pre-prompt when iOS hasn't asked yet; then the call. No door scene and no letter at dusk |
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
| Call | Ringing while the socket opens | The design starts on a speaking line. The scene and cast show at once, the pill reads "Đang gọi {who}" and the phone pill (the letter scene's ringing pill) bounces until the call is ready |
| Call | Thinking | The call frame has no thinking state (only the board's "Pip is thinking"). The listener takes the `think` mood and tilts 8°, its bubble shows its name, the AI tag and the hub's three `ydot` dots; the mic rests (white, grey bars) with no caption |
| Call | Reaction clip before a reply | A recorded "Ooh," covers the wait; the bubble shows the thinking dots, not "Ooh,", until the reply's own words arrive |
| Call | Hands-free learner turn | The design shows hold-to-talk only. In hands-free the mic shows its listening look on the learner's turn, with the same caption |
| Call | Correction, first beat | The call frame's badges ("I calling?" / "I'm calling?") need wording the server doesn't send. The character's question plays in the bubble and the learner's original shows in the "BẠN · nghe được" caption until the second try |
| Call | Wrapping up (minutes) | No minutes chip in the call frame. The speaker pill's place line gains the time left ("Quán Lantern · 0:48"), as on the meaning board's pill; at the end the exit becomes the primary button with "Hết cảnh" |
| Call | Reconnecting mid-call | No design. The mic rests and the last line stays; the call resumes the beat when the socket is back. After two minutes the no-connection sheet shows |
| Call | No connection | Voice notes are a later release: the sheet keeps the kicker and title, drops the voice-note line and button, and "Thử gọi lại" becomes the primary button |
| Call | Microphone off | Typing to the roommate is a later release: the sheet keeps "Mở Cài đặt" and drops "Nhắn chữ thay thế" |
| Call | Meaning, translation open | The board's "Ẩn bản dịch" chip replaces "Xem bản dịch" and folds the translation away again; the whisper's ✕ closes it all |
| Call | The letter | The prototype's "HARBOUR LANE OFFICE · NOTICE" kicker isn't in the story or a catalogue; the letter shows the story's own lines, sign-off included |
| Call | The letter's place, open and tucked | The café render has no letter, and the prototype's spot (over the window, tilted, under the bubble) covers Mei's face and hides under her bubble on a phone. The letter flies in open where the bubble isn't: on the counter's front left of the roommate while Mei or the office speaks up top, or under the speaker pill, above Mei's brows, while the roommate's bubble is low. When a bubble comes to its place it folds into the counter's corner left of the roommate's bubble (a small tilted letter, "Lá thư. Chạm để đọc lại" for VoiceOver), so it is open while Mei hands it over and reads it, and tucked from the roommate's question on; a tap opens it again in whichever place is free, and the whispered meaning's ✕ folds it away. On a short phone the lines scroll inside the paper. Faces and bubbles are never covered |
| Call | A spoken line with no written gloss | Every character line opens in the learner's language on a tap at Newcomer and Neighbour (journey §1.8 "Fade by stage"), not only the story's recorded lines: a generated line, a recorded line still waiting for its written gloss and "didn't catch that" show "Chạm để xem nghĩa" too. A tap opens the bubble's dashed gloss row reading "Đang dịch…" (the hand font, faded) while the call translates the line, then the Vietnamese; "Chưa dịch được. Chạm để thử lại nhé" if it fails. Asked once per line and kept for the call. From Regular the "What does that mean?" chip stays the help; Pass it on has none |
| Call | Several lines in one turn | No design; the bubble only ever shows the line now. Once the turn's last line has played, the bubble's top-right corner shows "‹ 2/3 ›" (small ink-wash round arrows, as on the whisper's ✕, and the count in the small label type); the arrows bring an earlier line back, still, in its speaker's bubble at their place, with its tap-to-gloss. The next line, or the learner talking, brings the bubble back to now. Nothing pages while a line plays, so the words never leave the voice |
| Call | What was said | No design. A round glass button (the back button's glass, the burrow's notes object) in the top corner left of the speaker pill, shown once a line has been said, opens a glass panel between the pill and the cards over the call bar: "NHỮNG GÌ ĐÃ NÓI", the call so far in the call's own bubbles (tap for Vietnamese) with the learner's heard turns in their caption, scrolled to the latest, and a round ▶ beside a recorded line to hear it again on the learner's turn. It rises like the whispered meaning; the ✕ closes it. The call bar stays in reach under it; while open it covers the scene, by the learner's choice |
| Call | Notebook, knock, dusk letter, postcard, voicemail and leaf beats | Not part of the live calls built here; the call shows nothing for them and carries on |

## The call when things go wrong

| Screen | State | Reason |
|---|---|---|
| Call | Turn with no answer ("didn't catch that", E3) | The board's E3 bubble ("Sorry, I didn't catch that. Say it another way?") with the listener confused, shown when the learner's turn gets no answer: nothing heard after a release, a failed reply (`stt_failed`, `llm_failed`, `tts_failed`), or no audio 6 s after the release (15 s once the call is thinking). The mic is the learner's again. "Type it" and "Say it in Tiếng Việt" are later releases and are left out |
| Call | Slow reply (E4) | The call sends `thinking` 0.6 s into a hold-to-talk reply with no audio (it already did for hands-free); the existing thinking state shows. A reply with no progress for 10 s fails as `llm_failed`/`tts_failed` and becomes the E3 state above |
| Call | Reconnecting mid-call | Replaces the row above: the phone pill (the letter scene's ringing pill) reads "Đang nối lại…" just above the call bar, the line that was playing stops, and the beat replays when the socket is back |
| Call | A phone call or Siri | No design. The same pill reads "Tạm dừng trong lúc bạn nghe máy"; the call holds its turn detection meanwhile (no hints or nudges) and lets go when the audio comes back |
| Call | Back from the background | No visible state: a socket that died while away reconnects at once (the reconnecting pill above), and the audio restarts if iOS stopped it |
| Call | Audio can't start | The session is set up once more; if the audio still can't start, the no-connection sheet (E1) shows with "Thử gọi lại" rather than a silent call |
| Call bar mic | Holding to talk | No design for how long to hold. A ring fills around the mic over the 2 s a turn needs (it appears whole at 2 s under Reduce Motion). A shorter press is a tap: nothing is sent and a tip rises over the call bar ("Giữ nút trong lúc nói nhé"), the toast's card with the roommate's face, with a light tap. Talking without holding no longer makes the mic look like it's listening |
| Call | A hold with no words | No design. A hold of 2 s or more with only noise or "uh", "um", "ờ" is not a turn: no character answers, the beat stays, no try counts, and the same tip reads "Mình chưa nghe rõ. Giữ nút và nói lại nhé." A hint card already up stays for the next try. Hands-free ignores such a segment without a tip (there is no button to hold) |
| Call | A long quiet on the learner's turn | Thinking time is unlimited: silence never ends, moves or fails a turn, and no character nudges. After 18 s the hint card may slide up once, silently, at Newcomer and Neighbour (as when asked); nothing else happens. The fallback lines remain for real tries (unclear answers, hinted errors) |
| Call | Pass it on and the 30-second teach-back | The rounds stay timed but the ring counts only while the learner talks (held mic, or speech in hands-free); it holds still while they think, so the rounds still shrink 90 / 60 / 45 s of talk without any time pressure on thinking |
| Burrow while settling in | Before Chapter 1 | The board starts after Chapter 1. Day 1 shows the same card for Chapter 1 ("Hello", Linh's sticker, "Gặp Linh · 2 phút") over all six boxes |
| Burrow while settling in | After "Để mai" | The board shows only the suggestion. "Để mai" keeps the card with "Hẹn bạn ngày mai nhé. Chương sau vẫn chờ bạn." and one frost "Làm tiếp" button; the next morning the card offers the next chapter again |
| Burrow while settling in | After "Chúc ngủ ngon" | No design. The letter card stays, without a button, until the next morning (week 1's day 2) |
| Burrow while settling in | "Vào truyện luôn" | The letter comes that evening: the burrow shows the letter card at dusk ("LÀM QUEN · XONG n/6", the boxes left still stacked) on the day it is tapped, which becomes week 1's day 1 |
| Burrow while settling in | Chapter card minutes and button | The board shows "Gặp Linh · 3 phút" for Chapter 2; the minutes follow `beginner-path.md` §4 (2, 2, 2, 3, 3, 3), and Chapter 5 (Mei's café, no Linh) reads "Đến quán Mei · 3 phút" |
| Burrow while settling in | Pip at the window on the letter's day | The board's line is unrecorded. Pip says Chapter 6's last recorded line ("Look! A letter under Mei's door!"), tap for the meaning, as every bubble |
| Burrow while settling in | Short phones (iPhone SE) | The card would cover the rug and the boxes: the room rises above the card (the pill and the card stay), and the Settling-in list starts higher and scrolls its rows |
| Burrow home | After Settling in | The room stays unpacked (no box by the door) from the letter's day on, for a learner who settled in with Linh |
| Settling-in list | Opened in the story | The list opens over the burrow home from a link (`/(home)?settling=1`, for the Me sheet's "Làm quen lại với Linh"); "Vào truyện luôn" is hidden once the letter has come |
| Visitor after-call card | No sentences to show | The call screen hands over what it heard; after a restart the lines the server kept as can-do evidence for the call stand in. With neither, "Bạn đã nói được" is left out and the seed packet and the question keep their places |
| Visitor after-call card | A chapter with no seed packet (Bus 45) | The seed card is left out; the question stays where the design puts it |
| Visitor after-call card | A Visitor's story call (not Settling in) | The same card: the kicker is the call's kind ("Tập truyện"), the seed is the first phrase met in the call, and the box line is the week-1 one |
| Visitor after-call card | "Khó quá" | Opens the "Khó quá" sheet from the call boards, with "Quay lại" for "Quay lại cuộc gọi" and after-call lines under the two choices. "Nói chậm hơn" sets the slower pace and Linh says the design's reply; "Tập với Linh trước" keeps a Visitor with Linh (a Newcomer replaying a chapter becomes a Visitor) and Linh says she'll practise first |
| Stage-up | Staying during the day | "Ở lại thêm" before five in the afternoon ends on "Về hang" in the day's light; the design's "Chúc ngủ ngon" and evening light are kept for the evening |
| Stage-up | Motion | The design's hand-over (`yhand`) and stamp (`ystampin`) aren't theme motion tokens yet: the card flies in with the residency card's motion and the stamp pops with the round pop, at the design's delays |
| Me sheet | Newcomer's "Làm quen" card | A Newcomer gets "Khó quá?" (slower, or practise with Linh as a Visitor) and, once they have played a chapter, "Làm quen lại với Linh"; "Thử nhanh hơn" is the Visitor's only |
| Me sheet | Settling-in chapter list | "Làm quen lại với Linh" opens a page in the sheet like the memory page: the six chapters, the played ones and the next one open to play again |
| Me sheet | Visitor rows | As the board: no progress row (the numbers start with the story) and no "Thêm phút với Plus" (Settling in uses no minutes); the AI and delete-data rows stay below, as for every learner |
| Me sheet, stage-up | A stage choice waiting for the server | The choice shows at once (the Me sheet's stage, the stage-up phase) and is sent again in the background until the server takes it; nothing extra is shown |
