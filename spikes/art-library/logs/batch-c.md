# Batch C: art log

Agent: batch C (10 props), file `gen/30-batch-c.js`, spec `specs/batch-c.json`, PNGs in `out/props/`.

## How the time went (wall clock)

- 23:34:11 start: read STYLE-KIT, kit, example, SCHEMA, reference renders and prototype code (about 3 min)
- 23:37:21 to 23:38:47: first draft of all 10 props written in one pass (about 1.5 min for the whole file; no per-prop split was possible because they were authored together)
- Render 1 at 23:38:47 (all 10), render 2 at 23:40:52 (all 10), render 3 at 23:41:25 (non-la, sneakers changed), render 4 at 23:41:54 (lotus, sneakers changed)
- 23:42:19 end of the art work. Then the log and catalogue were written.

**Total wall time for the batch: about 8 min of art work (23:34:11 to 23:42:19), plus about 3 min for the log and catalogue.**

Every harness run renders the whole batch. "Renders" below counts the runs up to and including the one the verdict is based on.
Start = first draft (23:37:21, the same for all 10). End = when the verdict render was looked at.

## Per prop

| prop id | start | end | min | renders | what was fixed between tries | verdict |
|---|---|---|---|---|---|---|
| cactus | 23:37:21 | 23:41:00 | 3.7 | 2 | r1→r2: lifted 2 units (baseline 0.98 → 0.94, the shadow was below the box edge); moved the glint off a spine tick (it showed as a grey blob) | **pass**: clear at 60 pt; the spring bloom (lilac 5-petal flower) reads; pot variants work |
| lotus | 23:37:21 | 23:42:00 | 4.6 | 4 | r1→r2: lift 2 (0.98 → 0.95), glint moved; r3: glint moved again (it sat on the water rim line); r4: glint moved to the bowl, still overlaps the outline at bottom left | **pass, with a known nit**: flower, bud, upright and floating pads in a blue-band bowl read as lotus. The small bowl glint sits on the ink outline and looks like a grey dot. Fix: delete the `glint(...)` line in `lotus` (not done: hit the 4-render cap). 34 ops (over the 6–25 guide) |
| monstera | 23:37:21 | 23:42:05 | 4.7 | 2 | r1→r2: lift 2 (0.98 → 0.95) | **pass**: reads as a potted houseplant with split leaves. The splits are drawn as ink wedges, because the shim has no `destination-out` to cut real holes. Leaves are a little crowded above the pot |
| watermelon | 23:37:21 | 23:41:05 | 3.7 | 2 | r1→r2: rind was mostly pale MI2 and looked thin, so I made the MI band thicker and the MI2 stripe thinner and moved the rind line; lift 2.5 (0.99 → 0.94) | **pass**: very readable wedge; the butter variant (yellow watermelon) works |
| non-la | 23:37:21 | 23:41:40 | 4.3 | 3 | r1→r2: the hat sat on its brim and read as a traffic or party cone, and the bow on the ground was tiny. Redrawn: the hat hangs, with an underside crescent (KR2) and the chin ribbon as a loop below it. r2→r3: ribbon loop made wider | **pass**: ribs, the cone and the hanging quai read as nón lá. Height-wise it is a hanging or wall object: the ribbon is the lowest edge, so on the floor it would look like it hovers. Catalogue surfaces are wall and hand only |
| sneakers | 23:37:21 | 23:42:10 | 4.8 | 4 | r1→r2: the back shoe's laces and stripe made a tangle, and only the back shoe had a shadow: added one shared shadow for both shoes and simplified the back shoe. r3: dropped the back tongue and spread the laces. r4: swapped the stripe and ink laces for a main-colour eyestay with white lace dots | **pass, borderline**: reads as a pair of sneakers at 60 pt, but where the shoes overlap in the middle is still a bit busy. Hit the cap. A single shoe would be cleaner if the word allowed it |
| t-shirt | 23:37:21 | 23:42:10 | 4.8 | 2 | r1→r2: lift 2 (0.98 → 0.95) | **pass**: classic flat tee with collar band, cuffs, heart motif, dashed hem. The butter variant has low contrast (BUT on BU) but it is still fine |
| armchair | 23:37:21 | 23:41:10 | 3.8 | 2 | r1→r2: the 3 tufting buttons read as a face (2 eyes and a nose), so I replaced them with 2 channel seams; legs lengthened so the baseline is 0.94 | **pass**: frontal elevation, one shared silhouette shadow (no part shadows another), legs as ink rods; the cyan variant works |
| plastic-stool | 23:37:21 | 23:41:15 | 3.9 | 2 | r1→r2: lift 2 (0.98 → 0.95); the glint sat on the left outline, so I moved it inside | **pass**: low flared-leg stool with an arch cut-out and a hand slot; coral, cyan and lilac all read. 11 ops |
| bookshelf | 23:37:21 | 23:42:15 | 4.9 | 1 (re-rendered 3 more times with no change) | none needed | **pass**: wood (default) and white frames; stickered spines in palette, one leaning book, a plant and a box. 57 ops, well over the 6–25 prop guide (L furniture with about 12 books) |

Linter: every render had no flags (no off-palette colours, no gradients, no thin or thick strokes, no pixels outside the box). Ink range 1.8–6.4 pt.
- Post-cap code change (no re-render): bookshelf now treats `v:'wood'` as the default wood frame (before, it fell through to white). Default output is unchanged.
