# Yapling: the beginner path ("Settling in")

_v0.1 · 22 Oct 2026 · design for Release 1.1 · inputs: `concept.md`, `journey-and-story.md`, `cast-bible.md`, `season-1-script.md`, `learner-test.md`, the built week (`packages/story/src/season-1/*`, `packages/domain/src/stages.ts`, `apps/api/src/call/*`, `apps/mobile/src/features/onboarding`, `features/burrow/day-plan.ts`) and the recorded lines in `audio/season-1/`. The build plan is "Release 1.1 · Beginner path" in `plans/261022-0200-yapling-releases/plan.md`._

The founder's friend "barely completed any days". This doc says why, and designs a short path that gets a true beginner (A0–A1) talking before the story starts.

## The short version

- **Week 1 is built for A2 learners, and nothing in the app is easier than week 1.** Nearly every turn asks the learner to make up their own sentence, the task is explained in English, the voices run at about 155 words a minute, and a turn only passes when a strict judge is sure it was right.
- **Add six short chapters before week 1, "Settling in".** Linh, your neighbour from home, helps you and Pip settle in: hello, yes/no, "Sorry? Again, please", numbers at the bus stop, ordering at Mei's café, and saying who you are. Each call takes 2–3 minutes and has 3–5 turns. Then the letter arrives and the story begins.
- **At this level the call uses different rules:** the character says the answer first, you read one of two cards aloud, any try with the right word passes, "again" and "slowly" always work, and Linh explains each new kind of task in Vietnamese at the start.
- **A new lowest stage, Visitor, sits below Newcomer.** It drives the slower speech, the cards and the easy acceptance, and it adds easier versions of the week-1 turns. You become a Newcomer when Linh hands you your residency card at the end of week 1.
- **Cost: 66 new recorded lines (about 1,750 characters, under 5,000 ElevenLabs credits with retakes), no new art, about 207 Vietnamese strings to review.** It all ships over the air; no new build.

---

## 1. Diagnosis: why days 1–8 are too hard

### 1.1 What a beginner meets, day by day

Speeds are measured from the recorded lines' timing files (`audio/season-1/lines/*.timing.json`). The cast bible's Newcomer target is about 110 words a minute; A0–A1 listeners need about 80–90 with pauses.

| Day · call | What the beginner has to do | What they hear | Help | What passes | When they can't |
|---|---|---|---|---|---|
| 1 · Placement ("Help me unpack") | Answer four **open** questions: your job, your normal day, what you do after work, what you want to improve | Pip, live, up to 25 words a turn; recorded intro at 122 wpm and outro at 139 wpm (23 words: "You keep going when you're stuck…") | A sentence frame ("I'm a … at …") slides up after 4 s of silence | "Says what their job is, in any words" | Pip says "no rush" and opens the next box. Four boxes in a row can go like this |
| 1 · Linh knocks | Nothing (the mic rests) | Linh, 27 words in one go, 156 wpm | Tap to gloss | — | — |
| 2 · Episode 1, the café | Six turns: ask Mei what's wrong; ask again or offer help when she says "nothing lah"; **explain what "rent" means**; agree to call; **introduce yourself to an office on the phone** and say you're calling for Mei; **give Mei one piece of advice** | Mei (Singaporean English, 107–188 wpm, "lah", "my English goes funny"), Pip whispering, a British office voice (live), a B1 letter ("2× the current rent… reply by Friday") | Frame after 4 s; "What does that mean?" answers in simple English first, Vietnamese one tap deeper | The judge marks a turn fine "only if it does what we hoped… when in doubt it is not fine"; garbled words never pass | An English nudge ("What do you think, in your words?"), then another character says it for them (Pip: "Mei, what's wrong?") and the story moves on |
| 3 · Pip's story, Linh's postcard | Listen | 75 words of past-tense story at 155 wpm; a postcard about describing words you forget (a B1 strategy) | Tap any line for Vietnamese | Nothing to fail | — |
| 4 · Teach Pip to introduce yourself | Introduce yourself and your job **in 30 seconds, twice**, against a timer ring | Pip, live, explaining that it has to introduce itself at Hollowbrook | Frame "Hi, I'm … I work as … I help …" | Name, job and one thing you do | Pip offers to go first, then asks again |
| 5 · Pass it on, Bus 45 | Tell the story of your day **for 90, then 60, then 45 seconds**, to three listeners | Pip, Linh, Bea ("Go on then, love. You've got till the next stop") | **No Vietnamese** (Pass it on rule); an English frame only | The timer ends the turn | The listener asks one question |
| 6 · Pip's voicemail | Correct Pip's "Can I helping you?" | Pip, 182 wpm | Frame "We say: 'Can I help you?'" with Vietnamese | Says "Can I help you?" | Pip works it out itself |
| 7–8 | Paywall, coming back | — | — | — | — |

So a beginner's first five calls ask for 16 spoken turns, and 12 of them need a sentence the learner has to build. Only four (asking what's wrong, asking again, agreeing to call, fixing Pip) can be done by reading the hint aloud, and the hint shows only after a 4-second silence.

### 1.2 The barriers, ranked

| # | Barrier | Where | Why it stops an A0–A1 learner |
|---|---|---|---|
| 1 | **Every turn asks you to make up a sentence.** Open questions, explaining a word, advice, a 30 s introduction, a 90 s monologue | Every call | Beginners can repeat and choose long before they can compose. Nothing shows them the answer first |
| 2 | **The task itself is in English.** "Can you ask her what's wrong?", "How do people introduce themselves at work?", the nudges, the "What does that mean?" answers | Pip's whispers, every nudge | If you don't understand the instruction, you can't start. Vietnamese is only on screen, one tap away, and only for lines, not for "what do I do now" |
| 3 | **Passing is strict, and failing is visible.** "When in doubt it is not fine"; a Vietnamese answer, a single word or a mis-heard word counts as unclear; speech recognition is set to English only (`language_code: 'en'`), so Vietnamese comes out as junk | The call judge (`director.ts`), the STT (`upstream.ts`) | The learner tries, hears more English, tries again, and then watches Pip say it for them. Every turn feels like a small failure, so people stop |
| 4 | **Too fast and too long to follow.** Recorded lines median 155 wpm (107–188); the designed voices run about 155 wpm even at the slowest TTS setting (`tech-decisions.md`); live turns up to 25 words; recorded lines up to 27 words | All calls, the story | A1 listeners tend to lose a line longer than about 8 words, and they can't ask for it again: nothing in the call honours "again" or "slowly" |
| 5 | **Several accents and idioms at once.** Singaporean Mei with "lah", a British office, Bea's "love" and "till the next stop", "goes funny", "kaya toast" | Days 1, 2, 5 | Good for A2 listening, too much for a first week at A1 |
| 6 | **Time pressure.** 30 s ring twice; 90/60/45 s rounds; E1 is 6 turns, about 4–5 minutes | Days 4, 5 | A beginner can say 3–5 words in 30 s. A ring that runs out reads as "you failed" |
| 7 | **No way down.** Placement asks only open questions and never sets a stage (the server's default is Newcomer and nothing calls `setStage`); "Khó quá" only drops the voices one speed step (0.8 to 0.7) and brings hints 25% sooner | Day 1, the residency card | There is nothing easier to go to. Too hard just means slightly slower too hard |
| 8 | **Word load.** rent, reply, current, property office, settled, unpack, introduce, advice, interview | Days 1, 2, 4 | Each one needs a tap and a reading break mid-call |

Two lanes now in progress fix part of #3 (silence no longer counts as a try; thinking time is unlimited) and part of #2 (every line tappable for Vietnamese, earlier lines in a turn revisitable). They don't change #1, #4, #6 or #7, and they don't give the learner a way to start when they don't understand the task.

---

## 2. Who it's for and how they get there

**For:** learners who can't yet answer "What do you do for work?" out loud: self-rated 1 ("Gần như không nói được") or 2 on the learner-test scale, or anyone who finds week 1 too hard. Not for A2 learners who freeze; they stay on Newcomer with "slower".

### 2.1 Three ways in

| Way in | When | What happens |
|---|---|---|
| **Self-select** | Onboarding, one new question after the AI explainer, before choosing the roommate: "Tiếng Anh của bạn bây giờ thế nào?" with two large chips: **"Mình mới bắt đầu"** (chào hỏi, nói tên, vài từ) and **"Mình nói được một chút"** (giới thiệu bản thân, gọi món) | "Mới bắt đầu": no placement call. Day 1 continues to the burrow, and Linh's knock is Chapter 1. "Nói được một chút": the placement call as today |
| **Placement** | The unpacking call on day 1 | The call becomes a ladder: box 1 is a closed warm-up ("This box is heavy! Is it yours?" with Yes / No cards, not scored), then three open boxes (work, after work, what to get better at). **Visitor if at most one of the three open boxes gets a fine answer.** If the first two open boxes both miss, Pip skips the last one ("Phew! Heavy boxes. Let's rest!"), so nobody gets three misses in a row. The server sets the stage when the call ends |
| **"Too hard", anywhere** | The residency card, the call's exit sheet, the after-call card, the Me sheet | A small sheet with two choices: **"Nói chậm hơn"** (stay, slower pace, as today) or **"Tập với Linh trước"** (become a Visitor, open Settling in). The scene in progress saves its place and waits |

The Visitor's residency card is the same card with a different stamp: "Visitor · Khách mới đến", "Linh sẽ giúp bạn làm quen trước", and the first two can-dos ("Say hello and your name", "Ask someone to say it again"). Under it: **"Làm quen với Linh"** (primary) and **"Vào thẳng truyện"** (secondary: skip to Newcomer). The learner always has the last word.

### 2.2 Moving up

| From → to | When | How it feels |
|---|---|---|
| Settling in → the story | After Chapter 6 the letter slides under the café door; week 1 starts the next morning | A story beat, not a test |
| Skip ahead | "Vào truyện luôn" on the Settling-in list, any time | The letter comes that evening |
| Visitor → Newcomer | At the end of week 1's ring (day 5's keepsake): the keepsake is Linh handing you your Newcomer residency card, when at least 70% of week-1 turns passed without the generous pass. Otherwise the normal keepsake, and Linh offers again next week | "You're not a visitor any more." The learner can say **"Ở lại thêm"** and stay a Visitor |
| Any time | Me sheet: "Thử nhanh hơn" | Same as "Dễ quá" |

### 2.3 Dropping back without shame

- The words "level", "down", "fail" and "beginner" never appear. The copy is about Linh: "Linh sẽ tập cùng bạn vài buổi ngắn. Quán của Mei vẫn chờ bạn."
- Linh's line in Chapter 1 says she couldn't say a word either when she got off the ferry.
- Nothing is lost: phrases, keepsakes and the ring stay. A scene left for Settling in restarts from its top at Visitor, and the ring slot stays open.
- Settling-in chapters stay open to replay for free, from the Me sheet ("Làm quen lại với Linh").

---

## 3. The story frame

**"Settling in"** (Vietnamese: "Làm quen"). You and Pip have just come off the ferry. Pip is new too, from the Far Meadow. Linh, the pangolin next door, came to Natterwick from Vietnam years ago and still remembers freezing. Over a few short visits she helps you both settle in: at your door, among the boxes, at the bus stop, at Mei's café, and back home with Pip's notebook. The burrow unpacks one box per chapter (the burrow-by-day boxes already exist), so the room fills as you learn.

Rules from the cast bible that this frame keeps:

- **Pip still learns from you.** Pip copies what you just said, right after you say it ("Hi! Hi, Linh!"). Pip never answers for you; at most it whispers what to ask, as it does in Episode 1.
- **Linh is the one who speaks Vietnamese** (founder decision 1). Only at the start of a new kind of task, and less every chapter: spoken Vietnamese in Chapters 1, 2, 3 and 6 only, text cards after that, none in the story.
- **Accents are voices.** Mei keeps one "lah"; Bea keeps "love". Every line works without knowing them.
- **Nothing fails.** No timer, no red, no score. A chapter ends when its last line plays.

**The hook into the story:** Chapter 5 shows Mei tired behind the counter ("Okay. Back to work."), and Chapter 6 ends at dusk with the letter under the café door, the same moment the Newcomer prologue ends on.

---

## 4. The six chapters

| # | Title | Place (existing art) | Cast | You learn to say | Turns | About |
|---|---|---|---|---|---|---|
| 1 | Hello | Burrow door (Linh's knock) | Linh, Pip | Hi · I'm … · Nice to meet you · Bye | 4 | 2 min |
| 2 | Boxes | Day-one burrow | Linh, Pip | Yes · No · this or that · Yes, please · No, thank you · Thank you | 4 | 2 min |
| 3 | Again, please | Burrow | Linh, Pip | Sorry? Again, please · Slowly, please | 4 | 2 min |
| 4 | Bus 45 | Bus stop | Linh, Bea | Numbers (2, 9, 10, 45, 50) · Two, please | 5 | 3 min |
| 5 | Mei's café | Lantern Café | Mei, Pip | Tea, please · How much? · Here you go | 5 | 3 min |
| 6 | About me | Burrow at dusk | Pip, Linh | I'm from … · I'm a … / I work at … · I like … | 3 | 3 min |

**Why six:** one chapter per survival can-do that week 1 then relies on (greet and name for the office call, yes/please for Mei, "again" for everything, numbers and ordering for the café, "about me" for the day-4 introduction). Fewer leaves a gap week 1 falls into; more delays the story, which is what brings people back. About 15 minutes of calls in all.

**Pacing:** Chapter 1 on day 1. After that the next chapter opens as soon as one is done; after two in a day the button becomes "Để mai" with "Làm tiếp" beside it. A learner reaches the letter in 3 to 6 days. Each settling day has one morning knock from Yapling, in Vietnamese ("Linh đang đợi bạn ở bến xe buýt").

### 4.1 The scripts

Line ids are `s1-setN-NN`. **EN** lines are English, under 8 words, recorded slow (section 5.3). **VI** lines are Linh in Vietnamese [VI review before recording]. **Turn** rows are the learner: the card(s) they read aloud and what passes. **Gen** is a short live line (it needs the learner's own words). Every English line has a Vietnamese gloss; every card shows its Vietnamese under it.

**Chapter 1 · Hello** (Linh at the door, day 1 evening)

| # | Who | Line or turn |
|---|---|---|
| 1 | — | Knock |
| 2 | Linh EN | "Hi! I'm Linh." |
| 3 | Linh VI | "Chào bạn! Mình là Linh, nhà bên cạnh. Hồi mới xuống phà tới đây, mình cũng chưa nói được câu nào. Giờ mình nói trước, bạn nói theo nhé." |
| 4 | Turn | Card **"Hi!"** · passes on hi, hello, hey |
| 5 | Pip EN | "Hi! Hi, Linh!" (copies you) |
| 6 | Linh EN | "I'm Linh. And you?" |
| 7 | Turn | Card **"I'm {name}."** · passes on I'm, I am, my name, or their name |
| 8 | Linh EN | "{name}! Nice to meet you." (name spliced, as the script's other name lines) |
| 9 | Turn | Card **"Nice to meet you, too."** · passes on nice, meet |
| 10 | Pip EN | "Nice to meet you, too! I'm Pip!" |
| 11 | Linh EN | "Bye! See you tomorrow." |
| 12 | Turn | Card **"Bye!"** · passes on bye, see you |
| 13 | Linh VI | "Bạn vừa nói tiếng Anh rồi đó! Mai gặp lại nhé." |

**Chapter 2 · Boxes**

| # | Who | Line or turn |
|---|---|---|
| 1 | Pip EN | "So many boxes! Help, please!" |
| 2 | Linh VI | "Mình hỏi, bạn chọn một thẻ rồi đọc to lên nhé." |
| 3 | Linh EN | "Is this your box?" |
| 4 | Turn | Cards **"Yes."** / **"No."** · either passes |
| 5 | Linh EN | "Books or clothes?" (after a pool "Okay!") |
| 6 | Turn | Cards **"Books."** / **"Clothes."** |
| 7 | Pip EN | "Tea? For you!" |
| 8 | Turn | Cards **"Yes, please."** / **"No, thank you."** |
| 9 | Linh EN | "Here you go." |
| 10 | Turn | Card **"Thank you!"** · passes on thank, thanks |
| 11 | Linh EN | "You're welcome!" |
| 12 | Pip EN | "One box done! Thank you!" (a box unpacks) |

**Chapter 3 · Again, please** (the two lifesavers, and the call honours them)

| # | Who | Line or turn |
|---|---|---|
| 1 | Linh VI | "Mình chỉ bạn hai câu cứu cánh. Không nghe kịp thì nói: Sorry? Again, please. Người ta nói nhanh quá thì nói: Slowly, please. Ở Natterwick, ai cũng sẽ nói lại cho bạn." |
| 2 | Linh EN | "Sorry? Again, please." (the model) |
| 3 | Turn | Card **"Sorry? Again, please."** · passes on sorry, again, pardon, repeat |
| 4 | Linh EN | "Slowly, please." (the model) |
| 5 | Turn | Card **"Slowly, please."** · passes on slow, slowly |
| 6 | Pip EN | "Ooh, I found my snacks and my map and my notebook!" (fast on purpose, 11 words, the only long line in the path) |
| 7 | Turn | Cards **"Sorry? Again, please."** / **"Slowly, please."** · the call replays Pip's line slower (section 5) and the turn passes |
| 8 | Pip EN | "Snacks. Map. Notebook!" |
| 9 | Linh EN | "See? It works. Every time." |
| 10 | Turn | Card **"Thank you!"** |
| 11 | Linh EN | "Use it every day. Bye!" |

**Chapter 4 · Bus 45**

| # | Who | Line or turn |
|---|---|---|
| 1 | Linh EN | "This is the bus stop." |
| 2 | — | Task card (text): "Nghe số, rồi chọn thẻ và đọc to." |
| 3 | Bea EN | "Morning! This is Bus forty-five." |
| 4 | Linh EN | "Which bus? Forty-five or fifty?" |
| 5 | Turn | Cards **"Forty-five."** / **"Fifty."** · 45 passes; 50 gets a pool "Again?" and the line replays |
| 6 | Bea EN | "The next bus is at nine." |
| 7 | Linh EN | "What time? Nine or ten?" |
| 8 | Turn | Cards **"Nine."** / **"Ten."** |
| 9 | Bea EN | "Tickets are two dollars each, love." (Bea's normal pace) |
| 10 | Turn | Cards **"Sorry? Again, please."** / **"Two dollars."** · both pass; "again" replays it slower |
| 11 | Linh EN | "How many tickets? One or two?" |
| 12 | Turn | Cards **"Two, please."** / **"One, please."** |
| 13 | Bea EN | "Two tickets. Here you go!" |
| 14 | Turn | Card **"Thank you!"** |
| 15 | Bea EN | "Lovely. See you, love!" |

**Chapter 5 · Mei's café** (meet Mei before her bad news)

| # | Who | Line or turn |
|---|---|---|
| 1 | Mei EN | "Hi! Welcome to my café!" |
| 2 | Turn | Cards **"Hi!"** / **"Hello!"** |
| 3 | Mei EN | "I'm Mei. Tea or coffee?" |
| 4 | Turn | Cards **"Tea, please."** / **"Coffee, please."** |
| 5 | Mei EN | "Kaya toast too? Yes or no?" |
| 6 | Turn | Cards **"Yes, please."** / **"No, thank you."** |
| 7 | Pip EN | "[whispers] Ask her: how much?" |
| 8 | Turn | Card **"How much?"** |
| 9 | Mei EN | "Three dollars, please." |
| 10 | Turn | Cards **"Here you go."** / **"Thank you!"** |
| 11 | Mei EN | "Thanks lah. Enjoy!" |
| 12 | Mei EN | "[sighs] Okay. Back to work." |
| 13 | Pip EN | "[whispers] Mei looks tired." |

**Chapter 6 · About me** (Pip writes a page about you; the letter arrives)

| # | Who | Line or turn |
|---|---|---|
| 1 | Pip EN | "I'm writing a page about you!" |
| 2 | Linh EN | "I'm from Vietnam. And you?" |
| 3 | Turn | Card **"I'm from …"** with chip **"I'm from Vietnam."** · passes on from (their own town is welcome) |
| 4 | Gen Pip | Repeats their place, delighted, 6 words at most ("From Hanoi! Writing it down.") |
| 5 | Linh EN | "I work at the library. And you?" |
| 6 | Turn | Cards **"I'm a student."** / **"I work in an office."** · passes on I'm a, I work, or any job word |
| 7 | Gen Pip | Repeats their job ("A teacher! Wow!") |
| 8 | Pip EN | "I like snacks! And you?" |
| 9 | Turn | Cards **"I like coffee."** / **"I like music."** · passes on like |
| 10 | Gen Pip | Reads its page back in three bits: their name, their place, what they like |
| 11 | Linh VI | "Giỏi lắm! Bạn sẵn sàng rồi đó. Mai mình gặp nhau ở quán của Mei nhé." |
| 12 | — | Dusk: the letter under the café door (the existing `dusk_letter` beat) |
| 13 | Pip EN | "Look! A letter at Mei's café!" |

**Shared lines** (used across all chapters and the week-1 Visitor turns)

| Use | Lines |
|---|---|
| Praise (after a pass) | Linh "Great!", "Yes!" · Pip "Great!", "Yes!" · Mei "Great!" · Bea "Lovely!" |
| Okay / again | Linh "Okay!", "Again?" · Mei "Okay!" · Bea "Right!" |
| Before a slow replay | Linh "Sure. Slowly:" · Pip "Okay! Slowly:" · Mei "Sure, sure." · Bea "Course, love." |
| Linh's help (VI) | "Mình nói cùng nhau nhé." (say it together) · "Bạn thử nói bằng tiếng Anh nhé, nhìn thẻ gợi ý đó." (after a Vietnamese answer) |
| Skip | Linh "That's okay!" |

---

## 5. How the call works at this level

### 5.1 The scaffolds

| Scaffold | What the learner sees and hears | Built from |
|---|---|---|
| **Say-this card, from the start** | The English to say on a card above the mic, Vietnamese under it, before the learner has to wonder. Tap the card to hear it | The hint card (`call-cards.tsx`) and the `hint` frame; shown at once instead of after a pause |
| **Two cards to choose from** | Two cards side by side ("Tea, please." / "Coffee, please."); read either aloud. In week 1 the second card is a slightly longer version, so a learner can stretch when ready | `ChoiceChip`; the `hint` frame gains a list of choices |
| **Model, then ask** | The character says their own answer, then asks ("I'm Linh. And you?") | Writing rule for every Visitor line and the Visitor prompt row |
| **Listen, then repeat** | The model line is a recording; the card is the same words | Recorded lines plus a `learner` beat |
| **Pip copies you** | After you pass, Pip says it too | A recorded line after the turn |
| **Vietnamese from Linh** | A spoken Vietnamese line at the start of each new kind of task (chapters 1–3, 6); a Vietnamese task card after that | Recorded lines (Linh's voice speaking Vietnamese); a `ui` beat for the text card |
| **Slow speech** | Recorded at the slowest render speed, short lines with real gaps; live lines at the Visitor row (section 6) | Per-line `speed` in `lines.json`; stage speech settings; phrase breaks |
| **Generous passing** | Any try with the right word passes, and the listener says it back properly (a silent recast). Two tries with any English word pass too. Vietnamese, silence or noise never count against you | A word match on the transcript, no language-model judge (cheaper, and the reaction plays at once) |
| **"Again" and "slowly" always work** | Say "Sorry? Again, please" or "Slowly, please" (or tap the two small pills above the mic, "Nói lại" and "Chậm thôi") and the character replays the last line, slower for "slowly". Never counts as a try. **Honoured at every stage, not only Visitor** | A word match on the transcript; the replay is the same text through live TTS at a slower speed (so no app build is needed) |
| **Skip** | After one try, a quiet "Bỏ qua" pill. Linh says "That's okay!" and the scene goes on | A runner exit that moves on without a fallback line |
| **What you said** | The after-call card at Visitor lists the learner's own sentences ("Bạn đã nói được: Hi! I'm Lan. Nice to meet you, too.") and the phrase seed. No fix, no score | The after-call card; the transcript, no summary job needed |
| **No corrections** | Error targets start at Newcomer. At Visitor everything is recast | `onTargetError: 'accept'` for Visitor beats |

What the call **doesn't** do at Visitor: no timer rings, no turns over 8 words from a character, no open questions without cards, no English-only nudges, no "What does that mean?" in English first (Visitor gets Vietnamese first).

### 5.2 Passing, step by step

1. The transcript contains one of the beat's words (lower case, punctuation off, numbers as digits or words, common mis-hearings like "high" for "hi"): **pass**. Praise line, Pip copies or the scene goes on.
2. It has at least one English word but none of the beat's words: the listener says "Again?" and the model line plays again. On the second such try: **pass**, and the listener says the right line.
3. Vietnamese, noise or nothing: no try counted. Once per chapter Linh says (VI) "try it in English, look at the card". The card's "hear it" glows.
4. "Again" or "slowly" (said or tapped): replay, no try counted.
5. "Bỏ qua" after the first try: move on.

### 5.3 Recorded lines must be slow

The current recordings run 107–188 wpm because they render at speed 0.92 with voices designed for natural pace. Visitor lines render at the floor speed (0.7) with a slow-delivery direction tag tried in the audition, each short sentence its own clause. **Gate: every Visitor line measures 100 wpm or slower from its timing file**, checked by a script in the voice lane; lines that fail are re-rendered or split.

---

## 6. A new stage below Newcomer: Visitor

**Yes, add a stage.** The stage already drives everything this path needs: speech speed and phrase breaks, sentence length in the persona prompt, when hints show, whether hints carry Vietnamese, which beats play (`minStage`/`maxStage`), and Pip's stage. A "beginner flag" next to Newcomer would have to repeat each of those switches. As a stage, week 1 gets its easier turns from the same beat ranges it already uses for Neighbour and Regular, and future episodes add a Visitor row the same way.

The Visitor row of the cast bible's stage table (the story lane writes it into `cast-bible.md` and `journey-and-story.md` §1.1):

| Stage | CEFR | Words/min | Sentence length | Idioms | Interruptions | Hints | Live TTS speed | Phrase break | Max words a turn |
|---|---|---|---|---|---|---|---|---|---|
| **Visitor** | A0–A1 | ~85 | one short sentence; model, then ask | none (one "lah", one "love") | never | say-this card and choices from the start; Vietnamese task card | 0.7 | 0.5 s | 8 |

What changes in `packages/domain`:

- `STAGES` (in `packages/contracts`) gains `visitor` first. Everything keyed by stage gets a Visitor row.
- The residency card's "Chặng N/5" counts from Newcomer; a Visitor's card shows no number.
- Pip's English: at Visitor, Pip is a Visitor too (learning alongside, copying you). For Newcomer and up, Pip stays at least Newcomer, as now.
- Gloss policy: line glosses shown, meaning answers Vietnamese first.
- `adjustStage('newcomer', 'too_hard')` offers Visitor (today it only changes pace).
- New can-dos, one per chapter: say hello and your name · answer yes or no politely · ask someone to say it again or slower (already in `journey-and-story.md` §1.2) · understand a number, a time and a price · order one thing · say where you're from and what you do.
- New phrases (seed packets), one per chapter: "Nice to meet you" · "Yes, please" · "Sorry? Again, please." · "Slowly, please." · "How much?" · "I'm from …".
- The placement rule (section 2.1) and the stage-up rule (section 2.2) as pure functions.
- The day clock: week 1's days count from the day the letter arrives, not the install day. For Newcomers the two are the same day.

---

## 7. Week 1 for Visitors

Same story, same scenes, same recordings where possible; each hard turn gets a Visitor version (`maxStage: 'visitor'`) and each Newcomer-only beat gets `minStage: 'newcomer'`.

| Day · beat | Newcomer (today) | Visitor |
|---|---|---|
| 2 · Pip whispers "Can you ask her what's wrong?" | Ask in your own words | Card **"What's wrong?"** from the start; passes on wrong, okay |
| 2 · Mei deflects ("nothing lah") | Ask again or offer help | Skipped: Mei shows the letter |
| 2 · "What does rent mean?" | Explain the word | New Pip line "Rent… is it bread? Or money?" · cards **"It's money."** / **"It's money for a home."** |
| 2 · "Can you call them for me? My English goes funny…" | Agree | New Mei line "Can you call them? Please?" · cards **"Yes, I can help."** / **"Okay!"** |
| 2 · Office: "Who's calling, please?" | Introduce yourself and say you're calling for Mei | Office (live, Visitor row) asks in 5 words · cards **"I'm {name}."** / **"I'm {name}. I'm calling for Mei."** · new Visitor turn after the Friday meeting: card **"Thank you. Bye!"** |
| 2 · "Okay. So… what do I do?" | Give one piece of advice | Cards **"Go on Friday."** / **"I think you should go on Friday."** |
| 3 · Linh's postcard about describing words | As is | New postcard line: "Remember: Sorry? Again, please. It always works!" |
| 3 · Pip's story | Tap lines for Vietnamese | The same, with Vietnamese shown under each line |
| 4 · Introduce yourself in 30 s, twice | Timer ring | No timer. Three short turns from Chapters 1 and 6 ("Hi, I'm …", "I'm a … / I work at …", "Nice to meet you."), then once more all together from one card: the learner's first three-sentence run. Pip tries it back |
| 5 · Pass it on, 90/60/45 s | Talk about your day | 30/25/20 s, the frame "Today I … / I went to … / I'm …" as English cards (no Vietnamese, as the Pass it on rule says); every round passes when the timer ends |
| 5 · Keepsake | Pip's certificate | Linh hands over the Newcomer residency card, if the stage-up rule is met (section 2.2) |
| 6 · Fix Pip's "Can I helping you?" | Frame after a pause | Card **"Can I help you?"** from the start |

Episodes 2–6 are Release 2 content. **Their scripts need a Visitor row too** (the "How one scene scales by stage" table in `journey-and-story.md` §2.4 gains a line). Until they have one, a Visitor who stays past week 1 plays them at Newcomer with "slower" on.

---

## 8. Content budget

### 8.1 Recorded lines (ElevenLabs)

| Group | Lines | Of which Vietnamese | About characters |
|---|---|---|---|
| Chapter 1 | 8 | 2 | 295 |
| Chapter 2 | 8 | 1 | 170 |
| Chapter 3 | 7 | 1 | 330 |
| Chapter 4 | 9 | 0 | 240 |
| Chapter 5 | 8 | 0 | 195 |
| Chapter 6 | 6 | 1 | 205 |
| Shared lines | 17 | 2 | 190 |
| Week 1 Visitor lines (rent, call them, postcard) | 3 | 0 | 110 |
| **Total** | **66** | **7** | **about 1,750** |

By voice: Linh 32 (7 in Vietnamese), Pip 16, Mei 10, Bea 8. No new voices. Eleven v4 bills about one credit per character; with a full retake of every line and a 3-line audition of Linh speaking Vietnamese, **under 5,000 credits** (the account had about 50k left this cycle). Run `yap_voice.py estimate` before rendering. Until a line is recorded the call speaks its text with the live voice, so building doesn't wait for rendering.

### 8.2 Art

**No new art.** Scenes: burrow, day-one burrow, bus stop, café, burrow at dusk (all in `@yapling/art`). Cast: Linh, Pip, Mei, Bea in their existing moods. New UI only, from existing components: the two-card choice (`ChoiceChip`), the two small replay pills (glass pills), the Vietnamese task card (glass card), the Visitor stamp on the residency card (text).

### 8.3 Vietnamese copy for review

| Kind | About strings |
|---|---|
| Spoken Vietnamese lines (Linh) · **review before recording** | 7 |
| Glosses of the new English lines | 59 |
| Card and chip glosses (many repeat: Yes, No, Thank you) | 50 |
| Task cards in the calls | 25 |
| App chrome: level question, Visitor card, "too hard" sheet, burrow chapter cards, five knocks, call pills and skip, Visitor after-call card, stage-up moment, Me rows | 66 |
| **Total** | **about 207** |

---

## 9. What success looks like in the next learner test

Recruit **3 true beginners** (self-rated 1–2) alongside **3 testers like the first round** (2–3). Beginners play day 1, Chapters 1–6 and the day-2 café call (about 1 h 15 min with the test menu hopping days).

| # | Measure | Pass | Where it comes from |
|---|---|---|---|
| B1 | Beginners finish Chapter 1 without the moderator's help | 3 of 3 | Notes, call records |
| B2 | Beginners finish all six chapters and the café call | at least 2 of 3 | Call records (scene ended `complete`) |
| B3 | Beginner turns that pass within two tries, without "Bỏ qua" | at least 70% | Turn log (`outcome` per turn) |
| B4 | Time from a chapter's first question to the learner's first spoken word | median under 10 s | Turn log timestamps |
| B5 | Beginners who say "again" or "slowly" (spoken or tapped) on their own after Chapter 3 | 3 of 3, at least once | Turn log |
| B6 | Chapter length | median 2–3 min, none over 4 | Call records |
| B7 | Placement routes testers correctly | every self-rated 1–2 tester ends up Visitor (by choice or rule); no self-rated 3 tester is made a Visitor without choosing it | Profile stage after day 1 |
| B8 | Beginners leave a call because it's too hard | 0 | Exit reason on the call's exit sheet |
| B9 | "Mình nói được tiếng Anh" after the session (1–5) | at least 4 from 2 of 3 beginners | Survey |
| B10 | Nobody says they felt stupid, embarrassed or tested | 0 mentions | Interview, coded |

Kill signal: two or more beginners stuck in Chapter 1 or 2, or any beginner reading the cards in silence instead of aloud. That would mean the cards need a stronger "read it aloud" cue (Linh says it with them), not more content.

---

## 10. Decisions I need from you

| # | Decision | My recommendation |
|---|---|---|
| 1 | **Linh speaks Vietnamese out loud** (7 recorded lines; until now nobody in the cast speaks Vietnamese, it's only on screen). Per market she'd be re-recorded in that market's language, as her English lines already are | Yes, only in Settling in, only at the start of a new kind of task. Approve after hearing a 3-line audition of her designed voice in Vietnamese; if it doesn't sound native, keep the 7 lines as text cards instead |
| 2 | **Settling-in calls don't use live minutes, and the generous first-week hour starts on the day the story starts** (not the install day). The chapters cost little: mostly recorded audio and word matching, few model calls | Yes. Otherwise a beginner spends their best free week before the story starts and meets the 10-minute week right at Mei's café |
| 3 | **Spend about 5,000 ElevenLabs credits** on 66 slow-delivery lines, and re-brief the voices for slow delivery if the audition still runs over 100 wpm | Yes. It's about a tenth of what's left this cycle |
| 4 | **The new stage's name: "Visitor" / "Khách mới đến"**, shown on the card and in the Me sheet | Visitor. It fits arriving on the ferry and makes the Newcomer card a real arrival moment |
| 5 | **Bea and Mei appear before week 1** (Bea at the bus stop, Mei at her café before the letter) | Yes. It's a softer first meeting, and Mei being tired in Chapter 5 sets up the letter |
| 6 | **The next learner test includes 3 true beginners** (self-rated 1–2), which means changing the screener in `learner-test.md` | Yes. The friend's result is one data point; three beginners tell us if this works |
