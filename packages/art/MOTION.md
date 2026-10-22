# MOTION.md: living critters in `@yapling/art`

Part 1 is the method, adapted from rossark-motion-skill (MIT; the engine's notice is in
`src/rig/engine.ts`). Part 2 is how it applies here. Where they disagree, Part 2 and the repo's
`CLAUDE.md` win.

## Part 1. The method, in short

**Goal:** a critter feels alive and calm. Nothing teleports, nothing bounces, nothing shouts.

1. **Never teleport.** Interpolate everything; never swap drawings (lipsync mouths are the one
   accepted swap, see Part 2).
2. **Calm by default.** Strong curves, no bouncy overshoot. Small amplitudes; when unsure, halve.
3. **Arcs and pivots.** Every moving part turns about its own joint.
4. **Overlap and follow-through by delay, not springs.** A child reads its parent 60–150 ms
   earlier at 0.3–0.6 strength: `child += k × (parent(t − d) − parent(t))`. The head rights itself
   a beat after the body leans: `head −= 0.45 × lean(t − 110)`.
5. **Never a frozen frame.** While on screen, every channel carries a small idle layer, even in a
   held pose. Left and right never mirror.
6. **Layer every channel:** key pose (`flow`) + idle (`wave`s) + follow-through + accents (a
   `wave` inside a `seg` window).
7. **Live face.** Pupils glide (they lead a head turn); lids close in ~110 ms, hold ~40 ms and
   reopen in ~190 ms ease-out; blink on a turn; the cheek rises into a happy squint.
8. **2.5D turns.** Slide what sticks out most the most (nose ~13 % of the head's width, eyes and
   mouth ~10 %), the outline stays, parts at the back (ears, tail) slide the other way.
9. **Weight.** A hop is crouch → stretch → a gravity parabola → a hard squash on contact that keeps
   the volume (`width = 1 / height^0.6`) → one small overshoot → settle. The floor shadow stays on
   the floor and shrinks with the height. Arms fly up just before contact.
10. **Reduced motion.** Loops freeze on a good frame 0; one-shots show their final frame.
11. **Opacity only to appear or disappear** (the closed-eye line takes over at the end of a
    blink).

**Engine.** One loop clock for idle life and one one-shot clock per act, per character. Keyframes
`[ms, value, 'out'?]` read with `track` (one move, stops at each key) or `[ms, value]` with
`flow` (acting: passes through poses, never overshoots). Helpers: `wave` (−1…1), `loop` (0…1),
`bell`, `seg` (one beat of an act), `seeded(i)`, `hop`, `keepVolume`. Curves: travel ease-in-out,
arrive ease-out, endless loops linear.

**Workflow.** Pick one main action and two or three idle loops; split the art at its pivots
without changing frame 0; put every number in one table; check frame 0, the end of each act and
the loop seam; look at a contact sheet of every 4th frame; hand off what has not been seen on a
real device.

## Part 2. Yapling

### Where the code is

| What | Where |
| --- | --- |
| Engine (`track`, `flow`, `wave`, `loop`, `bell`, `seg`, `seeded`, `hop`, `keepVolume`) | `src/rig/engine.ts` |
| Curves | `@yapling/theme`: `liveCurves.travel` (`.77,0,.175,1`) and `liveCurves.arrive` (= `curves.rise`) |
| Cutting a critter into parts | `src/rig/parts.ts` (`critterRig`) |
| Parts as pictures, outlines as cached pixels | `src/rig/pictures.ts`, `ArtRenderer.critterRig(spec, pixelRatio)` |
| The pose (idle + act + follow-through + talking bob), one worklet | `src/rig/pose.ts` (`poseAt`, `IDLE_FACE`, `IDLE_WAVES`, `FOLLOW`, `TALK`) |
| The acts, as rows of keys per channel | `src/rig/acts.ts` (`ACTS`: idle, listen, think, hop, wave) |
| Switching acts without a jump; held acts | `src/rig/live.ts` (`startAct`, `livePose`, `actTime`, `FADE_MS`) |
| Which moods the rig moves; raised paws | `src/rig/support.ts` (`RIG_MOODS`, `usesRig`, `raisedPaws`) |
| Per-species amounts | `src/rig/tuning.ts` (`TUNING`, `tuneOf`) |
| Drawing a pose (a worklet; Node uses the same code) | `src/rig/draw.ts` (`drawRig`, `DEPTH`, `ARM`) |
| The component every screen uses | `src/native/critter.tsx` (`Critter`, `CritterArt`); the rig half in `src/native/rig-art.tsx` |
| Recording off the first frame; pinning what is drawn | `src/native/schedule.ts`, `src/native/pictures.ts`, `LruCache.pin` |
| Lab | `apps/mobile/src/app/motion-lab.tsx` (`yapling-dev://motion-lab`, also the test menu) |
| Contact sheets | `pnpm --filter @yapling/art rig:sheets <out> [mood] [species…]` (`src/node/contact-sheets.ts`) |

Coordinates: the critter's box in points (`size` × `1.2 size`); amounts in poses and acts are in
rig units (the generator's 200-wide box at the species' size), scaled by `RigPictures.unit`.

### `Critter`

`<Critter>` takes what it always took (`character`, `species`, `mood`, `mouth`, `size`,
`animated`, `style`) and, optionally:

- `act`: `'idle'` (the default: breathing, weight, tail and ears, blinks and glances), `'listen'`,
  `'think'`, `'hop'`, `'wave'`. `listen` and `think` loop a hold window for as long as they are
  asked for; `hop` and `wave` play once and settle back into the idle.
- `play`: a number; changing it plays the act again (another hop).
- `lookAt`: `'left' | 'right'`, the side of the screen the one it attends to is on (default
  `'right'`). Listening leans and looks that way; thinking glances the other way.
- `rig={false}` draws today's critter (the lab's measure).

Asking for another act, side or replay never jumps: the difference between the pose on screen and
the new act's first pose is added to the new act and fades out over `FADE_MS` (520 ms, travel
curve), so the new act moves from its first frame while the old pose melts into it. A critter that
appears starts at rest (the generator's drawing) and its idle fades in the same way.

In the moods the rig cannot move (`laugh`, `warm`: arcs of joy; `shy`, `think`: paws held to the
face) `Critter` draws today's critter, with its idle and its picture-swap blink, and ignores `act`.
A drawing the rig cannot cut (a generator change) falls back the same way, with a warning.

Moods that hold a paw up (`wave`, `confused`'s scratch, `excited`'s two paws) keep that paw where
the mood drew it: the act's arm keys leave it, only the idle sway, the hop's follow-through and an
act's accents (the wave) move it.

While the mouth is not at rest (lipsync) a soft talking bob (`TALK`: 1.2° tilt over 1.6 s, 0.8 %
squash over 0.8 s) eases in over 160 ms, as today's critter switched to its talking idle.

### Driving acts from a call (for the call screen)

Exports: `Critter`, `CritterAct`, and the props above. The mapping the call screen should use:

| Call state | `act` | Notes |
| --- | --- | --- |
| Learner speaking (mic open, voice detected) | `listen` | `lookAt` toward the screen's middle from where the critter stands (a critter on the right half looks left) |
| Waiting for the reply (learner done, reply not yet playing) | `think` | Replaces the stage's own head tilt (`TILT_DEG` rotation of the critter's view) |
| Character's line playing | `idle` | Lipsync already drives `mouth`; the talking bob comes with it |
| A turn passed (`Bỏ qua` or a good answer, as the director marks it) | `hop`, `play` + 1 | Then back to whatever the state says; the fade handles any overlap |
| Greeting at the call's start, goodbye at its end | `wave`, `play` + 1 | Once per greeting |
| Reduce Motion | anything | Holds the rest pose; nothing to do |

Other critters on the stage (not the speaker) stay `idle`, or `listen` toward the speaker.

### How the rig is cut (no art redrawn, no generator changed)

The generator records a flat list of self-contained operations. `critterRig` draws the critter a
few more times with options the synced generator already has and compares:

| Part | Found by |
| --- | --- |
| Tail | `noTail` (the operations it leaves out, compared by shape and place) |
| Feet | the two operations after the tail (checked: 30 × 13 rounded rects) |
| Ears (pair) | everything between the feet and the bean |
| Bean, markings, outline stroke | the fill and stroke with the same outline; what is clipped to it; belly first, clothes from `acc: false` |
| Paws (pair) | `pose: 'belly'` |
| Eyes, closed line | `blink` |
| Pupils | `look: 4` (the operations that move) |
| Lids | `pal.lid = 1`: the generator's own half-lid, fully down |
| Mouths | the 8 visemes, as `critterParts` |
| Brows, nose and whiskers, what sits on top | drawing order after the eyes and the mouth |
| Joints | the point two drawings share: the tail's sway (`t`), the ears' perk (`listen` with `tilt: 0`) |
| Outline and hard shadow | each part's share of the generator's 24 silhouette copies |

The rig keeps the mood's own tilt (a listening head on one side): it reads it from the turn between
the upright drawing and the mood's, and records every comparison at it. It also reads the species'
size from the feet's transform (a tarsier is drawn at 0.64) and scales all motion by it, so a small
critter leans, slides and reaches as far for its size as a big one. At rest the parts draw what
today's critter draws, for all 11 species in every mood the rig moves (a test compares them as
the screen draws both, outlines as pixels: mean under 0.05/255, every 32-px tile under 1/255).

### Our rules

- `CLAUDE.md`: UI-thread only (the pose and drawing are one worklet per frame), curves from the
  theme, art never redrawn: every part is the generator's own drawing, moved by transforms.
- Reduce Motion (Reanimated's reading, and `animated={false}`): the critter holds the rest pose,
  which is exactly the generator's drawing.
- Lipsync stays a picture swap (`mouth` as a shared value), as today.
- Outlines are cached as pixels at the screen's density: 24 vector silhouette copies per frame
  cost more than everything else drawn (see the spike report). Today's critter does the same
  while it moves (`ArtRenderer.critter(spec, pixelRatio)`, an image drawn on whole pixels gives the
  outline's own pixels: the goldens draw it that way, and a test compares it with the vector
  outline in every species and mood, mean under 0.01/255); a still one keeps the vector outline.
- Recording never runs while a screen mounts. A critter whose rig is not cached draws today's
  picture at rest (the rig's rest pose) and its rig is recorded after the first frame, one rig per
  task (`afterFirstFrame`), so it happens while the screen's transition plays on the UI thread and
  a screen of critters never blocks touches for long. A mood change keeps the old rig until the new
  one is ready.
- Memory: a rig is about 1.1–1.3 MB at 140 pt × 3 (mostly outline pixels), today's critter with its
  outline cached about 1 MB. The picture cache (48 MB) pins what is on screen: pinned entries are
  never evicted (a remount finds them), eviction goes to the oldest unused one, and an evicted
  entry that was drawn is disposed at once (its native pictures and images freed, not left to the
  garbage collector). A memory warning drops everything not on screen.
- Every act starts and ends at rest, and is at rest `SETTLE_MS` before its end (the clock holds at
  the end, and follow-through reads up to 200 ms back). Tests hold this, the loop seams and the
  follow-through delays.

### Per-species tuning

From each species' contact sheets (every act, happy and the raised-paw moods), in `TUNING`:

| Species | Change | Why |
| --- | --- | --- |
| Bison | ears 0.3, hop 0.75, squash 0.8 | Its "ears" are horns: they barely perk or sway. Heavy: a lower hop and a firmer landing. |
| Bulldog | hop 0.85, squash 0.85 | Stocky: a lower hop and a firmer landing. |
| Koala | ears 0.7 | Big round ears swing wide arcs at the acts' amounts. |
| Tarsier | yaw 0.8 | Its eyes nearly fill the face: a smaller turn keeps them inside the outline. |
| All | motion × species size | A tarsier (0.64) used to slide its eyes past its outline and reach far over its head. |

Red panda, capybara, cat, otter, pangolin, raccoon and tiger read well as written. Cat and otter
tails (no sway in the generator) turn about their bounds and stay attached through the hop.

### Rig limits

- **Head and body are one bean.** A head tilt rotates the face features about the eyes and
  slides them; the bean itself only leans about the feet.
- **No arms.** Paws float; the arm is virtual (`ARM`: two 28-unit segments, a shoulder found from
  the paw's rest place). The elbow shapes the paw's path and the wrist trails, but no forearm is
  seen.
- **Moods are drawings.** The rig is per mood drawing; a mood change is a swap. Moods with front
  poses (`shy`'s cheeks, `think`'s chin) cannot be rigged (paws over the face; the cut refuses
  them); `laugh` and `warm` have no blinking eyes; `surprised`, `excited` and the half-lidded moods
  (`proud`, `sleepy`, `patient`) get no live lid (the closed line still fades in).
- **A raised wave on a wide critter** (koala, bulldog, bison) sits over the side of the head, as
  the generator's own `wave` pose does.
- **The lid is the body colour** (`c.b`), also where an eye sits on a marking (the raccoon's mask).
- **The cheek** is the lid's skin turned over: the generator has no lower lid.
- **Tails that do not sway** in the generator (cat, otter) get a joint from their bounds, not from
  the generator.
- **Outline pixels** are resampled when a part turns or squashes: very slightly softer than the
  vector outline in motion.

### How changes are checked

`pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm test` from the root (the art goldens
need `node tools/design/src/render.ts --only art` first). Rig tests: `pnpm --filter @yapling/art
test src/rig`. Visual check: `spikes/critter-motion/harness/frames.mts` (every frame at 60 fps, a
contact sheet of every 4th, an MP4 per act). Contact sheets: `rig:sheets` (above). On the simulator: the motion lab (`compare`,
`three-rig`, `three-today`, `cast`, `burrow`). Not yet seen on a real device.
