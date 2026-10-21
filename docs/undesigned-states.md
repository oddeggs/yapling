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
