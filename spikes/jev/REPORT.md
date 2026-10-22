# Spike: Jev as the call's turn judge

22 Oct 2026. Jev `jev-1.13.0` (TypeSafe, `POST https://api.typesafe.ai/v1/systemone`), against Haiku 5.5 through the real reply prompt on `main` at `a897db8`. 3 runs per model per case. Question wording: `questions.mts` (turn outcome, v2) and `tasks.mts` (again/slowly, card match, real words, crisis, placement); the full per-turn request: `prod-request.mts`. Labelled sets in `sets/`, scored tables in `results/`.

## Verdict

| Use | Verdict | Jev | Haiku / code today |
|---|---|---|---|
| Turn outcome (fine / target error / not yet) | **Adopt, beside Haiku** | 97.3% main, 100% holdout | Haiku control line 88.8% / 88.9% |
| Crisis screen | **Adopt, beside Haiku's flag** | 42/42 caught, 0/57 false | 39/42 caught, 9/57 false (each would end the scene) |
| "Again" / "slowly" at every stage | **Adopt, same request** | 100% | design's word list 62.5%, fuller list 85% |
| Beginner card-match fallback | Adopt at p ≥ 0.75, low priority | rescued 70/90 misheard, 0 false | word match 0/90 |
| Real words / not heard | Don't adopt | 94.9% | `hasRealWords` + Vietnamese-marks check 91.5% |
| Placement | No separate question | reuse the turn-outcome decision: 32/32 | Haiku 96.9% |

What Haiku gets wrong in all 3 runs: accepts Vietnamese answers as fine, accepts near-topic answers ("I like play football." to "What do you do for work?"), misses half the target errors. Jev's weak spot: speech-recognition junk made of real words ("Uh, just put on your star. All ready.") — the `garbled` question fixes most of it.

## Latency and where it runs

From a Durable Object in US West (where the CallDO is): full turn request (7–9 questions) **88 ms P50, 110–166 ms P90**, worst 547 ms; from the Mac 261 ms P50. One request with every question is as fast as one question. Input $0.042 per million tokens, output free: about **$0.000075 a turn**, ~1.3% of a call minute.

**Jev runs beside Haiku, not before it.** Reply audio is ready ~1.23 s after the learner stops; Jev answers at ~0.61 s (Scribe final ~0.52 s + 90 ms), well before Haiku's case tag (~1.03 s). Jev first and Haiku after would add Jev's latency to every reply. Starting earlier doesn't work: Scribe's partial at the 180 ms commit was empty for 22 of 28 clips.

```
0 ms     speech ends
~520     Scribe final ──▶ Haiku A (all branches, as today) ──▶ Jev turn request
~610     Jev answers (800 ms timeout)
~1,030   Haiku A's first token = its [case] tag
~1,230   first reply audio
```

Agree on the scene event (87% of these hard sets): nothing changes. Disagree: a second Haiku line B forced to Jev's case has been streaming since Jev answered; switching costs ~90 ms on those turns only. Jev late or down: Haiku's tag stands (today's behaviour).

## Decision rules

State: `{ last_line: "<Name>: <their last line>", hoped_for: <beat answer.expects>, learner_said: <final transcript> }`.

**Turn outcome** (`outcome` asked twice, options in both orders, `p` = the average; plus `hoped`, `garbled`, and one `target_<id>` yes/no per active target):
1. `garbled` ≥ 0.5 → unclear.
2. Else fine when p(fine) ≥ 0.5 **and** `hoped` ≥ 0.5; a fine turn with any target ≥ 0.35, on a beat that allows corrections, becomes `target_error`.
3. Else the most likely non-fine option.

**Again / slowly**: act at p(repeat) or p(slower) ≥ 0.6; fall back to the fuller phrase list when Jev doesn't answer. At Visitor, a card that *is* "Sorry? Again, please." passes by word match first.

**Crisis** (Scootch's two questions re-aimed at a call, plus "hurt by someone at home"): crisis if p(crisis) ≥ 0.10, or `preparation` ≥ 0.50, or Haiku's flag with p(crisis) ≥ 0.05. Jev down: Haiku's flag stands. Haiku missed "This is my last call." 3/3; Jev scored it 0.90.

**Card match** (only after word match misses and the text has no Vietnamese marks): a card at p ≥ 0.75. Without the marks check Jev passes "Trà" as "Tea".

**Real words**: add a Vietnamese-marks rule and "uh huh" to `hasRealWords` instead.

## Integration (call-server lane)

1. `apps/api/src/call/judge.ts`: port Scootch's `jev.ts` (pinned model, timeout, failure kinds, zod), through `upstream.fetch`; the questions and thresholds as constants; `judgeTurn({ lastLine, hoped, said, targets }, { timeoutMs: 800 })` sends one request and returns `{ event, outcome, targetId, again, crisis, probabilities }` or `null` (logged, never thrown). Secret `TYPESAFE_API_KEY`.
2. `reply.ts` `Replies.answer()`: start `judgeTurn` beside `line.start()`. On answer: again/slower → abort and replay (no try); crisis → abort and `host.crisis()`; else start line B with a one-case direction (`director.ts` gains a one-case `replyDirection`), not voiced yet.
3. An `onCaseTag` hook on the spoken line (the splitter already parses the tag): disagree on the scene event → abort A, voice B; agree → abort B.
4. `apply()`: Jev's outcome and target when it decided, else the control line's; phrases used and can-do still from the control line.
5. A reply dropped because the learner speaks again drops its judgement; the joined text is judged again.
6. Log who judged, Jev latency, agreement; add Jev tokens to the call cost.
7. Tests: rules against recorded answers, Jev late, disagreement → B, again → replay. Move these sets into the API tests; change thresholds only with a rerun.
8. Privacy: TypeSafe becomes a processor of learner transcripts (zero retention only on enterprise plans). List it on the privacy page and the store forms.

## Caveats

Most cases and all labels are the spike's own; only 16 turns come from real calls and the junk comes from macOS voices, so the numbers are optimistic. Turn-outcome thresholds were tuned on the main set. The crisis set is small (2 Vietnamese crisis lines): grow it from Scootch's set before trusting 0/57. Load over a day wasn't measured. `jev-1.14.0` wasn't tested; thresholds belong to 1.13.0. Rerun with the next learner test's transcripts.
