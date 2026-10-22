# Batch A log (10 props, gen/10-batch-a.js)

- Read kit, example, schema, reference renders and code: 23:33:42 to 23:37:36 (about 4 min).
- All 10 props were drafted together in one file (23:37:36 to about 23:38:45), then rendered together with the harness
  (each run renders every prop in specs/batch-a.json, plus a contact sheet at about 2.5x and one at about 45 pt / 75 pt).
  So start times are shared, and the minutes per prop overlap. "Renders" counts the runs in which that prop's code was new or changed.
- Full-spec runs: R1 23:38:50, R2 23:40:23, R3 23:41:09, R4 23:41:37, R5 23:42:06 (rice-cooker only), R6 23:42:25.
- Lint on the final run: no offPalette, no gradients, no thin or thick strokes, outsidePx 0 for every prop. Baselines S 0.93 to 0.97, M 0.95.

| prop id | start | end | min | renders | what changed between tries | verdict |
|---|---|---|---|---|---|---|
| pho-bowl | 23:37:36 | 23:41:50 | 4.2 | 4 | R1: chopsticks lay right across the rim and hid everything; you couldn't see noodles. R2: chopsticks angled out to the right, noodle mound added: still no noodles visible. R3: noodle strands hanging from the chopsticks, but the low chopsticks covered them. R4: chopsticks lifted so the strands show between the sticks and the broth; noodle lines up from 2.0 to 2.2 pt (the 45 pt check had flagged thin). | pass: noodles lifted by chopsticks over a banded bowl, with steam, reads as noodle soup at 45 pt. 30 ops, a little over the kit's 6–25. |
| banh-mi | 23:37:36 | 23:41:20 | 3.7 | 3 | R1: short and round, it read as a hamburger. R2: made longer with pointed ends and tilted -0.2, a third herb added: now reads as a baguette, but it floated (baseline 0.91). R3: moved down 2.4 (baseline 0.95). | pass: pointed baguette with herbs, pork and coral chilli slices. Height 0.59 (a flat tabletop thing, which the kit allows). |
| iced-coffee | 23:37:36 | 23:39:35 | 2.0 | 1 | none | pass: phin on top, ice, coffee over condensed milk in a clear glass. Recognisable. |
| bubble-tea | 23:37:36 | 23:39:35 | 2.0 | 1 | none (variants milk/mint/lilac checked) | pass: dome lid, wide straw and pearls read at 45 pt. Variant swaps straw (main) and tea (tint). |
| rice-cooker | 23:37:36 | 23:42:30 | 4.9 | 4 | R2: flower print rebuilt from 10 shapes to fewer (ops 46 to 34). R5: lid-handle stems removed, the petals of both flowers merged into one path (ops 28). R6: nudged down 1.5 so the shadow sits under the ground line (baseline 0.93 to 0.95). | pass: domed lid, band, handle, switch panel with a light, flower print. 28 ops, about the same as the existing jar. |
| kettle | 23:37:36 | 23:42:30 | 4.9 | 2 | R6: nudged down 1.5 (baseline 0.93 to 0.95). | pass: tapered jug on its base with a water window, spout and handle. The white variant reads too. |
| chopsticks | 23:37:36 | 23:41:20 | 3.7 | 3 | R1: the white rest with a heavy shadow read as a blob. R2: rest in tint with a 2 pt shadow; it now looked like a loaf. R3: rest made a small rounded block with a groove, tips together on the rest, thick ends spread. | pass, weakest of the batch: you can tell it's chopsticks at 45 pt, but it's only 0.39 of the box high (a lying object). The rest reads as "a small block", not obviously a chopstick rest. |
| banh-chung | 23:37:36 | 23:39:35 | 2.0 | 1 | none | pass: green square with leaf folds, bamboo strings in a # and a bow. |
| li-xi | 23:37:36 | 23:39:35 | 2.0 | 1 | none | pass: coral envelope, open flap, gold border and medallion, mint note peeking out. No text. |
| mooncake | 23:37:36 | 23:39:35 | 2.0 | 1 | none | pass: fluted drum with a pressed top on a plate, and a cut slice showing the yolk. Height 0.56 (tabletop). |

Total wall time: 23:33:42 to 23:43:26, about 10 min (4 min reading, about 6 min drafting, rendering, fixing, catalogue and log).
Renders: 6 harness runs in total (5 full runs and 1 extra run of the full spec looking only at rice-cooker), 21 prop tries.
