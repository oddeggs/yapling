# Scenes batch: market, park, platform

File: `gen/40-scenes.js` (one IIFE, all three scenes). Specs: `specs/scenes.json` (23 renders). Output: `out/scenes/*.png`, metrics `out/metrics-scenes.json`. Catalogue: `catalogue/scenes.json`.

Wall clock: 23:34:33 (start reading kit + references) to 23:47:30 (log written) = **~13 min total**.
Reading kit, schema and the 11 reference renders took ~4 min (23:34–23:38); one coding pass wrote all three scenes (23:38–23:42).
All three scenes were rendered together in every round (rounds at 23:42:39, 23:45:01, 23:46:10), so per-scene times overlap; the split below is by the work that went into each.

| scene | start | end | minutes (approx share) | render rounds | what was fixed between rounds | verdict |
|---|---|---|---|---|---|---|
| market (`s_market`) | 23:38 | 23:46:10 | ~4 | 3 | R1→R2: far market (houses + stall row) was full-height and busy behind the critter: lowered roofs, removed central windows, dropped far stall row to y 404–470; removed ground dot grid (713 → 237 ops); counter panel KR → `#F6DCBC` (KR was too strong on a 390×150 area); front-layer time-of-day wash was a clip rect that double-tinted transparent pixels (visible boxes round the crates) → per-shape wash (fill, tint, then ink). R2→R3: dusk sun moved down behind the roofs (it floated between the lanterns); lanterns no longer get a glow (glow bleached the CORAL). | **pass**: reads as a chợ stall at a glance (striped scalloped awning, scale, bananas, crates, price tags without words), centre calm, critter-behind-counter works like the café; Tết adds đào/mai branches, lanterns and a CORAL counter band. 237–410 ops. |
| park (`s_park`) | 23:38 | 23:46:10 | ~4.5 | 3 | R1→R2: a full-width hedge behind the bench made the bench slats unreadable → hedge only at the sides; bench armrest curls simplified; dusk sun was a dark stub peeking over the hill → raised; moon drawn after the night wash (it was greyed out) plus stars in the visible sky (kit stars sit under the header); winter dot grid removed (671 → 210 ops). R2→R3: side hedges had cut-off square edges → rounded bushes (circle blob, clipped flat at the ground); winter branch snow looked like grey mushrooms → bare branches, snow only on lamp, bench, bushes, trunk fork, plus falling flakes; far trees moved right to clear the sun; moon highlight rgba fixed for the linter. | **pass**: frontal bench, lamp, seasonal tree, hill line art, path; 4 seasons × 3 tods all render. The bench sits behind the critter in the centre band, which is busier than the café centre, but only slats show between critter edges; flag for review in a real call render. Winter flakes are near-invisible on the pale sky by day (fine at night). 168–231 ops. |
| platform (`s_platform`) | 23:38 | 23:46:10 | ~3.5 | 3 (changes in R2 only; R3 re-render confirmed) | R1→R2: city line art had full window grids behind the centre → shorter buildings, windows only on the side buildings / one row in the middle; train cyan/lilac stripe lines poked out left of the nose → lines clipped to the body and body re-stroked; front posts wash used a wide clip rect (visible darker strips beside the posts) → per-shape wash; dropped an overlapping anchor (edge-r). | **pass**: canopy + cyan fascia, BUT safety stripe with tactile dots, two side-view rails, train nose arriving at right, board and clock with no text, bench left; rain falls only beyond the edge, drips from the fascia, puddles on the floor. 274–378 ops. |

## Linter notes
- `gradients=1–4` on dusk/night/rain variants: these are `K.post` lamp glows (radial gradients), same as the existing burrow/town time-of-day pass. No gradients on stickers.
- `thin=10–15` on the anchor test renders only: the teapot reference prop placed at scale 0.6 on counter/bench slots (its 2.2 inner strokes drop below 1.6). Scenes themselves: ink 1.9–7.
- No off-palette colours in the final round.

## Anchors (teapot test)
`scenes/market-anchors.png`, `park-anchors.png`, `platform-anchors.png`: teapots sit on the counter slab, bench seats, path and platform floor; none float. Counter/bench slots are for S props (teapot shown at 0.6 to stand in for S); ground/floor slots for M (and L on the platform).

## Things in the kit that were unclear / worth fixing
1. Front layer + time of day: `K.post` washes the whole back layer, but the front layer (drawn after critters) gets nothing, so a dusk/night front looks un-tinted. A full-screen wash in the front layer would double-tint the back. I used a per-shape wash (`SW` in 40-scenes.js: fill, tint, then ink). The kit should own this (e.g. `K.S` honouring a current tint) so every scene does it the same way.
2. `K.post(…,'out')` draws its night stars at y 60–140, i.e. under the call header; outdoor scenes need their own stars lower down. The r4 version also drew a moon; the kit version does not.
3. `dots()` costs one draw call per dot (440 ops for a ground band). A single path with many arcs would be one fill; the 100–400 op budget is easy to blow with it.
4. Linter allows `rgba(255,226,154,…)` but the existing town-night moon highlight uses `rgba(255,226,140,…)`: flagged as off-palette.
5. s_place draws props after the back layer and before the front layer, which is right for counter props, but an anchor on a back-layer surface that the front layer overlaps is easy to get wrong; schema could say whether an anchor is "in front of" or "behind" the critter.
