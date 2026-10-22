# Spike: can agents build the visual library?

23 Oct 2026. Full working notes: `STYLE-KIT.md` (the style rules agents follow), `SCHEMA.md` and `catalogue/catalogue.json` (the asset catalogue), `gen/` (generators), `harness/` (renders through the app's own `ArtRenderer` in Node, plus a style linter), `logs/` (agent times and tries). Rendered sheets aren't committed; re-render with `cd packages/art && ./node_modules/.bin/tsx ../../spikes/art-library/harness/render.mts ../../spikes/art-library/specs/<name>.json`.

## Verdict

**Agents can build the library in the house style, with a human signing off art direction.**

| Asset | Made | First-pass review | After one fix pass | Agent time |
|---|---|---|---|---|
| Props | 30 by three fresh agents from the style kit only | 26/30 (87%) | 30/30 | ~1 min per prop |
| Scenes | 3 (market stall, park bench, train platform) with 20 variants | bases 3/3, variants 12/20 (oversized dusk glows, props in the wrong layer; fixed in the kit) | 20/20 | ~4 min per scene |
| Wearables | 6 items on red panda, capybara and cat, 2 moods each | 34/36 fits | 36/36 fits; 5/6 designs read right (a top reads as a sash on bean bodies) | 5–15 min per item |
| Rarity and the shelf share card | from the same code, no art per prop | — | — | — |

Wearables hook into four layers of the critter rig (torso, neck, face, head) with fit points derived from the rig; with no wearables the rig renders byte-identical, and with them the eyes and all 8 mouth shapes are identical, so blink and lipsync are untouched.

## Pipeline for ~100 scenes and ~1,000 props

- **Drawings:** colour, season and time variants add freshness, not words. 1,000 word-props need about 600–800 generators (families such as fruit, jars or tools share one generator with shape settings).
- **Agent time and cost (Opus 5.5):** props ~17 h (~3–4 h elapsed with 5 agents), $90–130; scenes ~13 h (~4 h elapsed with 4), $45–90; 60 wearables ~10 h, ~$20.
- **Human time:** prop sheet triage 5–7 h, native gloss check ~3 h, scenes ~12 h (including a check in the real call screen), wearables ~2 h.
- **Size:** as code, 1,000 props are ~1.2 MB (0.4 MB compressed) and 100 scenes ~0.7 MB; they ship in the app and arrive over the air. As PNGs they'd be ~56 MB.
- **Drawing cost:** recording a prop takes ~0.4 ms and a scene ~2.4 ms in Node; a scene with 8 props is ~130 KB cached. Record during transitions or downloads, never on first tap.

## Make quality reliable

1. A "what is this?" check: a vision model names each prop at 45 points without the word. The linter and agent self-review missed 3 of the 4 props that read as the wrong object.
2. A separate reviewer agent with the reject list before a human sees the sheets.
3. Finish the kit: a shared-shadow helper, one-path dot grids, glows ≤ 60 points only at dusk and night, controlled vocabularies for places and surfaces, a rule for hanging objects.
4. Harness checks for centring, dominant colour, and a call-screen overlay on every scene.
5. A home in the repo: `packages/art/src/library/`, loaded after the synced prototype scripts (which must stay byte-for-byte). The wear hooks need a ~6-line change in `yap-cast.js` through whoever owns design.
6. One agent per place (all its scenes); props in batches of 10 per category.

## Content notes

- The brief asked for Tết and Mid-Autumn items before the festival decision. Under decision 3 (Natterwick's own weather-and-season festivals), those props stay only as everyday words without festival windows, and the áo dài-inspired top is dropped.
- The library is shared worldwide (story-engine "Growing worldwide"): keep Vietnam-specific everyday objects as a small share of each category, alongside globally familiar ones.
- Glosses and CEFR levels are agent estimates (`reviewed: false`); check against a word list and a native speaker.
