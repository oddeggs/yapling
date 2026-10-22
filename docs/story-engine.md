# Yapling: the story engine

_v0.1 · 22 Oct 2026 · design for Releases 3 and 4 · founder's direction of 22 Oct 2026: hybrid, simple, a level guide and a backbone prompt, an agent that preps each learner's stories from their level, life and light real-world references, a safety filter, and ~100 scenes with ~1,000 props · inputs: `concept.md`, `journey-and-story.md`, `cast-bible.md`, `season-1-script.md`, `beginner-path.md`, `tech-decisions.md`, `packages/story` (types, validate, runner, persona), `packages/domain`, `apps/api/src/call/director.ts`, `packages/art`. Build plan: Releases 2–4 in `plans/261022-0200-yapling-releases/plan.md`._

## The founder's principle

> "Keep the core engine loop simple and smart, design assets for visual storytelling, AI brings in the good stuff, our job is to keep it on the right track, always be creative and relevant." (22 Oct 2026)

Every piece below answers to this:

- **A simple loop.** One weekly write, one check, one personal pass, played by the runner we already have. A piece that doesn't make stories better or safer doesn't go in.
- **Assets are made for storytelling.** Each scene and prop exists to set a mood, carry a word or land a payoff. The library is a set of stages and props, not decoration.
- **The AI brings the good stuff.** Surprise, wit, references to the real week, callbacks to what the learner said. The backbone prompt asks for it and doesn't script it.
- **Our job is the track.** The level guide, the town canon, the safety filter and the code checks are the rails. If a check rejects a good story, we fix the check rather than flatten the story.
- **Creative and relevant, every week.** The weekly review asks two questions first: would a learner smile, and does this touch their real life?

## The short version

- **Bones by hand, flesh by the engine, voice live as today.** We write the world, the cast, the tone, the levels and every season's big episodes. An agent writes the ordinary weeks in between. Code checks every scene before a learner sees it, and the scene runner we already have plays it. Calls still use Haiku live.
- **One town week for everyone, then a small personal pass.** Once a week a strong model writes "this week in Natterwick" for each of the six stages, using the calendar and a few light news items turned into Natterwick versions. Each learner then gets a cheap personal pass on top: their name, their phrases, their real week, their burrow.
- **Six pieces:** the level guide, the backbone prompt, the prep agent, the safety filter, the visual library, and voices.
- **Cost: about $0.10–0.12 per learner per month**, against an AI budget of $0.55–0.60 per paying learner. Writing a whole week for each learner separately would cost $1.60–2.70.
- **The library also feeds an album, rarity and share cards** (Release 3), and later a **cosmetic shop** (Release 4). What you learn is earned; what you wear can be bought. The shop needs one explicit amendment to the "never sell care" rule.
- **Season One stays hand-written** and launches the App Store release. The engine goes live in Release 3, about when the first learners finish Season One.

## How a week reaches a learner

```
Wed night   town week     strong model + web search → one "town week" per stage
            checks        code checks + safety filter; fails → one repair, then the evergreen shelf
Thu         review        founder skims the six packs on a review page (first 8 weeks)
Thu night   voices        shared lines recorded once with the cast voices (Eleven v4)
Mon         publish       the week goes live for every learner at that stage
learner's   personal      cheap model adds their name, phrases, real week and burrow props
week start                checks again, then the scene runner plays it as today
in calls    live          Haiku fills the `gen` beats, as today
```

---

## The pieces

### (a) The level guide

The level guide is data in `packages/domain`: one record per stage. The agent reads its row, and code uses the same row to check the result. It extends the speech settings we already have (`SPEECH_SETTINGS`, the cast bible's stage table) and doesn't change them. The vocabulary bands come from an open-licence frequency list (NGSL 1.2 and its spoken list), plus Natterwick's names and the season's phrases. The CEFR-tagged English Vocabulary Profile would be better, but its licence doesn't let us bundle it.

**Visitor** (A0–A1)

| | |
|---|---|
| Understands | hello, names, yes/no questions, numbers, prices, times, one-thing orders, "again" and "slowly" |
| Says | one to four words, read from a card: hello, name, yes/no, please and thank you, a number, one order, where they're from |
| Vocabulary | about the 300 most common words, plus numbers and the week's 1–2 phrases; every word outside that is glossed |
| Grammar | _be_ in the present, _I'm…_, _Can I…?_, _please_, imperatives; no past tense |
| Character lines | one sentence, 8 words at most; the character says their own answer first, then asks |
| Learner turn | a card read aloud; any try with the right word passes |
| Speech | ~85 wpm, TTS 0.7, 0.5 s breaks, recorded lines at 100 wpm or slower |
| Tasks that fit | read one of two cards, yes/no, repeat after a model, say a number, order one thing |
| Never | open questions without cards, idioms, corrections, timers |

**Newcomer** (A2)

| | |
|---|---|
| Understands | short, clear requests and stories about everyday things, at slow speed |
| Says | a phrase or one sentence: introduce yourself, order and change an order, ask for help, say what you did |
| Vocabulary | the 1,000 most common words; the week's 3–5 chunks |
| Grammar | present simple, past simple (regular and common irregular), _going to_, _can_, wh- questions |
| Character lines | 12 words a sentence at most, two sentences at most, one idea each |
| Learner turn | 3–10 words, or Pass it on at 90/60/45 s |
| Speech | ~110 wpm, TTS 0.8, 0.35 s breaks; hint offered after a long quiet |
| Tasks that fit | answer with one phrase, ask one question, teach Pip a word, a polite no, Pass it on |
| Never | idioms, interruptions, two questions in one turn |

**Neighbour** (A2+ / B1)

| | |
|---|---|
| Understands | normal-pace small talk, simple instructions, a 40-second voicemail |
| Says | 1–3 sentences: keep small talk going, describe a problem, give a 1-minute update |
| Vocabulary | the 2,000 most common words; 4–5 chunks a week |
| Grammar | present perfect (simple), past continuous, comparatives, _will_, _should_, first conditional |
| Character lines | 15 words a sentence at most, 25 a turn |
| Learner turn | up to a minute |
| Speech | ~130 wpm, TTS 0.9, 0.2 s breaks; rare idioms, explained |
| Tasks that fit | two minutes of small talk, a complaint, follow and confirm instructions, a standup update, a listening checkpoint |
| Never | interruptions, unexplained idioms |

**Regular** (B1 / B1+)

| | |
|---|---|
| Understands | normal-pace talk with some idioms, a structured interview, a short radio item |
| Says | an opinion with two reasons, a story with a point, "Tell me about yourself" in 90 s |
| Vocabulary | the 3,000 most common words plus work words; 5 chunks a week |
| Grammar | present perfect continuous, second conditional, simple passive, reported speech, _might/must_ for guessing |
| Character lines | 20 words a sentence at most, 25 a turn |
| Learner turn | 30–90 s |
| Speech | ~150 wpm, TTS 1.0; hints only when asked; gentle, rare interruptions |
| Tasks that fit | give an opinion with reasons, tell a story, walk someone through a process, push back on a deadline once |
| Never | piling on idioms (two at most in a scene) |

**Local** (B2)

| | |
|---|---|
| Understands | fast speech, overlapping talk, interruptions, regional words from context |
| Says | disagree politely, negotiate, present for 3 minutes, summarise a deal |
| Vocabulary | the 5,000 most common words; 5–6 chunks a week |
| Grammar | third and mixed conditionals, a range of passives and modals, hedging, discourse markers |
| Character lines | natural sentences, 25 words a turn at most |
| Learner turn | up to 3 minutes |
| Speech | ~165 wpm, TTS 1.0–1.1; interruptions allowed, then the character yields |
| Tasks that fit | negotiate, handle an interruption, present and take questions, hold your ground kindly |
| Never | an interruption the learner can't win back |

**Voice of Natterwick** (B2+ / C1)

| | |
|---|---|
| Understands | everyone, at natural speed, mixed accents |
| Says | persuade a group, run a meeting, explain something complex simply, give feedback |
| Vocabulary | open; 6 chunks a week, chosen for nuance |
| Grammar | open |
| Character lines | natural, 25 words a turn at most |
| Learner turn | open |
| Speech | 170+ wpm, TTS 1.1–1.2; Hard mode by default |
| Tasks that fit | persuade, de-escalate, chair a town discussion, host a radio segment |
| Never | anything that makes the learner the student again |

### (b) The backbone prompt

The backbone prompt is one fixed system prompt that every prep run starts with. It sets the tone, the emotional core, how payoffs and twists work, the rules for running threads, and what never happens. It's the same text every week, so it caches. The weekly inputs go after it. A full first draft is in **Appendix A**.

- **The emotional core:** _in Natterwick your voice makes a difference._ Every week, someone needs the learner's help. Something small changes because they spoke. Pip learns something from them. Being understood is enough, and nobody needs to sound native.
- **Tone:** cosy, warm, gently funny, low stakes. Problems are small and real: a lost scarf, a full inn, a misread sign. Every problem is solved by talking.
- **Payoffs** come from a named list (Appendix A). Every week ends on one the learner can see or hear, such as a sign in town that uses their phrase, Pip saying their words, or a new object in the burrow. Code logs which payoff each week used.
- **Twists** also come from a named list: a mix-up over a word, a gruff character's soft side, a wrong guess, a small mystery, the helper needing help, a favour that comes back, a plan that goes sideways kindly, a surprise guest. Code refuses a payoff or twist that was used in the last four weeks.
- **Threads:** a town week is complete in itself, and at most one light running thread (a rumour, a mystery) is ever open. Every rumour pays off within three weeks. A missed thread never blocks anything. Big arcs belong only to the hand-written seasons.
- **Never:** everything in the product rules (`CLAUDE.md`) and the story rules (`journey-and-story.md` §2.1). Nobody dies, gets hurt or is humiliated. No romance, guilt, politics, religion, tragedy or crime. No real people, brands or teams. No phonetic accents.

### (c) The story prep agent

Keep it boring: this is a code-driven workflow with one model call at each step, not an open-ended agent. It makes three kinds of run.

| Run | When | Model | Tools | Output |
|---|---|---|---|---|
| **Town week** | weekly, Wed 22:00 ICT, for the next calendar week | Claude Opus 5.5 (`claude-opus-5-5`), effort high | web search (server tool, 15 searches at most), `find_assets`, `canon_facts` | the week's town story: what happens, the thread, the references used, canon changes |
| **Stage pass** ×6 | right after the town week | Claude Sonnet 5.5 (`claude-sonnet-5-5`), effort medium, Batch API | `find_assets` | for each stage: the week's episode-style town call, Pip's story, postcards, a voicemail, a recap, as `Scene`s plus line text and Vietnamese glosses |
| **Personal pass** | when each learner's week starts; within seconds after "Bring your homework" or a calendar event | Claude Haiku 5.5 (`claude-haiku-5-5`), effort low, Batch API at week start | `find_assets` | the real-week call and the practice call for that learner, one personal line in Pip's story, the "how did it go?" check-in, and the props for their burrow |

**Inputs**

- Every run: the backbone prompt, the cast bible's persona sections, the town canon (hand-made facts: who lives where, who knows whom, what's open), and the town state (what happened in recent weeks, the open thread, the payoffs and twists used lately).
- Stage pass: that stage's level-guide row, a hand-written gold scene at that stage (Season One and Settling in for Visitor and Newcomer; one new gold scene each for Neighbour to Voice), the phrase bank for the stage, and the places and cast unlocked at that stage.
- Personal pass: the learner's stage, phrases due, two error targets, memory items they've kept (job, goals, upcoming events, interests), their homework or calendar event if they shared one, what they did last week, and the props they've already met.
- References, from the town week only: the calendar (season, weather pattern, the learner-facing date) and a few light news items found by web search (sport results, weather, product launches, film releases). Every item is screened (d), then turned into a Natterwick version. A cup final becomes the Harbour Cup, and a new phone becomes the town's new "Shellphone". No real name ever gets through. The personal pass never searches the web, and no learner data ever goes into a search query.

**Output:** a **week pack**: `Scene`s in the existing format (rec, gen, learner and ui beats with guaranteed exits), the line text with captions, glosses and "What does that mean?" answers, new phrases from the phrase bank, the week slots (which day each scene arrives), and the visuals (set and props) for each scene. Model output is constrained to the pack's JSON schema with structured outputs, then parsed with zod. Appendix B has the shape and the small code changes it needs.

**Checks, all in code, before anything reaches a learner**

1. **Shape:** the pack parses, and every scene passes `validateScene` (every beat reachable, forward only, every answer has a fallback, the cast matches, phrases and can-dos are known).
2. **Level:** every character line is within the stage's sentence and turn limits. Words outside the stage's band stay under the stage's share (0 at Visitor, apart from glossed new words and names). Visitor beats have cards and model the answer first. The expected answer lengths fit the stage.
3. **Targets:** each due phrase (personal pass) or week phrase (stage pass) appears in at least one line or in the `phrases` of an answer. Every error target has a beat where it would naturally come up.
4. **Safety:** the filter (d) runs on every reference and on all the pack's text. Names are checked against an allowlist (the cast, Natterwick's places, invented minor characters registered in the town state).
5. **Canon:** characters and places are unlocked for the stage and the learner. No character is in two places in one scene. Changes to the town state are listed explicitly, and a closed question ("does this contradict any of these facts?") runs over the scene summaries.
6. **Assets:** every set and prop id exists and fits the place (e).
7. **Budget:** the spoken characters per pack stay under the cap, as do tokens and searches per run.

If any check fails, the problems go back to the same model for one repair run. If the repaired pack still fails, the learner gets a week from the **evergreen shelf**: standalone town weeks per stage, written by the engine during its shadow weeks, reviewed by hand and recorded. A learner never meets a broken scene or an empty week.

**Where it runs:** Cron and Queues on the Worker, with the model calls made from a Durable Object pinned to US West, as the `CallDO` is (Anthropic refuses Cloudflare's Hong Kong colo). Packs are stored in R2, and the learner's pack id goes in D1. The phone downloads the week's scenes and audio ahead and caches them.

### (d) The safety filter

The filter answers a few closed questions, never open ones. Jev (TypeSafe's decision model, ~0.3 s) fits best, as it does for Scootch's crisis screen (`~/oddeggs/scootch/docs/tech-decisions.md` §2). It's subject to the Jev spike now running; until then, and as the fallback, Claude Haiku 5.5 answers the same questions with structured output.

| Where | Question | Labels → action |
|---|---|---|
| Each news reference | What is this about? | sport, weather, launch, film/music, science, festival → usable · politics, religion, death, disaster, crime, war, health scare, money trouble, sex, a real person's private life → dropped · unsure → dropped |
| Each pack (all text) | Does anything here break the never list? | pass → on to the next check · flag → repair run with the reason · second flag → evergreen shelf |
| The learner's shared text (homework, their week, memory items) | Is this safe to build a scene from? | pass → use · sensitive (illness, grief, conflict at work) → no scene; Pip's hand-written kind check-in instead · crisis → the existing safety flow (115 in Vietnam) |

The rules: a pass needs the filter's answer, or the fallback's answer, and a missing answer counts as a fail. The thresholds live in code and are tuned on an English and Vietnamese eval set, as in Scootch. Live calls keep their own classifier in the control line (`tech-decisions.md` §3).

### (e) The visual library

The visual library is ~100 scenes and ~1,000 props, drawn by `@yapling/art` generators in the house style, never by hand (CLAUDE.md). Today the package has 13 scenes and a handful of burrow objects. **Whether agents can produce the rest in the house style at scale is being tested by the art spike; that pipeline is to be confirmed by the art spike.**

**Scenes (~100):** about 25 places, each with about 4 sets. For example, the café has the counter, the window table, the kitchen, the terrace and closing time. Each set takes a time of day (morning, afternoon, evening, night) and weather (clear, cloudy, rain, wind, festival lights), so 100 sets give several hundred looks. Each set has named prop slots (`counter-left`, `shelf-1`, `table`, `window`), so placing props is code, not art.

| Tag | Values |
|---|---|
| place | burrow, lantern-cafe, market-lane, bus-45, bus-stop, hollowbrook-office, interview-room, lantern-inn, dock, clinic, library, radio-tower, harbour, town-square, park, beach, bakery, post-office, street… |
| time of day | morning, afternoon, evening, night |
| weather / season | clear, cloudy, rain, wind, hot, cool, festival |
| mood | calm, busy, cosy, tense-but-kind, celebration |
| stage | the first stage at which the set appears (the Interview Room from Regular) |

**Props (~1,000), and every prop is a word.** A prop is a parameter set for a generator family. One "jar" family can cover 30 pantry words, so ~1,000 props need only ~50 families. Each prop carries:

| Field | Example |
|---|---|
| `id` | `prop-umbrella-yellow` |
| word | umbrella |
| gloss | cái ô (vi; other first languages as markets launch), `reviewed: false` until a native check |
| category | weather, food, drink, work, home, clothes, travel, town, nature, feelings, tools, festival, music, sport, school, health |
| level | the stage band of the word (Newcomer for _umbrella_, Regular for _invoice_) |
| burrow family | jar, desk, plant, map pin, glowing (idioms) |
| fits | places, seasons, moods |
| audio | the word said once in Pip's voice, recorded once for everyone |

**Words become things.** Tap a prop in any scene and you see its word and gloss and hear Pip say it, and the word drops into your notebook as a seed packet (Met). When you use the word in a call, the same prop moves into your burrow as its object and grows with the phrase lifecycle (`concept.md` §10). The town and the burrow use one drawing per word.

**How a story picks visuals:** the prep agent calls `find_assets(place, timeOfDay, weather, mood, words)` and gets back fitting set and prop ids, and names a set and the story props for each scene. Code fills the remaining slots.

**How they rotate:**

- Each learner has a "seen" history. Fillers prefer sets and props that learner hasn't seen in 3 weeks.
- Each scene shows 1–2 props whose words are new to the learner and at their level.
- Weather and festival looks follow the real calendar.
- Changes to the town state can add a prop that stays, such as a new sign at Mei's café after Season One.
- Instrument "opens with no new thing" as a bug (`concept.md` §7.1).

### (f) Voices

| Line | Rendered | Model | Who pays |
|---|---|---|---|
| Hand-written season lines (Season One, Settling in, season tentpoles) | ahead, by `tools/voice` | Eleven v4, the cast voices | once, for everyone |
| Shared town-week lines (all six stage packs) | ahead, after review, at each stage's speed (Visitor at 0.7 with `[pause]`) | Eleven v4, with timing files for lipsync | once a week, for everyone |
| Prop words | once, when the prop is added | Eleven v4, Pip's voice | once |
| Personal lines (Pip's line about your week, the check-in, a voicemail about your interview) | on first play, then cached in R2 for that learner (deleted with the account) | Flash v2.5 (alignment for lipsync) | per learner, only when played |
| The learner's name | spliced in, as today | Flash | per learner |
| Live call turns | live, as today | Flash v2.5 | per call minute ($0.028/min in total) |

Rendering personal lines ahead would pay for lines nobody opens. Rendering them on first play costs the same per play and nothing for an unopened line, and Flash's first audio arrives in ~0.3 s.

**Credits per learner-week:** personal lines run about 400 characters a week (one Pip line and one voicemail or check-in). On Flash that's 0.5 credit a character, so **about 200 credits a learner a week**. Shared town lines run about 2,000 characters per stage a week. On v4 that's 1 credit a character, so about 12,000 credits a week for all six stages, or **about 16,000 with retakes**, the same whatever the number of learners. At the API list price of $0.04 per 1,000 Flash characters, a credit costs about $0.00008.

---

## Collecting, sharing and the shop

The library gives the engine more than visuals: it can make finding things fun, give people moments worth sharing, and earn money without touching the AI budget. One rule holds it together: **what you learn is earned, and what you wear can be bought.**

### Collections and achievements

- **The album.** Every prop and scene you meet in a story goes into your album, a shelf per category, plus a page of places with the sets you've visited. Tap any item to hear its word. The burrow shows what you can _say_; the album shows what you've _found_.
- **Rarity, earned only through play:**
  - common: met in a story;
  - uncommon: found only in a twist's scene;
  - rare: a story milestone (finish a season, bloom 25 phrases, the first time you follow Hank at full speed);
  - limited: during one of Natterwick's own seasonal festivals only (decision 3).
  A limited item you miss comes back the next year. Nothing is lost.
- **Word props are earned by using the word, never bought.** A word prop moves into the burrow, and grows there, only when you say the word in a call (`concept.md` §10).
- **Achievements** are album pages you complete, such as "Every café set", "20 food words", or "All of Bea's postcards". They become keepsakes in the burrow. None of them are about time spent or days in a row.

### Leaderboards, without the shame

The product rules (no guilt, nothing dies, the learner is never tested) rule out a public ranking. The recommended form has three parts:

- **A town goal everyone shares.** For example, "Lanterns for Lantern Night": every story someone finishes lights a lantern, the town counts together, and the square fills up for everyone. Nobody ranks, and nobody can fall behind.
- **Personal bests:** your Flow, your album, the phrases you've bloomed, each compared with your own week 1.
- **Friends-only boards, opt-in** (later, once there's a friends list): counts of album items found and stories finished this month. The board never says "you dropped" and never styles a last place, and anyone can hide themselves.

**The cost trap:** a board for live speaking minutes would push free users into the costliest thing we have ($0.028 a minute). Rank only on things that cost nothing to serve: album items, stories finished, phrases bloomed.

### Sharing

Share cards are drawn by `@yapling/art`, saved as an image and sent through the iOS share sheet:

- the album shelf;
- your critter's outfit card;
- a story recap card (the week's title, the scene, and the phrase you used);
- a neighbour's postcard;
- the monthly time capsule (already planned).

Each card carries a small Yapling mark, the AI tag on every character (characters are always shown as AI), and an invite link (`yapling.app/i/<code>`). **Privacy:** no transcripts, voice or homework on a card. The phrase on a recap card is shown only if you leave it on. Nothing about anyone else appears.

### The shop

The shop sells cosmetic IAP: clothes, hats and jewellery for your critter, burrow decor, and decor packs (lamps, rugs, posters). The concept already plans "seasonal cosmetic packs (never care)" for Plus (`concept.md` §13).

- **The product rule needs one explicit amendment** (decision 7). Today CLAUDE.md says "Never sell care… Plus sells live minutes and depth only." Proposed wording:
  - Cosmetics may be sold.
  - Never random paid items or loot boxes.
  - Never anything that helps you learn or progress (no pay-to-learn).
  - Never anything that changes Pip's mood, affection or wellbeing.
  - Word props, rarities and achievements are earned only.
  - Bought items never count toward the album or the boards.
  Bought decor can be tapped for its word like any prop, but it never grows and never counts as learning.
- **Buy items directly, no soft currency.** Each item has a price in đồng at Apple's Vietnam price points, about **₫25k for one item, ₫49k for an outfit set and ₫99k for a seasonal bundle** (confirm the exact points in App Store Connect). A currency earned by speaking adds an economy to balance, makes speaking feel like grinding, and comes close to rules we don't want to bend.
- **Plus doesn't include a monthly item at first.** Plus stays live minutes and depth. A monthly Plus item can be tested later as a retention lever.
- **Margin.** Cosmetics cost nothing in AI to serve. A ₫49k item is about $1.90 gross, or **about $1.45 net** after Apple's 15% and roughly 10% VAT. One such item bought per paying learner per quarter is about $0.48 a month, nearly the whole $0.55–0.60 AI budget per payer. Free learners who buy something help pay for their own (capped) live minutes.
- **Art cost.** Each wearable must fit each of Pip's three starter species (red panda, capybara, cat), so one wearable means three drawings to check. With fit points on each species' generator (head, neck, body, paws) and a golden test per item, species and mood, 60 wearables come to about 180 golden states, plus the moods. The cast is never dressed up, because their looks are part of who they are. Decor and decor packs reuse the prop library and need no species fit. Wearables are a lane in the library pipeline (Release 4).

---

## Cost per learner per month

Prices come from the current Claude pricing (via the `claude-api` reference, 22 Oct 2026) and the voice spike (`spikes/voice/REPORT.md`):

- **Claude, per million tokens (input / output):** Haiku 5.5 $0.10 / $0.50 (prompts up to 100K tokens), Sonnet 5.5 $2 / $10, Opus 5.5 $4 / $20.
- **Prompt caching:** cache writes cost 1.25× input; cache reads about 0.1× ($0.20 per million on Sonnet and Opus 5.5).
- **Batch API:** 50% off every token.
- **Web search:** $10 per 1,000 searches.
- **ElevenLabs:** Flash $0.04 per 1,000 characters.

Jev costs $0.042 per million input tokens, output free (`spikes/jev/REPORT.md`); the filter costs well under $0.01 a week for the whole town.

**Shared, a fixed cost whatever the number of learners**

| Item | Assumption | Per week | Per month |
|---|---|---|---|
| Town week (Opus 5.5) | 60k in, 20k out, plus 30k of search results | $0.76 | $3.30 |
| Web search | 15 searches | $0.15 | $0.65 |
| Stage passes ×6 (Sonnet 5.5, batch) | 50k in (40k cached), 25k out each, plus one repair in three | $1.00 | $4.30 |
| Shared voices (v4) | ~16,000 credits | $1.30 | $5.60 |
| Safety filter | ~300 questions | < $0.05 | < $0.20 |
| **Total** | | **~$3.25** | **~$14** |

Spread over learners, that's **$0.014 each at 1,000 learners** and $0.05 each at 300.

**Per learner**

| Item | Assumption | Per week | Per month |
|---|---|---|---|
| Personal pass (Haiku 5.5, batch) | 25k in, 5k out, plus one repair in three | $0.004 | $0.02 |
| Real-week prep after "Bring your homework" | ~2 a month, 10k in, 3k out | — | $0.005 |
| Personal voice (Flash) | ~200 credits if every line is played | $0.016 | $0.07 |
| **Total** | | | **~$0.10** |

**Recommended version: about $0.10–0.12 per learner per month** at 1,000 learners, so about 20% of the $0.55–0.60 AI budget per paying learner. Dropping the personal voice lines (name splices only) brings it to about $0.04.

**The expensive version, for comparison.** Writing a full week for each learner with Sonnet 5.5 costs about $0.50 a week in tokens and searches. Voicing it all for that one learner (~3,000 characters on Flash) adds about $0.12 a week. **Total: $1.60–2.70 per learner per month**, three to five times the whole AI budget. Running the same thing on Haiku brings the tokens down to about $0.10 a month, but voicing still costs ~$0.50 a month, and quality and safety are harder to control. **Recommendation: the shared town week with a personal pass.** It's cheaper, and it's also better: one strong model writes the story, one set of references gets screened, and one pack per stage can be reviewed and properly voiced.

**A warning that isn't the engine's.** Live calls cost $0.028 a minute. Even 20 minutes a month ($0.56) uses up the whole $0.55–0.60 AI budget, and a Plus learner's 150 minutes cost $4.20. So the engine must stay small (aim: at most $0.15 per learner per month, logged per job like call costs). The live-call TTS lever in `tech-decisions.md` §3 is still the one that decides the margin.

---

## What stays hand-made

- **The world and the cast:** the town canon, the cast bible, accents and voice designs, the places, Pip's arc across seasons.
- **Season One** (prologue, Episodes 1–6, the between-call lines) and **Settling in** (the six beginner chapters). Together they are the gold examples for Visitor and Newcomer.
- **One gold scene for each higher stage** (Neighbour, Regular, Local, Voice), written in Release 3 so each stage pass has a model to follow.
- **Season tentpoles:** each season's arc, its six episode calls, cliffhangers, recaps and finale, written and recorded by us. The agent may draft, but a person edits every line. Season 2 is next (Release 4).
- **The level guide, the backbone prompt, the never list and the safety thresholds.**
- **The evergreen shelf:** engine-written, but every week on it is reviewed by hand before it's recorded.
- **Kind check-ins for hard real days:** hand-written lines that are never generated.

---

## Risks

| Risk | How the design handles it |
|---|---|
| **Samey stories** | Named payoff and twist lists, and code refuses any used in the last 4 weeks. Place, cast and pattern are logged per week. Real-world references change every week. Visuals rotate. "Opens with no new thing" is tracked as a bug |
| **Canon drift** | The canon is hand-made, and only the town week may change the town state, listing each change explicitly, with a review in the first 8 weeks. Code checks ids, unlocks and names. A closed contradiction question runs on every scene summary |
| **Level drift** | The level guide is data, and the same data checks the result: sentence and turn limits, a vocabulary band, Visitor card rules. Each stage has a gold scene. Learner signals ("Khó quá" taps, meaning and hint requests, replays per generated beat) feed into a weekly report |
| **Unsafe references** | Only the town week reads news, and nothing learner-specific goes into a search. Every reference passes the filter and becomes a Natterwick version with no real names. Then the whole pack is filtered, with the evergreen shelf behind it |
| **Generated Vietnamese glosses** | Glosses in the shared packs go through the weekly review (a native reviewer for the first weeks). Personal lines are short and reuse glossed phrases. Every generated gloss carries `reviewed: false`, as today |
| **Cost** | Hard caps in code per run (tokens, searches, repairs, spoken characters). Every job logs its cost. Alarm if the engine passes $0.15 per learner per month |
| **Personal data in prompts** | Only memory items the learner kept on the memory page. Homework is used for that learner's pack only, never in a search, and deleted with the account |
| **A pack isn't ready** | The evergreen shelf. The phone keeps last week's pack cached |
| **The shop or boards erode trust** | Earned and bought items stay apart: bought items never count toward the album or boards, there are no random paid items, and nothing touches Pip's mood. Boards rank only on cost-free things and are opt-in. The shop opens only after the retention gate |
| **Model or price changes** | Model ids and prices live in one config. The gold scenes and checks make a model swap testable in a day |

---

## Decisions for the founder

All ten decided on 22 Oct 2026: the founder accepted every recommendation and left the festival question to the team (decided below).

| # | Decision | Recommendation |
|---|---|---|
| 1 | **The engine's shape:** one shared town week per stage plus a small personal pass, rather than a full week written for each learner | **Shared plus personal.** About $0.10 vs $1.60–2.70 per learner per month, and easier to keep safe and good |
| 2 | **A person reviews the six shared packs before each week goes out**, on a review page, about 20 minutes a week | **Yes, for the first 8 weeks**, then spot checks. Shadow weeks before launch fill the evergreen shelf |
| 3 | **Holidays and festivals.** Should town festivals follow real cultural holidays (Tết, Mid-Autumn)? | **Decided: no.** §2.3 stands: Natterwick's festivals are its own, tied to weather and seasons (rainy-season fair, first cold night, end-of-year lights, the harbour festival's anniversary), never to a culture's holidays. Limited items appear during these town festivals. This also follows the founder's standing preference against building on Vietnamese traditions |
| 4 | **About 70,000 ElevenLabs credits a month** for the shared town voices and prop words, a fixed cost | **Yes.** It's what makes shared weeks sound as good as Season One |
| 5 | **The library at go-live:** the full ~100 scenes and ~1,000 props when the engine goes live (Release 3), with a style check at 30 scenes and 300 props | **Yes, with the check at 30 / 300**, pending the art spike's verdict |
| 6 | **Jev for the safety filter**, reusing the studio's TypeSafe account, with Haiku as the fallback | **Decided: yes.** The Jev spike passed (`spikes/jev/REPORT.md`: crisis 42/42 caught, 0/57 false; ~90 ms from US West; $0.042 per million input tokens) |
| 7 | **Amend "Never sell care" to allow cosmetics**, with the limits in "The shop" (no loot boxes, no pay-to-learn, nothing that touches Pip's mood or affection, learning items earned only, bought items outside the album and boards). CLAUDE.md and `concept.md` §13 change to match | **Yes.** Cosmetics aren't care, they cost no AI, and the limits keep the trust the product depends on |
| 8 | **How the shop sells:** a direct price per item (₫25k / ₫49k / ₫99k) rather than a soft currency earned by speaking, and no monthly item in Plus at first | **Direct prices, no currency, Plus unchanged.** Simplest to build and explain; test a Plus item later |
| 9 | **Leaderboards:** a shared town goal and personal bests in Release 3, opt-in friends-only boards later, never a public ranking, never ranked on live minutes | **Yes.** Engagement without ranking shame or extra AI spend |
| 10 | **When the shop opens:** after launch, once retention is proven (Release 4, after the D30 gate holds), with wearables for Pip's three species only | **Release 4.** Selling cosmetics before people care about their critter would look like a cash grab |

---

## Appendix A: the backbone prompt (first draft)

The blocks in `{braces}` are filled by code after this fixed text: `{level_guide_row}`, `{cast}`, `{canon}`, `{town_state}`, `{gold_scene}`, `{references}`, `{learner}`, `{task}`.

```
You write the weekly stories of Natterwick for Yapling, an app where people
practise speaking English by talking with the critters of a small harbour town.
Your stories are played as live voice calls and short listening pieces. The
learner speaks; the characters answer. Every story exists to give the learner
a real reason to speak.

THE TOWN
Natterwick is a cosy harbour town where critters arrive from everywhere, which
is why everyone's English is different and all of it is good English. The
learner lives in a burrow with Pip, a yapling (a newcomer critter) who is
learning English from them. The cast, places and facts below are fixed. Use
them; never contradict them; never invent new main characters. You may invent
a minor visitor (a delivery otter, a lost tourist) if you register them in
"new_minor_characters".

THE EMOTIONAL CORE
In Natterwick, the learner's voice makes a difference. Each week:
- someone in town needs the learner's help, and only talking can give it;
- something small changes because the learner spoke, and the learner can see
  or hear it change;
- Pip learns something from the learner, and uses it later in its own words.
Being understood is enough. Nobody needs to sound native. The learner is never
tested, graded or embarrassed; they are needed.

TONE
Warm, cosy, gently funny, low stakes. Problems are small and real: a lost
scarf, a full inn, a sign nobody can read, a bus that left early. Characters
are competent and kind; they may be confused, never mocking. Humour comes from
situations and from Pip's honest mistakes, never from accents or the learner.
Every conflict is solved by speaking: asking, explaining, persuading,
apologising, agreeing, saying no kindly. The outcome always lands well; how it
lands can vary with what the learner says.

THE SHAPE OF A WEEK
- A small new thing happens on day one (a delta), seeded by the calendar or a
  reference below.
- The town call: the week's problem, in one place, with two or three of the
  cast, resolved by the learner speaking.
- Between calls: Pip's short story, a postcard from a neighbour, a voicemail.
  Each uses one or two of the week's phrases.
- The week ends on a payoff the learner can see or hear, and, if a thread is
  open, a small hint of what's next.
A town week is complete on its own. A learner who misses it loses nothing.

PAYOFFS (pick one for the week; code tells you which were used lately)
your-words-stay: a sign, menu, note or name in town uses the learner's phrase
someone-thanks-you: a neighbour thanks the learner for something specific
pip-grows: Pip uses the learner's phrase, perhaps slightly wrong to be fixed
thing-appears: a new object for the burrow, tied to a word the learner used
town-celebrates: a small gathering because of what the learner did
door-opens: a hint of a new place or neighbour (only if the stage unlocks it)

TWISTS (pick at most one; never one used in the last four weeks)
mix-up: a word is misunderstood and the learner explains it
soft-side: a gruff character turns out to care
wrong-guess: what everyone assumed turns out to be something gentler
small-mystery: a harmless puzzle (who left the note?) solved by asking
helper-needs-help: someone who usually helps needs the learner's help
favour-returns: someone the learner helped earlier helps back
sideways-plan: the plan goes wrong in a funny, harmless way and gets fixed
surprise-guest: an unexpected visitor arrives with a small need

THREADS
At most one light running thread may be open in town. Open it with a rumour or
a small clue; pay it off within three weeks. Never make a scene depend on the
learner having heard an earlier week. Big story arcs belong to the written
seasons; don't start one.

REAL-WORLD REFERENCES
You may use the references below, which have been checked. Always turn them
into Natterwick versions: a cup final becomes the Harbour Cup, a phone launch
becomes the new Shellphone at Market Lane, a heatwave becomes a hot week when
Mei sells iced kaya drinks. Never name a real person, brand, team, place or
product. Real holidays appear only as the learner's own time off; the town's
festivals are its own, tied to weather and seasons. Use at most two
references a week, lightly.

THE LEARNER'S LEVEL
Write every line for the level guide row below. Character lines stay inside
its sentence and turn limits; the learner always talks more than the
characters. Use the vocabulary band; a word outside it must be one of the
week's phrases or a prop word, and gets a gloss. Choose tasks from the row's
task list. Give each learner turn a fine exit, a target-error mode, a hint
that shows the words to say, a few tries and a fallback that moves the story
on, so the scene always ends. At Visitor: one sentence of at most eight words,
the character says their own answer first, and every learner turn has two
cards to read.

THE CAST'S VOICES
Write standard English for everyone. An accent lives in the voice, never in
the spelling: no phonetic spelling, no broken grammar, at most one light
regional word per scene (a "lah" from Mei, a "love" from Bea). Every character
is an AI character in the app and never claims to be human or to have a life
outside Natterwick.

NEVER
- Nobody dies, gets hurt, gets sick in a frightening way, or is humiliated.
- No romance, flirting, jealousy or "only you understand me".
- No guilt about absence, no pressure to stay, no "you'll lose", no streaks.
- No politics, religion, war, crime, disasters with victims, money trouble for
  the learner, or anything about real people's lives.
- Nothing sold: Pip's care, food and affection are never for sale.
- No teaching voice: characters never explain grammar.
- Never answer for the learner; never put words in their mouth as if they
  said them.
- Nothing that contradicts the canon or the town state.
If a reference or the learner's information can't be used within these rules,
leave it out.

HOW TO ANSWER
Return only the week pack in the given JSON schema. Use asset ids from
find_assets only. Write a Vietnamese gloss for every line and card, short and
natural, in the register of the cast's existing glosses. List every change to
the town state in "canon_changes". Note which payoff and twist you used.

{level_guide_row}
{cast}
{canon}
{town_state}
{gold_scene}
{references}
{learner}
{task}
```

## Appendix B: the week pack and the code it touches

```
WeekPack
  id, kind ('town' | 'stage' | 'personal'), stage, weekOf (date), parent (pack id)
  scenes: Scene[]           existing type, plus `set` (below)
  lines: StoryLine[]        existing type; `audio` may be a remote file
  phrases: TargetPhrase[]   from the phrase bank, by id
  week: WeekSlot[]          which day each scene arrives
  patterns: { payoff, twist }
  canonChanges: Fact[]      town week only
  references: { summary, label, natterwickVersion }[]
  cost: { tokens, searches, ttsChars, usd }

Scene.set: { scene: SetId, timeOfDay, weather, props: { slot, prop: PropId }[] }
```

Small, contained changes, each owned by its lane in the plan:

- **Contracts and story types:** `Scene.place` grows from 6 fixed places to the library's place ids. Scenes gain an optional `set`. `LineAudio` gains a remote form (a URL and timing URL, cached on the phone). Validation and the runner look up lines and phrases from the pack as well as from the season (`validateScene(scene, lookup)`), so hand-written seasons don't change.
- **Domain:** `LEVEL_GUIDE` beside `SPEECH_SETTINGS`, and `checkLevel(stage, lines)`. It also checks the hand-written Episodes 2–6 in Release 2, so the gold examples obey the rules the engine will.
- **The director:** no change. A generated `gen` beat looks to the live call the same as a hand-written one.
- **The app:** a pack cache that downloads the week's scenes and audio ahead, keeps the last pack, and works offline. Share cards need an image file and the share sheet. Any native module either of these needs (a file store, image sharing) goes into the Release 2 store build, so the engine, the album and the share cards can arrive server-side and over the air.
- **Purchases:** shop items are non-consumable products in RevenueCat beside Plus. The server owns ownership, as it owns the minute ledger.
