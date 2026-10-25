# The curriculum writes every story

Rewritten 26 Oct 2026, after the founder's third phone test ("asking all sort of non-sensical stuff") and the research report `~/oddeggs/reports/Speaking curriculum for story lessons.md`. This replaces the first version of this note.

## The idea

The director had a story engine and no syllabus, so nothing told a scene what the learner should be able to do, say, hear or know by the end. Now the curriculum is the source of truth and the director writes to it. The curriculum fixes the can-do, the function, the target chunks and the strategy. The director invents only the situation, the twist and the feeling.

## The syllabus (`apps/api/src/curriculum/units.ts`)

- **Six stages:** Visitor to Voice, Pre-A1 to C1. Each has its own speech speed, word limit, cast budget, two-choice rule, planning time, listening questions and longest learner turn.
- **44 units in the function order every major course shares.** Each unit's title is the line it teaches ("How much is it?", "Here's the thing"), with a can-do sourced to CEFR or GSE, 3–5 target chunks and one conversation strategy.
- **A story is one unit, told in five episodes (four at Visitor).** Each episode has a coursebook job:
  1. The problem lands.
  2. The first try.
  3. The turn: listening and the unit's strategy.
  4. The hard conversation: the free task.
  5. The payoff: retell and look back.
- **The learner's goals reorder the units, never replace them** (`progress.ts`). Work pulls B5, R3 and R5 forward; travel pulls N3, N4 and B4. The next unit is never the same as the last two.
- **Progress:**
  - The chunks of the last two units come back as review.
  - A learner moves up a stage when the judge has seen most of its can-dos done in free tasks without rescue.
  - A story keeps the stage it was written at.

## One companion (`curriculum/companion.ts`)

- **Matching:** the companion is matched first on the learner's reason for English (work → Sol, travel or moving → Nell, friends → Mei, study, exam or nerves → Linh, family or "just me" → Pip, from Newcomer up), then gets a stance from their confidence: peer, colleague or challenger.
- **Choice:** at the end of arriving, the learner hears the top two introduce themselves (recorded in ElevenLabs v4) and picks one.
- **In every scene:**
  - The companion is painted into whatever place they're in. The stage swaps the place's resident for them.
  - The companion is always an ally. Pressure comes from at most one guest. There are no guests at Visitor, and at Newcomer only in episode 4.
  - A guest speaks in their own voice. That is a reply that starts with `[guest]`, or the rest of a reply after `[guest]`, for example when the companion plays a voice message.

## A scene (`director/moment.ts`)

Each scene is planned against a template:
- the brief: recap, where, what's happening, your role, 1–3 tasks and phrases to try, shown on the black chapter card with a Vietnamese gloss
- a knowledge ledger of every fact, tagged with where the learner got it (their own life, the brief, an earlier scene, or the world)
- the guest and how they're there (in person, on the phone, by voice message)
- the information or opinion gap
- beats (open, success first, task, turn, close), each with a rescue
- the forms to prompt on
- the listening task
- the end condition

Code checks every plan: an open place, the cast budget, a brief with tasks, nothing visual-only ("look at", "what does the board say"). Then a Sonnet critic checks the 14 scene rules (`craft.ts`). These include real questions only, the ledger, "say it or it doesn't exist", model before you ask, success first, correct like a friend, earned praise only, wait-then-rescue and end on a consequence. A plan that fails gets one repair.

## The live actor (`director/actor.ts`)

The actor plays the companion in their manner and stance. It follows the rules above. On each beat it is told how to give feedback: nothing during the task, a prompt only on the target forms, and a rescue after two tries. The narration guard drops notes about the learner by name, and notes that open by quoting what the learner just said.

## The look-back

The judge names one strength and one thing to fix (what they said, and a better way). It also says whether the can-do was shown without rescue. The kept painting shows the fix.

## Hand-written moments (`director/fixed.ts`)

- **The first one:** the companion meets the learner off the 45 and they introduce themselves.
- **While the director is writing:** an honest two-phrase rehearsal of recent chunks, with no fake story.
- **A visit from the menu:** the place's own neighbour asks for an honest opinion.

## Checking it

`apps/api/scripts/sim-story.mts <khanh|lan|ana> [episodes]` plays the companion match, the first moment and a curriculum story in text with a simulated learner, and prints the brief, the ledger, the transcript, the judge and the look-back.
