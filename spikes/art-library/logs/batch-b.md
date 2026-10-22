# Batch B log (10 props, gen/20-batch-b.js)

Batch wall time: 23:33:56 (start reading kit) to 23:43:11 (log written). Reading kit, example, schema and house code: 23:33:56 to 23:37:42.
All ten props were drafted together in one file from 23:37:42, then rendered as one spec (16 PNGs, incl. variants) per pass,
so start times are shared and "minutes" is elapsed time from that shared start to the moment the prop was accepted (overlapping, not additive).
"Renders" counts passes in which that prop's code had changed (whole-spec re-renders of an unchanged prop are not counted).
All final renders: no linter flags (on-palette, 0 gradients, ink 1.8 to 7 pt, outsidePx 0), baseline 0.94 to 0.96.

| prop id | start | end | min | renders | what was fixed between tries | verdict |
|---|---|---|---|---|---|---|
| laptop | 23:37:42 | 23:40:00 | 2.3 | 1 | none | pass: lid, CY2 screen with a card and a chat bubble, keyboard slab with dashed key row; reads instantly. 17 ops, h 0.76 |
| desk-lamp | 23:37:42 | 23:41:18 | 3.6 | 2 | night halo moved under the shade mouth and drawn first, so no glow sits on the shade body | pass: articulated arm reads; night = translucent BUT cone + pool + stacked 'lighter' discs (no gradient). 17/22 ops |
| clipboard | 23:37:42 | 23:40:00 | 2.3 | 1 | none | pass: kraft board, sheet, 4 ink lines, FOG clip. h 0.90 (top of range) |
| smartphone | 23:37:42 | 23:41:50 | 4.1 | 3 | r1 bubbles were pills (read as buttons, phone read as a remote) -> wider case, notch, bubbles with tails left/right; r2 h 0.92 -> shortened case to h 0.87 | pass: reads as a phone with a chat; tails are small at 60 pt, the bubble outline crosses the tail base (acceptable) |
| electric-fan | 23:37:42 | 23:40:00 | 2.3 | 1 | none | pass: round guard, 12 ink spokes in one path, three CY2 blades, CY hub, piano-key base (the VN table fan). 25 ops (top of 6-25) |
| suitcase | 23:37:42 | 23:41:18 | 3.6 | 2 | baseline 0.92 (wheels had no stroke) -> wheels lowered 1.5 | pass: body, tint ribs, telescopic handle, wheels, BUT tag; coral variant checked |
| backpack | 23:37:42 | 23:41:18 | 3.6 | 2 | side straps were thin and read as a halo ring -> wider bulge, ink 7 + tint core 3.4 | pass: body, flap, buckle, front pocket with zip, top loop, straps |
| helmet | 23:37:42 | 23:42:29 | 4.8 | 4 | r1 tall dome read as a hard hat, visor hidden -> lower shell, big visor + pivot; r2 crown band read as a notch, visor shadow showed grey through translucency -> removed band, WH decal stripe; r3/r4 visor opaque CY2 + glass highlight | fix: clearly a helmet with a clear visor, but at a glance it could still pass for a generic cap/hard hat; the chin strap on the ground is small. A front view with both strap ends might read more "mũ bảo hiểm"; max renders reached |
| passport | 23:37:42 | 23:40:00 | 2.3 | 1 | none | pass: PLUM cover, BUT title bars, emblem (ring + star) and e-chip mark, no words; coral variant uses APRI marks |
| star-lantern | 23:37:42 | 23:41:50 | 4.1 | 3 | r1 thin pentagram, leaf-shaped tassels, odd glint -> chubby star (inner ratio 0.5) with the bamboo pentagram drawn as ink lines, lit core in tint; r2 tassels read as flags -> three strands per side (ink 4.6 + BUT core) | pass: reads as đèn ông sao on a stick; night variant = BU core + halo behind + two sparks |

Totals: 10 props, 20 prop-renders (4 whole-spec passes), 9 pass / 1 fix / 0 fail.
