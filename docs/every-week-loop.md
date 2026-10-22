# Yapling: every day, every week

_v0.1 · 23 Oct 2026 · the plan for what a learner does after week 1 · Release 1.2 in `plans/261022-0200-yapling-releases/plan.md` · inputs: `journey-and-story.md` §1.3–1.4 and §2.4, `season-1-script.md` (Episodes 2–6), `concept.md` §7, §9–11 and §13, `story-engine.md` (the founder's principle), `beginner-path.md` §7, and the code on `main` at `d5a18f9`._

The founder's brief: "implement and build once we had a working version that would be able to learn and educate with the users, every days, every weeks."

## The short version

- **Today the app stops teaching after day 8.** Week 1 is a full week. From day 8 a learner gets one draft episode call a week and nothing else: no story, no postcard, no voicemail, no real-week or practice call, no knock. The ring can't fill again, so there are no more week keepsakes, and a Visitor is never offered the Newcomer card again.
- **The fix is the week we already have, five more times.** Each week: one hand-written, recorded episode (Season One E2–E6, each with a Visitor version), one real-week call and one practice call to fill the ring, a recorded Pip story, a postcard and the cliffhanger voicemail. Then a festival week to close the season.
- **One new piece, for the days without a call: Pip's minute.** About a minute, two turns, built from recorded lines and say-this cards, judged by their words: no model, no generated voice, no live minutes. Pip sets up a moment where one of the learner's phrases fits, or says it slightly wrong for the learner to fix. It's what moves phrases from sprout to leaf on different days, as the lifecycle needs.
- **Everything fits the engine's shapes.** Weeks are built from each episode's `week` slots (the same `WeekSlot[]` a Release 3 week pack carries), ring slots carry their scene ids, and Pip's minute is a `Scene` built from a phrase and two lines. When the engine arrives it fills the same slots; nothing here is thrown away.
- **About 160 new recorded lines, about 10,000 characters, about 25,000 ElevenLabs credits** with a full retake, Dex's voice design and Hank's stage takes. Almost all of it ships over the air; a new TestFlight build carries it anyway (step 4 of the autonomous run).

---

## 1. What a learner meets after week 1 today

The burrow's day plan (`apps/mobile/src/features/burrow/day-plan.ts`) is written day by day up to day 7. From day 8 every day gets the same branch (`if (day >= 8)`): a "next episode" card and a button to the oldest open call of the current week.

### 1.1 A Newcomer, day by day

| Story day | What they see | What's wrong |
|---|---|---|
| 8 (week 2, day 1) | The "back" screen once: Pip's day-8 line and a peek at Episode 2 (`scenes.ts` `backModel`). The last knock of the plan (`WEEK_ONE_PLAN` in `packages/domain/src/day-clock.ts` ends at day 8). The button starts the Episode 2 call | Episode 2 is an outline (`draft: true` in `packages/story/src/season-1/episodes-2-3.ts`): its intents are first drafts and none of its turns has a hint, so "phrase hints after a pause" never comes |
| 9 | The same "Episode N next" card as day 8 (its id, `next-episode-N`, doesn't change) | `concept.md` §7.1: never the same top card two days running. Episode 2's story and Sol's postcard are in the data (`week: day 2`) but nothing opens them |
| 10–11 | The week view shows the real-week and practice rows as open, titled from the episode's notes ("Bring your homework: paste your CV…") | Neither has a scene, so the rows can't be tapped (`features/week/model.ts`: `target` is null without a scene). The ring stays at 1 of 3 |
| 12–14 | The same card. Nothing new | Episode 2's voicemail (`week: day 5`) is unreachable. No knocks. Phrases only grow inside calls, and with one call a week a phrase used on Monday waits a week to become a leaf |
| 15, 22, 29, 36 | Episodes 3–6 open one a week | Same as above each week. Pip's stories for Episodes 2–6 are `gen` beats, and the listening screen plays only recorded and `ui` beats (`features/story/plan.ts` `listenPlan`), so even if one were opened it would be empty |
| 37 on | Season map finished; the burrow card says the season is over | Nothing to do, and nothing that says what comes next |

Other things a Newcomer hits:

- **The week view follows the calendar, not the story.** It shows week N's episode (`episodeOf(ring.week)`), while the season map shows the first unfinished one. A learner who misses week 3 sees Episode 4 on the week view on day 22 while the season map says Episode 3. Playing Episode 4 then fills week 3's episode slot (`fillRingSlot` fills the oldest open slot of a kind), and the season map marks Episode 3 done.
- **The season map's "opens on" day counts from the install day** (`season-model.ts`: `addDays(installedOn, …)`), while weeks count from the story's start: wrong by Settling in's 3–6 days for a Visitor.
- **Live minutes.** From day 8 the free plan has 10 minutes a week (`FREE_WEEKLY_SECONDS` in `packages/domain/src/ledger.ts`); week 1's three calls took about 4, 3 and 4 minutes. A full ring of three calls doesn't fit.
- **No stage-up after week 1.** Linh's Newcomer card is offered when a ring fills (`features/payoff/stage-up-model.ts`). Rings 2–6 can't fill, so a Visitor who said "Ở lại thêm" is never asked again (only the Me sheet's "Thử nhanh hơn" remains).

### 1.2 A Visitor, day by day

Everything above, plus:

| Week | What they play | What's wrong |
|---|---|---|
| 2 · Help Wanted | "Tell me about yourself", strengths with an example, confirming details | No Visitor beats: open questions with no say-this card (no `choices`, no `hint`), judged by the model. Sol's recorded lines run 12–18 words at Newcomer speed (`s1-e2-04`: "And you came with Pip! Do you mind if I ask you the same question? Good practice for both of us.") against the Visitor's 8-word, 0.7× rule |
| 3 · Cheaper Beans | Say no to Hank, offer an alternative, hold it | `journey-and-story.md` §2.4 already writes the Visitor row ("Ten percent off. Okay?", two cards). It isn't in the data; Hank has only the Newcomer and Local takes |
| 5 · The Petition | Three timed pitches | 90/60/45 seconds at Visitor (`episodes-4-6.ts`, `stop-1..3` have no Visitor time). Week 1's Visitor Pass it on is 30/25/20 |
| 6 · The Town Meeting | A 60-second speech, a question from the floor | No cards; the Visitor's first speech is a blank 60 seconds |

The script promises "a Visitor plays them at Newcomer with 'slower' on" (`season-1-script.md`, "Later episodes"); in practice the stage stays Visitor, so generated lines are slow and short but recorded lines, open turns and timers are Newcomer's.

### 1.3 What's missing, by kind

| Kind | Missing |
|---|---|
| **Content** | Episodes 2–6 written in full (beats are outlines); a Visitor version of each hard turn; hints for Newcomer turns; real-week and practice scenes for weeks 2–6 (none exist); Pip's stories for weeks 2–6 as recorded lines; postcards for weeks 3, 4 and 6; Hank's opener at the other stage speeds; anything for the days between calls; a season close |
| **Recorded** | The 35 lines of Episodes 2–6 are recorded (`audio/season-1/lines.json`, all 134 lines have audio). Everything in the row above that is [REC] is not. Dex has no voice (`audio/cast-voices.json`; the call borrows Sol's, `apps/api/src/call/voices.ts`) |
| **Learning model** | A day plan for weeks 2 on (only week 1 has one); the rule that keeps the story week and the calendar week apart; ring slots tied to their scenes; knocks after day 8; the Visitor's card offered at every ring; a choice of phrase for a short daily turn |
| **Screens** | The burrow's days for weeks 2–7; tappable real-week and practice rows; the listening screen for weeks 2–7; a week's wrap; bloom and fix-graduation moments (designed: Learning board L6, L9); the season's end; places for the Inn and the Square (both fall back to "Pip on a call", `features/call/scene-layout.ts`) |
| **Server** | A call kind for short daily practice that costs no live minutes and runs no model or summary; Pip's slightly-wrong reuse kept in progress (`pipReusedAt` isn't in the progress body, `packages/domain/src/phrases.ts`); memory in calls: the post-call job writes memory items (`apps/api/src/jobs/post-call.ts`) but nothing in `apps/api/src/call/` reads them, so a real-week call can't use the learner's job or last week's news |

What already works and needs no new code: the scene runner and director play any scene; card turns are judged by their words at any stage (`apps/api/src/call/card-turn.ts`); due phrases go into every call's prompt (`apps/api/src/call/learner.ts`); bloom and fix graduation are in the learning model; recaps for Episodes 1–6 are recorded and picked by `recapFor`.

---

## 2. The loop to build now

### 2.1 The week (weeks 2–6)

Days count from the story's start, as week 1 does: week 2 is story days 8–14. Ring slots open on days 1, 3 and 4 of the week (`LATER_WEEK_SLOT_OPENS`); between-call content arrives on the episode's `week` slots.

| Day of the week | The day's thing | Kind | Live minutes |
|---|---|---|---|
| 1 | **The new episode** (the cliffhanger from last week's voicemail pays off) | Episode call, ring slot 1 | about 5 |
| 2 | **Pip's story** (about 40 s, seeded with one of this week's phrases) and, in weeks 2, 3, 4 and 6, a **postcard** | Recorded, tap a line for its gloss (it becomes a seed) | 0 |
| 3 | **The real-week call**: this week's skill, about the learner's own life | Live call, ring slot 2 | about 4 |
| 4 | **The practice call**: Teach the yapling, Pass it on or the accent warm-up | Live call, ring slot 3 | about 4 |
| 5 | **The cliffhanger voicemail** (already recorded) | Recorded | 0 |
| 6 | **Pip's minute** with phrases from earlier weeks | Daily, cards | 0 |
| 7 | **The week's wrap**: the ring's keepsake if it's full, the phrases that grew this week, a can-do ticked, the next episode's day | Payoff | 0 |

Every day also offers **Pip's minute** when a phrase is due (a small chip on the burrow, never the top card two days running, never a badge). Calls that were missed stay open; the button offers the oldest one after the day's thing. Nothing expires.

### 2.2 What each week asks, by stage

Newcomer is the script as written, finished in full and with a hint on every turn. Visitor follows `beginner-path.md` §7: cards from the start (two choices, Vietnamese under each), the character models the answer first, character lines at most 8 words at 0.7×, a Vietnamese task card when a new kind of turn starts, no timers longer than week 1's. Neighbour and up keep each episode's stage scaling.

| Week · episode | Visitor | Newcomer | Neighbour and up |
|---|---|---|---|
| 2 · Help Wanted | Pip asks one card question ("What's your job?"); Sol: "Tell me about you." → cards "I'm {name}. I'm a …" / "I work at …"; "What are you good at?" → two "I'm good at …" cards; Sol's details as one line → card "Mornings. Okay!" | Ask Pip an interview question and fix its mistake; "Tell me about yourself"; strengths with an example; "Just to confirm…" | Regular: a weakness, a problem solved. Local: a hypothetical, Sol digs in |
| 3 · Cheaper Beans | Hank's Visitor take "Ten percent off. Okay?" → "Sorry, no." / "I'm sorry, we can't do that."; Pip whispers → "How about a free cake?" / "How about tea?"; "Deal!" Mei and Pip carry the rest (`journey-and-story.md` §2.4) | Say no politely with one phrase and offer an alternative | Neighbour: reasons and a confirmed deal. Regular: negotiate. Local: interruptions. Voice: de-escalate |
| 4 · The Plan | "Hello, everyone!" opens the meeting; ask two neighbours "What do you think?" (card); react "Good idea!" / "I like it!"; Nell sums up for them | Ask for ideas, agree and add, disagree gently, move a long talker on, sum up | Regular: mediate two neighbours. Local: a time limit and an interruption |
| 5 · The Petition | One card line per stop ("Please sign. It's for Mei's café."), Bea models it first; 20/20/15 s; every passenger signs | 90/60/45 s pitches with "Here's the thing" and "It matters because…" | 75/50/40, 60/45/30; Local: an objection at every stop; Voice: a sceptic |
| 6 · The Town Meeting | A three-line speech built line by line, then once together (as week 1's day 4): "Hello, everyone." / "I love Mei's café." / "Please say yes. Thank you!"; Hank's question → "It's our café." / "Mei is our friend."; "Thank you all!" | 60 s speech with "First,… Second,…"; answer Hank; thank the town | 75 s and two questions; 90 s and an objection; a rival speaker |

Real-week and practice calls, all weeks (mostly [GEN] beats with a recorded opener and close, like week 1's):

| Week | Real-week call | Practice call |
|---|---|---|
| 2 | Pip: "Tell me about yourself, for real": the learner's own job or study (Pip remembers week 1's), with "I'm good at… For example,…". No paste: Bring your homework stays in Release 2 | Teach the yapling: *deadline*, *team*, *shift* from the Hollowbrook poster |
| 3 | Dex: a real "no" the learner needs to say this week; Dex plays the other side | Pass it on at the café: why the café matters, 90/60/45 s |
| 4 | Dex: one point the learner wants to make in a real meeting | Teach the yapling: *petition*, *signature* |
| 5 | Dex: the learner's own 60-second self-pitch | Pass it on on Bus 45: the café pitch, building up for the episode |
| 6 | Pip: "How did it go?" on something the learner said earlier in the season (from memory), or a last rehearsal | Accent warm-up: the six neighbours' good-luck postcards from this week, each answered with one phrase |

At Visitor the real-week call is three card turns about the learner (name and job, one thing they like, one thing they're good at), and the practice call is Visitor Pass it on (30/25/20 s, English frame cards) or Teach the yapling with two picture-word cards.

### 2.3 Every day: Pip's minute

The one new piece. It answers "what do I do on a day with no new call?" with something short and worth doing.

- **What it is:** about a minute in the call frame, in the burrow, with Pip. Two turns. Turn one: Pip sets up a small moment where a due phrase fits ("Mei looks sad again. What do I ask her?") and the learner says it. Turn two, when one fits (`pickPipReuse`): Pip says one of the learner's phrases slightly wrong ("Can I helping?") and the learner fixes it. Then Pip writes it in its notebook (`phrase_grows`).
- **Which phrases:** the learning model's `duePhrases` (spacing 1, 3, 7 days), longest overdue first, from any week, Settling in's included. A seed sprouts, a sprout becomes a leaf on a new day. Pip's minute is prompted, so it never makes a bloom: blooms come from using a phrase unprompted in a live call, as the lifecycle says.
- **How it's built:** recorded lines and say-this cards passed by their words (the Visitor's card turns, `card-turn.ts`), at every stage. At Visitor the card shows at once; at Newcomer after the stage's pause; at Regular and up it's a gloss on tap. No model, no generated voice, no summary job: the phrase use comes from the turn log. It costs speech-to-text only (about a quarter of a live minute's cost) and **no live minutes**.
- **What it needs per phrase:** one set-up line and one slightly-wrong line, recorded once. 30 phrases (Season One's 24 and Settling in's 6) make about 55 lines; phrases with no natural wrong version skip turn two.
- **Never a chore:** offered as a chip ("Một phút với Pip"), not the day's top card unless nothing else is new; no count of minutes missed; it simply isn't there when nothing is due.

### 2.4 The festival week (week 7) and after

`journey-and-story.md` §2.3: a one-week festival interlude between seasons, no new story pressure.

- **Week 7:** Pip's season story (recorded: the whole season told back, with the learner's name), Mei's thank-you postcard, the season keepsake (the Lantern Café sign), the **then-and-now card** (below), and the boat in the harbour. The ring's three slots take any call of their kind: replay any episode at today's stage, any real-week or practice call.
- **Weeks 8 on, until the engine (Release 3):** the same: rings filled by replays (a real-week call is always new, because it's about this week), Pip's minute every day a phrase is due. The season map lets the learner replay any episode. Release 3's evergreen shelf and town weeks take over these weeks with no change to the shapes.

### 2.5 Payoffs across the weeks

| Cadence | Payoff | Built from |
|---|---|---|
| Every call | The after-call card: two wins, one fix, seeds and sprouts; at Visitor, "Bạn đã nói được: …" with the learner's own sentences | Exists; extended to Episodes 2–6 and Pip's minute (a small card: the phrase and its new state) |
| Every few days | A phrase becomes a leaf; a phrase **blooms** with a sparkle (designed: L6); a fix **graduates**: "Pip stopped asking about your -ed!" (L9) | Rules exist in `packages/domain`; the moments are new screens |
| Weekly | The episode resolves; the ring fills and its keepsake hangs on the wall; the week's wrap; the lifetime ring count | Ring and keepsake exist; the wrap is new |
| Weekly, Visitor | Linh offers the Newcomer card at every full ring until it's taken | `earnsNewcomerCard` over that week's turns; works once rings fill |
| Per episode | Two can-dos ticked as keepsakes, signed by the neighbour who saw it | Exists (`SEASON_1_CAN_DOS`) |
| Week 5 and season end | **Then and now:** Flow and Pace from week 1's Pass it on next to week 5's petition ("48 seconds without stopping. In week 1 it was 20.") | Call records already carry the fluency numbers; Episode 5 is the same task as week 1's practice by design |
| Season end | The season keepsake, the residency card stamped "Season One", the boat | New, from existing art |

Visitors don't tick Newcomer can-dos from card turns; their progress is their own sentences, their phrases, their rings and the Newcomer card.

### 2.6 Knocks

From the same weekly plan, under the rules in `concept.md` §11: at most one a day, quiet hours, always an event or a favour, never guilt. Three a week: the new episode (day 1), Pip's story (day 2), the voicemail (day 5), from the character. They're planned 14 days ahead on each open, so a learner who stays away two weeks simply stops hearing from us; when they come back Pip tells the recap and everything is where it was. No knock for Pip's minute.

### 2.7 Live minutes

Three ring calls take about 12 minutes; the free plan gives 10 a week after week 1. Pip's minute costs none. **Founder decision:** raise the free weekly allowance to 15 minutes for Release 1.2 (TestFlight), and set the store value in Release 2 from measured cost (lane S1h). Plus is unchanged.

---

## 3. What is content, code, server, and how it ships

### 3.1 Content (written by us, the agent drafts and a person edits every line)

| Piece | Where | Recorded lines | About characters |
|---|---|---|---|
| Episodes 2–6 in full; edits to the 35 recorded lines | `season-1-script.md` → `packages/story` | ~10 re-takes | 700 |
| Visitor model lines, Episodes 2–6 (≤ 8 words, 0.7×) | same | ~20 | 600 |
| Hank's opener: Visitor, Neighbour and Regular takes (Newcomer and Local exist) | same | 3 | 170 |
| Real-week calls, weeks 2–6: a recorded opener and close each | same | 10 | 800 |
| Practice calls, weeks 2–5: opener and close (week 6 reuses the postcards) | same | 8 | 600 |
| Pip's stories, weeks 2–6 (about 40 s each) | same | 5 stories, ~30 lines | 2,700 |
| Postcards: week 3 (Linh), week 4 (Nell's hello), week 6 (six good-luck notes) | same | 8 | 800 |
| Pip's minute: a set-up and a slightly-wrong line per phrase, plus open and close lines | same | ~63 | 3,000 |
| Festival week: Pip's season story, Mei's postcard, the week-7 voicemail | same | ~6 | 800 |
| **Total** | | **about 160** | **about 10,200** |

Eleven v4 bills about one credit per character. With a full retake of every line, Dex's voice design and a three-take audition, and Hank's takes: **about 25,000 credits**. Check `yap_voice.py credits` first; if the cycle is short, record Pip's stories and Pip's minute first (days 2, 5, 6 and 7 run on them) and let the rest speak with the live voice until recorded.

Two cast choices for the founder: **Dex gets his designed voice now** (he runs the real-week calls in weeks 3–5; today he borrows Sol's), and **Arjun stays off-mic until he moves in** (Release 3): in week 4 Nell passes on his idea ("Arjun says: a market day!"), so no one speaks with a borrowed accent.

Vietnamese for native review: about 300 strings (glosses of the new lines, Visitor cards and task cards, burrow cards for weeks 2–7, knocks, the week's wrap, Pip's minute).

No new art: the café, office, Bus 45, square, town and street scenes and every cast member exist in `@yapling/art`. The Inn borrows the town until its set comes with the library (Release 2's long-lead lane).

### 3.2 Code, by package

| Where | What |
|---|---|
| `packages/contracts` | A `daily` call kind (no live minutes, never a ring slot); `pipReusedAt` on a phrase's progress |
| `packages/story` | Episodes 2–6 final, with Visitor beats and hints; real-week and practice scenes for weeks 2–6; Pip's stories as recorded beats; postcards; each episode's `week` slots for days 1–7; a `daily` scene kind and the Pip's-minute builder (`phrase + set-up line + wrong line → Scene`); the festival week; checks that every week has its three ring scenes, every listening scene is recorded, and every Visitor line is 8 words or fewer |
| `packages/domain` | The story-week plan for weeks 2 on, read from the episode's `week` slots; the story week (the week of the next unfinished episode, never ahead of the calendar) and ring slots tied to their scenes (a slot with no scene of its own takes any call of its kind, oldest first); Pip's-minute phrase choice; knocks for later weeks; the Visitor's card at every ring; `daily` unmetered; the free allowance; the level guide (pulled from Release 2) |
| `apps/api` | Daily calls: unmetered, card-judged, no summary model, phrase uses from the turn log as prompted uses; Pip's reuse recorded; memory items read into the call prompt; Dex's own voice; the ring rule through the domain; a dev Worker deploy |
| `apps/mobile/src/data` | Moments seen by scene id (week 1's names map onto them); `useWeek` returns the story week and any slots still waiting from earlier weeks; whether Pip's minute has a phrase today |
| `features/burrow`, `features/week` | The days of weeks 2–7; the Pip's-minute chip; week rows from their slot's scene, all three tappable; the "still waiting" row |
| `features/story`, `features/season` | Stories, postcards and voicemails for weeks 2–7; the season map's dates from the story's start; replays; the festival week |
| `features/payoff`, `features/me` | After-call for Episodes 2–6 and Pip's minute; bloom and graduation moments; the week's wrap; then and now; Linh's card every ring; the season keepsake; can-dos across the season on the Me sheet |
| `features/knocks`, `features/devmenu` | Later-week knocks; the test menu's week jumps |
| `features/call` | Places for the Inn and the Square; Pip's-minute layout; episode tags for 2–6; Dex on the real-week call |
| `tools/voice`, `audio/` | Dex's voice, Hank's takes, the renders, the pace gate on Visitor lines, the speech-to-text check |

### 3.3 How it ships

| Change | Ships by |
|---|---|
| Story data, domain, screens, copy | EAS Update on channel `dev` (JS) |
| About 160 new recorded lines (about 15 minutes of audio, 10–15 MB) | Bundled through `@yapling/story` in the update. Release 2's content cache (S1g) later serves Episodes 2–6 from R2 with the same line ids, so nothing is redone |
| Call server, progress | Dev Worker deploy. No migration is expected (progress lists are JSON); range `0330–0349` is reserved |
| A new build | None needed by this release. It rides the new TestFlight build the autonomous run makes anyway (hands-free may touch native code) |

---

## 4. Why nothing here is redone when the engine arrives

| This release | What Release 3 does with it |
|---|---|
| Weeks built from each episode's `week: WeekSlot[]` | A week pack carries the same `week` (`story-engine.md` Appendix B); the day plan reads a pack the way it reads an episode |
| Ring slots tied to their `sceneId` | The engine sets the scene ids of a town week's three calls |
| Pip's minute as a `Scene` built from a phrase and two lines | The phrase bank and the personal pass add phrases with their own lines; the builder doesn't change |
| Real-week calls as `gen` beats about the learner's life and memory | The personal pass writes them per learner in the same format |
| The level guide checking every hand-written line | The same check runs on every pack (`checkPack`) |
| Knocks from the week's slots | Town weeks get knocks with no new code |
| Recorded lines bundled by id | The content cache serves them, and pack lines, from R2 by the same ids |

The loop stays the founder's simple one: a story each week, three calls that fill a ring, and one short thing every day. The recorded cast and the art carry the story; the live calls bring the learner's own life in; the level guide, the cards and the code checks keep it on track.

---

## 5. Decisions for the founder

| # | Decision | Recommended |
|---|---|---|
| 1 | Free live minutes after week 1 (three ring calls take about 12) | 15 a week for Release 1.2; Pip's minute free; set the store value in Release 2 from cost data |
| 2 | About 25,000 ElevenLabs credits for about 160 lines, Dex's voice and Hank's takes | Yes; stories and Pip's minute first if credits are short |
| 3 | Dex's designed voice now (real-week calls in weeks 3–5) | Yes, with native-speaker review before the store as for every accent |
| 4 | Arjun stays off-mic until his move-in; Nell passes on his idea in week 4 | Yes |
| 5 | A small festival week 7, then replays and Pip's minute until the engine | Yes |
| 6 | A six-week diary study with 6 testers (3 Visitors, 3 Newcomers) after the build | Yes (Release 1.2, wave D3) |
