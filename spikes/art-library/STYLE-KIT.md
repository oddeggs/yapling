# Yapling "Sticker + Glass": art style kit for catalogue props and scenes

Derived from the generators in `design/prototype/art/` (`yap-sticker.js`, `yap-r4.js`, `yap-r5.js`, `yap-r6.js`)
as synced into `packages/art/src/generated/`. Every rule here is copied from what those files do, not invented.
An agent follows this kit, writes code (never bitmaps), and renders with `harness/render.mts`.

## 1. Medium and idiom

- Art is **code**: Canvas 2D calls (`Path2D`, `fill`, `stroke`, `roundRect`, `ellipse`, `arc`, quadratic/bezier curves),
  replayed onto Skia in the app and onto CanvasKit in Node. No bitmaps, no SVG files, no `drawImage` of external images.
- Supported by the shim: everything above plus `save/restore/translate/scale/rotate/clip`, `setLineDash`, `globalAlpha`,
  `globalCompositeOperation='lighter'`, linear/radial gradients, `fillText` (Lexend). **Not supported:** `arcTo`, `measureText`, `filter`, `shadowBlur`, images.
- Use the shared kit `A.K` (`gen/00-kit.js`): `S(ctx, path, fill, {lw, sh, ink})` is the sticker primitive
  (ink stroke + flat offset shadow), `G` the grey background line-art primitive, `L` a stroked line or curve,
  `R/El/Pg/Pd` path builders, `glint`, `steam`, `spark`, `vc(o, default)` for colour variants, `post` for time of day.
- Deterministic: no `Math.random` (use `rnd(seed)`), animation only through `o.t` (ms). Catalogue renders use `t: 0`.

## 2. Palette tokens (fills)

| Token | Hex | Use |
|---|---|---|
| INK | `#17131C` | every outline, sticker shadows, dark details. Never `#000` |
| WH | `#FFFFFF` | the default object body ("white sticker"), cups, paper |
| LIL / LIL2 | `#EFA3F4` / `#F9DAFB` | accent 1 and its tint: lamps, lids, rugs, floors |
| CY / CY2 | `#22BFF2` / `#CFF0FD` | accent 2 and tint: glass, sky, windows, screens |
| MI / MI2 | `#5FD98A` / `#D7F7E2` | plants, success; MI2 for distant greenery |
| BUT / BU | `#FFD66B` / `#FFE48A` | blooms, lamp light, sparkles, sticky notes |
| KR / KR2 / WOOD | `#F2CFA8` / `#E6BE93` / `#C99A6E` | cardboard, wood, bread crust, crates |
| PASTRY / PEACH | `#FFC27A` / `#F5B38A` | baked food, oranges |
| CORAL / APRI | `#FF8D6B` / `#FFE9C2` | the only warm red (red panda fur). Use for Tết red, chilli, tomato |
| COFFEE / BROWN | `#7A4E33` / `#8C6A4E` | coffee, soil, seeds, chocolate |
| SLATE / PLUM | `#2E2740` / `#5B4A8C` | chalkboards, dark screens, door at dusk |
| NIGHT / DUSK | `#241B38` / `#3B3160` | night skies (scenes only) |
| GR / FOG / STEAM | `#D3CCDC` / `#E8E4EE` / `#B9B0C4` | background line art, metal, steam |
| Translucent | `rgba(255,255,255,.5–.7)` highlights; `rgba(23,19,28,.05–.12)` dot grids, plank lines, ground ellipses |

Rules: a prop uses **2–4 fill colours plus INK and WH**. One accent dominates. Large areas use tints (LIL2/CY2/MI2),
saturated accents go on small parts (a lid, a lamp shade, a stripe). No other hues: if a real object is red, it is CORAL;
if it is green, it is MI; if metal, GR/FOG/WH.

## 3. Line weight and shadow (at nominal size: 1 unit = 1 pt on screen)

| Element | `lw` | sticker shadow `sh` |
|---|---|---|
| Main silhouette of a foreground prop | 2.8–3.2 | 3–4 (props), 5–8 (big panels, windows, tables) |
| Inner parts (lids, labels, windows, buttons) | 2.0–2.6 | 0 |
| Ink "rod" lines (handles, legs, stems, cords, bands) | 3–7 drawn with `L` | none |
| Background line art (`G`): walls, far shelves, far buildings | 2.5 in GR | none |
| Scene frame (burrow arch) | 4 | — |

- Shadow is the shape itself in INK offset **(0.35·sh, sh)**: down and slightly right. Never blurred, never another direction.
- Only the outermost silhouette casts a shadow; parts inside it use `sh:0`.
- Effective stroke on screen must stay between **1.6 and 7 pt** after scaling (the linter checks this).
- Round joins and caps always (`S` and `L` set them).

## 4. Shape language

- Rounded rectangles everywhere: radius 2–4 for small parts, 6–12 for bodies, `[r,r,big,big]` for cups and pots
  (flat top, round bottom), `[w/2,w/2,0,0]` for doors and arched windows.
- Ellipses for tops of round things (cup rims, tables, rugs) at a **shallow 3:1–5:1 ratio**: the only hint of a top view.
- Hand-drawn feel comes from slightly irregular bezier silhouettes (fur, leaves, bread), not from wobbly lines.
- Leaves: the house leaf `M0 0 C6 -8 18 -8 24 0 C18 6 6 6 0 0 Z` in MI, scaled and rotated.
- Steam: two grey S-curves (`steam`). Sparkle: 4-point star (`spark`), BUT/LIL/CY. Glint: small white ellipse top-left.

## 5. Perspective

- **Front elevation, flat.** Objects face the viewer; depth is shown only by (a) a shallow ellipse top, (b) the offset
  shadow, (c) overlap. No vanishing points, no 3/4 views of boxes, no foreshortened sides.
  Exception already in the house: a one-point floor or pier in scenes (`harbour`), kept to the bottom third.
- Furniture is a frontal elevation (chair = seat slab + back + legs as ink rods).

## 6. Level of detail

- Props: **6–25 draw calls**, 3–10 distinct shapes. Existing objects: mug 7 ops, stapler 6, mail 12, jar 28.
- No texture except dot grids and plank lines at ≤ 0.12 alpha. No gradients on props. No outlines inside outlines more than 2 deep.
- No text in props (it would need translating), except numbers or a logo-like single glyph if essential.
- Scenes: 100–400 draw calls; the café is 119.

## 7. Box, anchor and variants (catalogue convention)

- A prop registers `A.PROPS[id] = { size, word, variants, draw(ctx, o, t, box) }` and draws in a square box of
  **S = 60, M = 96, L = 160 units**. `s_prop(ctx, w, h, {id, v, season, tod})` scales the box to `w × h`.
- **Anchor = ground contact point** at `(box/2, ground)` with ground y = **S 56, M 90, L 150**. The object's lowest
  solid edge sits on the ground line; only its sticker shadow goes below. Centre the object horizontally.
- Fill **60–90 % of the box height** (S tabletop things may be shorter: a phone lying flat). Nothing outside the box
  except steam and sparkles.
- Size classes are about legibility, not reality: S = hand-held / tabletop (drawn at 45–75 pt), M = floor or counter
  objects (70–120 pt), L = furniture (120–200 pt). A scene places a prop with a scale 0.75–1.25.
- Colour variant `o.v` in `lilac | cyan | mint | butter | white | coral`: swap only the dominant colour pair via `vc(o, default)`.
  Seasonal/time variants (`o.season`, `o.tod`) change small details (snow cap, blossom, lit lamp), never the silhouette.

## 8. Scenes

- 390 × 844 units (the phone in points), portrait. `s_<name>(ctx, w, h, o)` with `o.tod`
  (`morning|afternoon|dusk|night|rain`), `o.season` where useful, `o.layer==='front'` for the layer drawn over characters.
- Layers, back to front: sky/wall fill → background line art in `G` (far, no shadow) → mid stickers (shadowed)
  → floor band → front layer (counter/railing, drawn after critters).
- **Composition for calls:** the top 90 pt sits under the call header, the bottom ~170 pt under the call bar, and
  the middle band (x 100–290, y 300–700) is where the critter and speech bubbles go. Put the scene's identity
  (window, stall roof, sign, train) in y 90–420 and at the sides; keep the centre calm (flat fill, light pattern).
- A floor/ground line in INK lw 3 separates wall and floor at y ≈ 410–600.
- Time of day: call `K.post(ctx, w, h, tod, lights, t, 'in'|'out')` last, with lamp positions for the warm glow.
- Each scene registers `A.SCENES[name] = { fn, front?, indoor?, lights, anchors: { name: [x, y, scale] } }`.
  Anchors are named slots on surfaces (counter, shelf, bench, ground-left…) where catalogue props stand; a story asks for
  "a prop on the counter", never coordinates.

## 9. What makes it look "off-style" (reject list)

1. Black (`#000`) or brown outlines; missing outline on a foreground shape.
2. Soft/blurred shadows, shadows in two directions, a shadow on an inner part.
3. Gradients, shading ramps, or 3D lighting on objects.
4. Off-palette hues (true red, orange, navy, olive, real wood brown on a big area).
5. Perspective boxes, isometric views, foreshortening.
6. Thin hairlines (< 1.6 pt) or a thick border on small details.
7. Fussy detail: many tiny parts, text, logos, patterns at full opacity.
8. Object floating above or sinking below its ground line; drawn off-centre or clipped by its box.
9. Sharp corners on bodies; perfectly geometric shapes where the house uses a soft bezier (food, fabric, leaves).
10. Saturated colour over large areas (a whole wall in CY instead of CY2).

## 10. Process per asset

1. Pick size class and the dominant accent. 2. Write `draw` with `S` for the silhouette first, then inner parts with `sh:0`.
3. Render at 3x with the harness, look at the PNG, read the linter line (off-palette, stroke range, outside pixels, baseline).
4. Fix and re-render. 5. Log time and number of renders.
