# Stories, not moments

Written 25 Oct 2026, after the founder's phone tests. This replaces the one-moment-at-a-time director in `first-build.md` §"The loop" (steps 5–6).

## What was wrong

From the founder's transcripts on the dev server:

- **No purpose.** Each moment was planned on its own, so it was a vignette with a hook and nothing at stake. Neighbours interviewed the learner ("Milk or no milk?", "Orange cat or coffee cup?", "After work: rest or cook?") instead of something happening.
- **"X or Y?" everywhere.** The planner was told to open with two choices whenever the level was unsure, which was always early on. A B1 speaker got Visitor questions.
- **No continuity.** Plans were slow (40–80 s) and sometimes stuck, so the app kept falling back to the same two templates. Pip's "How was your day?" played five times in one evening, and a menu visit asked "Just passing, or looking for me?" in every place.
- **No way in.** One moment was at the café; the next opened at the phone booth with no reason to be there.
- **Endings that just stop:** "Rest is good. Thank you! Come by again!"
- **The name** came from speech recognition ("John" for Khanh).

## What it is now

### Arriving

Before the first conversation the learner steps off the 45 at the bus stop and answers seven short questions, one per page, in English with their own language beneath: their name (typed, so it is never misheard), why English right now (up to three), what they do (plus a few words of their own), what they love (up to six), when English gets hard (up to three), how much English they speak (five levels in plain words), and one last page with the AI disclosure and the 18+ confirmation. That last page resolves the open 18+ question. `PUT /api/me/arrival`, stored as `learners.arrival`.

The level they pick sets the starting stage. The conversations correct it once the judge is sure (`stageFor`).

### The first conversation

Pip already knows the learner's name. Pip is nervous: it has to meet the whole town and doesn't know how to introduce itself. The learner introduces themselves as a model, says what they do, fixes Pip's "I am live here", and the two of them head out. It is a real can-do (introducing yourself), and it hands straight into the first story.

### A story

The director (Opus) writes an outline: a title, the kind of story, a logline, why it is this learner's story, its emotional core, Pip's own small arc, how the speaking tasks climb, the central neighbour, five scenes (four for a Visitor), one or two plants with their payoffs, the twist, the finale and an epilogue. It also notes what every neighbour is up to meanwhile, so a visit from the menu is part of the same world. The shape is fixed: the problem lands, a first try, the turn, the hard conversation, the payoff. The hard conversation and the payoff rehearse the situation the learner said is hard for them. Craft rules are in `apps/api/src/director/craft.ts`.

### A scene

Each scene is planned in full from the outline and from what really happened. A neighbour wants something now; the learner does something with English that the story needs (explain, persuade, ask, apologise, plan, negotiate). Something turns in the middle, and the end is a consequence that leads on. Questions are real ones. Two choices only at Visitor level or as a rescue.

### The way in

Every scene has a caption ("After dark, at the noodle stall"), the story and chapter ("Sixty Buns For Natterwick · 2 of 4"), and a line Pip says while walking there with the learner, so they always know why they are going. After three hours away, Pip says a recap instead. On the phone the new place fades in under the caption, Pip speaks as a voice beside the learner (Pip isn't painted there), and the painting's title appears as the neighbour opens.

### Never waiting

- When a scene starts, the next one is planned, so it is ready when this one ends (`ensureAhead`).
- When the scene ends, the judge reads it. At the same time Sonnet rewrites the next scene's way in (caption, Pip's line, recap, situation, opening) from what was really said (`followOn`). If the next scene finishes planning after that, it follows on as soon as it's written.
- After a story's last scene, the next story is written the same way.
- One plan at a time per learner (a unique index), and stuck plans are failed after 4 minutes.
- Only hard problems (a closed place, a broken schema) send a plan back for repair. Long lines are logged and played.
- If a ready scene's neighbour has gone home, another painted variant of the same place is tried before planning again.

### Unique, and growing

- Each story has a kind (mystery, mix-up, rescue, competition, big day, secret, journey, mentoring, rivals to friends, new arrival, repair, discovery, celebration). A new story may not repeat the kinds of the last three, the central neighbour of the last two, or echo an earlier title. Code checks this and sends the story back once.
- The director sees the whole journey (every earlier story's kind, centre, logline, what it grew, its finale and epilogue) and where the learner is in it. Early stories stay near home and make them welcome. By the third, neighbours come to them for advice. By the eighth they lead and welcome newcomers. Every story asks for one kind of conversation they haven't done yet.

### Pip at home

While nothing is ready, Pip has small stories of its own (a postcard home, rehearsing a phone call, a recipe card nobody can read, a dream about an upside-down bus, a list of good things), each with a reason to talk and an ending. They rotate and never ask "How was your day?".

## Checking it

`apps/api/scripts/sim-story.mts <persona> [scenes] [stories]` plays a story in text with a simulated learner (Khanh B1 designer, Lan A1 nurse, Ana B2 accountant) through the real planner, actor, judge and follow-on, and prints everything.

## Still to do

- 20 characters and 100 places for the first release (design in `docs/rewrite/world-expansion.md`), then the paintings and voices.
- The planner chooses only from the 12 painted places. Stories will reach further once more are painted.
