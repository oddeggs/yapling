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
| Clocks (`useLoopClock`, `useOneShotClock`, Reanimated) | `src/native/clock.ts` |
| Curves | `@yapling/theme`: `liveCurves.travel` (added, `.77,0,.175,1`) and `liveCurves.arrive` (= `curves.rise`) |
| Cutting a critter into parts | `src/rig/parts.ts` (`critterRig`) |
| Parts as pictures, outlines as cached pixels | `src/rig/pictures.ts`, `ArtRenderer.critterRig(spec, pixelRatio)` |
| The pose (idle + act + follow-through), one worklet | `src/rig/pose.ts` (`poseAt`, `IDLE_FACE`, `IDLE_WAVES`, `FOLLOW`) |
| The acts, as rows of keys per channel | `src/rig/acts.ts` (`ACTS`: breathe, listen, think, hop, wave) |
| Drawing a pose (a worklet; Node uses the same code) | `src/rig/draw.ts` (`drawRig`, `DEPTH`, `ARM`) |
| The component | `src/native/rig-critter.tsx` (`RigCritter`, `RigCritterArt`) |
| Lab | `apps/mobile/src/app/motion-lab.tsx` (`yapling-dev://motion-lab`, also the test menu) |
| Offline frames and costs | `spikes/critter-motion/harness/` |

Coordinates: the critter's box in points (`size` × `1.2 size`); amounts in poses and acts are in
rig units (the generator's 200-wide box), scaled by `unit = size / 200`.

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

At rest the parts draw what today's critter draws (mean difference under 0.002/255 for all 11
species; a test holds Pip's three species, otter and pangolin).

### Our rules

- `CLAUDE.md`: UI-thread only (the pose and drawing are one worklet per frame), curves from the
  theme, art never redrawn: every part is the generator's own drawing, moved by transforms.
- Reduce Motion: the critter holds the rest pose, which is exactly the generator's drawing.
- Lipsync stays a picture swap (`mouth` as a shared value), as today.
- Outlines are cached as pixels at the screen's density: 24 vector silhouette copies per frame
  cost more than everything else drawn (see the spike report).
- Every act starts and ends at rest, and is at rest `SETTLE_MS` before its end (the clock holds at
  the end, and follow-through reads up to 200 ms back). Tests hold this, the loop seams and the
  follow-through delays.

### Rig limits

- **Head and body are one bean.** A head tilt rotates the face features about the eyes and
  slides them; the bean itself only leans about the feet.
- **No arms.** Paws float; the arm is virtual (`ARM`: two 28-unit segments, a shoulder found from
  the paw's rest place). The elbow shapes the paw's path and the wrist trails, but no forearm is
  seen.
- **Moods are drawings.** The rig is per mood drawing. Moods with front poses (`shy`, `think`'s
  chin, `cheeks`) cannot be rigged (paws over the face); `laugh` and `warm` have no blinking eyes;
  `surprised`, `excited` and the half-lidded moods get no live lid (the closed line still fades
  in).
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
contact sheet of every 4th, an MP4 per act). On the simulator: the motion lab. Not yet seen on a
real device.
