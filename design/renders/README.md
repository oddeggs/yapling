# Design renders

PNG references rendered from the design export in `design/prototype/` by `tools/design`
(`@yapling/design-tools`). Compare a built screen with these before calling it done. Regenerate
them whenever `design/prototype/` changes; never edit them by hand.

## Run

Needs Node 24 or later and Google Chrome (`/Applications/Google Chrome.app`, or set `CHROME_PATH`).
No dependencies.

```sh
node tools/design/src/render.ts                      # everything, about 4 minutes
node tools/design/src/render.ts --check              # everything twice, fails unless byte-identical
node tools/design/src/render.ts --only week1/d2-call,boards/r4-home,art/mei-
```

From the workspace: `pnpm --filter @yapling/design-tools render` (or `render:check`).

- `--only` takes comma-separated path prefixes under `design/renders/`: a group (`week1`, `hub`,
  `boards`, `art`), a board (`boards/r5-learning`), or the start of a file name (`week1/d8-`,
  `art/pip-cat-`). A partial run updates the manifests in place; a full run replaces the four group
  folders.
- `--check` renders a second time into a temporary folder and compares every PNG by SHA-256
  (`--keep` keeps that folder).
- `--offline` serves outside requests (Google Fonts, the React and Babel scripts the design runtime
  loads from unpkg) from the cache in `tools/design/.cache/net` only. They are fetched once and
  replayed byte for byte.
- `--concurrency <n>` pages in parallel (default 4), `--scale <n>` screen scale (default 3),
  `--out <dir>` another output folder.

## What is rendered

Screens are the phone screen only: 390 × 844 CSS px at 3x (1170 × 2532), without the device
corners or bezel. The status bar, Dynamic Island and home indicator the design draws inside the
screen are kept.

| Folder | What | Count |
|---|---|---|
| `week1/<id>.png` | Every step of `Yapling Week 1.dc.html` (`?step=<id>`): the 26 steps of the map, `end` included, plus the map's four extra states (`err-net`, `err-mic`, `err-catch`, `safety`). Vietnamese chrome | 30 |
| `week1/<id>.en.png` | The same steps with English chrome (the prototype's VI/EN switch) | 30 |
| `week1/d8-lock.away*.png`, `week1/d8-back.away*.png` | Day 8 with "came back after three days" on, VI and EN | 4 |
| `hub/<id>.png` | Every screen of `Yapling Prototype.dc.html` (its `ORDER`), opened directly with no transition and no auto-ring | 15 |
| `boards/<board>/<frame>.png` | Every frame with a `data-screen-label` on `boards/*.dc.html`, as its phone screen (the caption above the phone is left out). Frames labelled without an id (`Placement`, `Me sheet`) take the id from their caption (`l1-placement`). The Brand board has no labelled frames | 58 |
| `art/<character>-<mood>-<mouth>.png` | Each cast member × mood × mouth (see below) | 1232 |
| `art/face-<character>-<mood>.png` | Each cast member's face in every mood, on the default lilac | 154 |
| `art/scene-<name>.png` | The scenes: burrow (and each time of day, day 1, the first burrow), café (warm, front layer), Bus 45 (and its front layer), town (and each time of day), lock-screen backdrop (`scene-lock`, the town at 430 × 884), office (front layer, crisp), night, harbour, street, party square, confetti, festival boat | 29 |
| `art/obj-<family>-<stage>.png` | Burrow objects: jar, desk, plant, mail at stages 0 to 2, each desk kind, the seed packet | 28 |

Total: 1580 PNGs.

`manifest.json` lists every screen: the source file, the query, the state set before settling,
the target, the size and scale, the virtual time it ran, and the SHA-256 of the PNG.

### Art states

`art/manifest.json` records, for each art PNG, the exact generator call, for the art port's
golden tests: a transparent canvas of `canvas.width × canvas.height` px,
`ctx.setTransform(...transform)`, then `YapArt[fn](ctx, w, h, o)`, with the generators of
`design/prototype/art/` loaded in order (`yap-art`, `yap-cast`, `yap-sticker`, `yap-r4`, `yap-r5`,
`yap-r6`). Art is drawn at 2x, the resolution the prototype itself paints its art canvases at.

- Characters: Pip as red panda, capybara and cat (`pip-redpanda`, `pip-capybara`, `pip-cat`),
  then Linh (pangolin), Mei (otter), Sol (tarsier), Hank (raccoon), Nell (koala), Bea (bulldog),
  Dex (bison) and Arjun (tiger).
- Critters use the sticker critter the screens draw (`s_critter`), 200 × 240 CSS px plus a 16 px
  margin, at rest (`t: 0`, eyes open).
- Moods: the 14 moods of the cast rig (`YapArt.MOODS`).
- Mouths: `rest` (the mood's own mouth) and the seven talking visemes `A E O U M F L` from the
  prototype's `mouthFor`. A talking mouth replaces the mood's mouth.

## How the renders stay byte-stable

- Each page gets its own browser context. A script injected before any page script puts the page
  on a virtual clock: timers, intervals, animation frames, `performance.now()` and `Date` all read
  virtual time, which only moves when the renderer advances it. The page loads completely (runtime,
  scripts, every font face) with the clock at zero, then runs a fixed amount of virtual time.
- A Week 1 step with a script runs until it waits for the learner (or the script ends). A hub chat
  runs until the learner's turn. Other screens run 1.5 s. The clock then moves on until no critter is
  mid-blink.
- Voices are off: media never plays, speech synthesis and recognition are absent, and the voice
  engine plays every line in its silent timed mode. Chrome runs with `--mute-audio`.
- `Math.random` is seeded. The `<helmet>` scripts the runtime injects execute in written order.
- No CSS animation runs in real time: every one starts paused. At capture, finite animations are
  held at their end and infinite ones at the start of their first cycle. Their values are then
  written into each element's style and all animations removed, the screen's layers are rebuilt,
  and the compositor runs a few real frames before capture. Without that, a layer rasterised during
  a scale-from-zero pop could keep a stale raster scale and drift by a few edge pixels between runs.
- Art canvases are repainted once the web fonts have loaded.
- Chrome runs headless with software raster on one thread, an sRGB profile and every compositor
  stage before each frame. Each capture repeats until one image has come out three times.
- PNGs are re-deflated losslessly at zlib level 9 (pixels unchanged), about a fifth smaller.

Renders depend on this Mac's Chrome version (recorded in the manifests) and its system fonts
(SF Pro Rounded for `ui-rounded`). Compare renders made with the same Chrome.
