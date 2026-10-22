# Spike: a living rig for the critters

23 Oct 2026. Branch `spike/critter-motion`. Method evaluated: rossark-motion-skill (MIT): its engine is ported, its renderer is not. How it works and where the code is: `packages/art/MOTION.md`. Re-render frames with `harness/frames.mts`; costs with `harness/raster-cost.mts`.

## Verdict

| Question | Answer |
| --- | --- |
| Clearly more alive? | Yes. Today Pip moves as one block and blinks by swapping pictures. The rig breathes, shifts weight, sways tail and ears on their roots, glides its pupils, lowers real lids, leans in and turns toward a speaker, glances up to think, hops with a squash that keeps volume, waves with the paw on an arc and the wrist trailing. |
| 60 fps with three critters? | Yes on the simulator (Pip, Mei, Linh): 16.67 ms frames, 0 dropped of 5,728; rig UI-thread work 0.9 ms/frame for all three. Three of today's critters: 18–20 fps on the same simulator. Not measured on a phone (needs a dev build on a device). |
| Rollout to the cast | Cutting into parts is automatic for all 11 species (tested). About 2–3 days to put `RigCritter` behind `Critter` in the call and burrow screens with acts driven by call state; about half a day per species to review contact sheets and tune. Front-pose and arc-eyed moods stay as today unless the generator changes. |
| Design owner must change | Nothing is required; five optional hooks below, including a likely generator bug the rig currently relies on. |

## What was built

- **Engine** (`packages/art/src/rig/engine.ts`): track, flow, seg, wave, loop, bell, seeded, hop, keepVolume (worklets on the theme's `bezierAt`); clocks `useLoopClock` and `useOneShotClock` (`src/native/clock.ts`). MIT notice kept.
- **Curves:** arrive = `curves.rise` (within 0.023 of `0.23,1,0.32,1`); travel `0.77,0,0.175,1` had no equivalent (nearest `curves.wipe`, 0.082 off) and is added as `liveCurves.travel`.
- **Rig** (`src/rig/parts.ts`), cut by drawing again with the generator's own options (`noTail`, `look`, `blink`, `pose`, `pal.lid`, `acc`, `t`, `listen` with `tilt: 0`) and comparing. Parts: tail, feet, ears, bean, belly, face markings, clothes, stroke, paws, blush, eyes (white, pupil, ring, lid, closed line), brows, nose and whiskers, 8 mouths, top. Each has its own share of the 24-copy sticker outline. Joints come from the point two drawings share (red panda: tail (146, 200), ears (64, 82) / (136, 82), exactly the generator's numbers). At rest it matches today's pixels (mean < 0.002/255).
- **Live face:** pupils glide and lead turns. The generator's own half-lid lowers (110 / 40 / 190 ms ease-out) and hands over to its closed line in the last 10%. The cheek squint is the lid's skin turned over; the blush rises with it. Lipsync unchanged.
- **Five acts as rows of keys** (`src/rig/acts.ts`): breathe, listen (toward `side`), think, hop, wave. Idle layers never stop (24 s loop; every period divides it; per-character seeds). Follow-through by delay: ears 90 ms × 0.45, tail 120 × 0.5, head 110 × 0.45, elbow/wrist 90 × 0.45.
- **Lab:** `apps/mobile/src/app/motion-lab.tsx` (`yapling-dev://motion-lab`, and a button in the test menu in development builds).

## Measurements (iPhone 18 Pro simulator, iOS 27.0, debug build)

| Lab mode | Frame interval | Dropped | Rig work |
| --- | --- | --- | --- |
| No critters | 16.70 ms | 0.2% | — |
| Three rigs (110 pt) | 16.67 ms | 0 / 5,728 | 0.90 ms (max 2.2) |
| Three of today's critters | 50–56 ms | 66–70% | — |
| Today's Pip + rigged Pip (140 pt) | 16.8–16.9 ms | 1.3% | 0.35 ms |
| First rig version (vector outlines), 1 today + 1 rig | 35 ms | 52% | 0.32 ms |

- **CPU raster in Node (relative):** three of today's critters 78 ms/frame; three rigs with vector outlines 184; with outlines cached as pixels 6.4; without outlines 4.7. The outline (24 silhouette copies redrawn each frame) is the whole cost, so the rig caches each part's outline as an image at screen density (`ArtRenderer.critterRig(spec, pixelRatio)`). The same change would speed up today's `Critter`.
- **Recording** (once per species, mood and size, JS thread): simulator debug build, rig 57 / 51 / 150 ms (Pip / Mei / Linh) against 12–27 ms today; Node 9–15 against 4–9 ms. Record during a transition.
- **Memory:** about 1.1–1.3 MB per rigged critter at 140 pt × 3 (mostly outline pixels) against an estimated 75 KB today. App RSS on the simulator: 648 MB with no critters, 684 MB with three rigs, 845 MB with three of today's critters.
- **`poseAt`:** 0.016 ms per critter (Node); the whole worklet about 0.3 ms per critter on the simulator.

## Optional generator hooks (design owner)

1. **Lid:** `eyeDraw` reads `c.lid` (palette) while the capybara sets `lid: .24` on the species, so it is never drawn. The rig uses `pal: { lid: 1 }`. If that is fixed, add `if (o.lid != null && mode !== 'blink' && mode !== 'arc') { mode = 'half'; lid = o.lid; }`.
2. **Arms:** `o.arms` (`{ a, e }` per side) drawing two body-coloured capsules with an ink edge from shoulder to paw, so a bent forearm is seen.
3. **A lower lid:** `o.cheek` in `eyeDraw`, instead of the rig's turned-over upper lid.
4. **Lid colour on markings:** `ctx.fillStyle = c.lidc || c.b`, with `lidc` for the raccoon's mask.
5. **Tails that don't sway** (cat, otter): wrap `back()` in `rot(ctx, px, py, …)` like the red panda's, so the rig reads their exact root.

## Concerns

- The cut relies on the cast rig's drawing order. Tests cut all 11 species and compare the rest pose with today's pixels, so a breaking generator change fails CI.
- Outline pixels resample slightly when a part turns or squashes.
- A rig is per mood drawing; a mood change is still a swap.
- Running Metro generates `apps/mobile/.expo/types/router.d.ts`, after which `tsc` fails on three existing `routes.ts` files (this was already the case before the spike).
