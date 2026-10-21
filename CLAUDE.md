# Yapling: agent contract

Binding for every coding agent working on Yapling (`oddeggs/yapling`, branch `main`).

## Read before coding

1. Your lane in [plans/261022-0200-yapling-releases/plan.md](plans/261022-0200-yapling-releases/plan.md): its owns list, screens and done-when.
2. [docs/tech-decisions.md](docs/tech-decisions.md). For learning behaviour: [docs/journey-and-story.md](docs/journey-and-story.md) §1. For story and characters: [docs/season-1-script.md](docs/season-1-script.md) and [docs/cast-bible.md](docs/cast-bible.md). For product rules: [docs/concept.md](docs/concept.md) §10–14.
3. [docs/design-review.md](docs/design-review.md): fixes that override the visuals.
4. The design for your screens: `design/prototype/Yapling Week 1.dc.html` (steps by id, `?step=<id>`), `design/prototype/Yapling Prototype.dc.html` and `design/prototype/boards/*.dc.html`, the index in `design/README.md`, and `design/renders/<id>.png` once the render tool exists.

Precedence: docs > design-review > design visuals > prototype logic.

## The product rules that never bend

- **Nothing dies, no guilt.** No streak loss, no sad or sick critter for absence, no "you'll lose…" copy, no guilt notifications. Missed weeks wait.
- **Never sell care.** Pip's wellbeing, food or affection are never purchasable. Plus sells live minutes and depth only.
- **Always AI.** Every character shows the AI tag and never claims to be human. No romance, no exclusivity; characters encourage real-world conversation.
- **The learner talks most.** Character turns stay under ~25 words at the learner's stage speed.
- **Accents are voices, not jokes.** No phonetic spelling or broken grammar in character lines.

## The bar

- **Native feel and joy.** UI-thread animation only (Reanimated worklets, Gesture Handler). Curves come from `@yapling/theme` motion tokens. No JS-thread `Animated`.
- **Art is never redrawn by hand.** Every critter, scene and sticker comes from `@yapling/art`. Draw once into a cached picture, move it with transforms.
- **Pixel- and colour-exact.** Compare with `design/renders/` before calling UI done.
- **Real behaviour only.** No fake timers, scripted answers or stubbed servers left in features. (The prototype fakes speech; we don't.) The learner-test time-travel menu is dev-only.
- **Voice is the product.** Respect the latency budget and the turn-taking rules in `tech-decisions.md` §3. Never cut a learner off mid-word.

## How to work

- **Owns list.** Change only the files your lane owns. If you need a change elsewhere, stop and report `NEEDS_CONTEXT` with the exact change.
- **Contracts are frozen** for everyone but their owner lane. Code against them; don't fork types.
- **Tests where they protect behaviour:** the learning model, the scene runner, the call protocol, metering and the minute ledger, auth, purchases, deletion, art goldens. No UI snapshot tests. Run only the files you changed: `pnpm --filter @yapling/<pkg> test <file>`.
- **No ids in code.** No plan, wave, lane or screen ids in code, comments, test names or commit subjects.
- **Undesigned states** are built from existing components and logged in `docs/undesigned-states.md` (screen, state, reason).
- **Copy is never hard-coded.** Chrome comes from `@yapling/i18n` (vi + en), one catalogue file per feature. English learning lines come from `@yapling/story`.

## Repo conventions

- Packages are `@yapling/<dir>`, ESM, export TypeScript source. Versions live in the `catalog:` of `pnpm-workspace.yaml`.
- TypeScript strict (`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `verbatimModuleSyntax`). Named exports except route files and configs. Files ≤ 600 lines.
- Relative imports are extensionless (Metro).
- D1 migrations: one file each, `apps/api/migrations/NNNN_<what>.sql`, in your lane's number range.
- Run `pnpm exec prettier --write` on what you changed.

## Tools

Agents run autonomously and may use any suitable tool without asking: chrome-devtools MCP (the design files, web pages), computer use (Xcode and Device Hub, the simulator app), the Expo MCP (simulators, screenshots), Cloudflare and Wrangler skills, and any installed skill that fits. Use them to check your own work: screenshot the screen, compare it with `design/renders/`, fix, repeat.

## This Mac

- Native work is checked on the local iOS simulator (see `tech-decisions.md` §6). `apps/mobile/ios` is generated and ignored.
- Workers run locally with `wrangler dev`. Only lanes whose done-when says so deploy, and only to the dev Worker.
- Kill only process ids you started. Never `pkill -f` or `killall`. Never `git stash`.
- Temp files go in the session scratchpad, never the repo.

## Secrets

Only `.env.example` and `.dev.vars.example` are committed. Never print a secret value; list names only. Local values: `apps/api/.dev.vars` (ignored). Sources the founder approved for reuse: `~/oddeggs/6pm/.env` (`ANTHROPIC_API_KEY`), `~/Downloads/certs/elevenlabs.env` (`ELEVENLABS_API_KEY`).

## Commits

Each lane works on its own branch (`feat/<area>-<behaviour>`) in its own worktree; conventional commits; one commit per task; no AI references or attribution lines (no `Co-Authored-By`, no session links).

## Status

End every pass with:

```
Status: DONE | DONE_WITH_CONCERNS | BLOCKED | NEEDS_CONTEXT
Summary: one or two sentences
Evidence: tests run, screenshots compared; what was not checked
Concerns/Blockers: optional
```
