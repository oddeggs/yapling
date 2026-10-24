# Yapling, again: the design brief

Decided with the founder on 24 Oct 2026. This brief replaces the v1 app's look, home screen, day/week calendar and pre-scripted storyline. Wherever it contradicts `concept.md`, `journey-and-story.md`, `every-week-loop.md`, `story-engine.md` or `design-review.md`, this brief wins. The cast, Natterwick, the voices, the live-call pipeline and the product rules in `CLAUDE.md` stay.

References:
- Living prototype: https://claude.ai/artifact/CeLA1Wdb8kGbGQzMc3H24X
- Cast sheet: https://claude.ai/artifact/7CMDjfjU4t8naPyo57JPfd
- Proposal: https://claude.ai/artifact/Cj8Lyq534toJnVopovCCRf
- Director test: `spikes/director/REPORT.md` on branch `spike/director`

## 1. What Yapling is

You open the app and walk into a moment that was already happening in Natterwick, a quiet parallel town that runs on your own clock. At 7 am Mei is raising the café shutters; at 1 am Pip is asleep on the sofa and wakes up with a yawn. Someone there needs you to talk: Pip wants to learn a word, Hank wants a deal, Bea has a story that won't fit before the next stop. You talk back out loud, hands-free, and the conversation goes wherever you take it. Behind it, a story director quietly works out how well you speak and what you care about, and writes the next moment for you. Each conversation ends as a small painting with a title, and the paintings you keep become your journey.

## 2. Principles

1. **Quality first.** Choose models, voices and craft by how good they are. Price the app high enough to pay for that. Cost work comes later.
2. **Minimal on purpose.** One scene, one voice, one control. Everything that isn't the moment stays hidden until asked for. If a screen needs explaining, it's wrong.
3. **A living world, not a lesson list.** No days, weeks, units or calendar gates. The learner goes as far as they want; the town keeps its own time.
4. **The learner talks most.** Character turns stay short at the learner's level. Silence is fine; nobody hurries them.
5. **Inspired, never copied.** We learn from smallwhitemonster's composition, colour and loneliness turned tender. We don't use their characters (white long-eared creatures, black cats, skeletons), their compositions or their cigarettes.
6. **The product rules don't bend:** nothing dies and no guilt, never sell care, always AI, the learner talks most, accents are voices and never jokes.

## 3. The look: painted dusk

**Composition.** Each place has one muted colour field (dusk mauve, night blue, deep teal, oxblood, grey snow), a low horizon, haze, and two to four props. The figures are small in a big empty space. There is one small signal red in every frame: a neon 45, the sofa, Pip's scarf.

**Light follows the real clock.** Every place is painted live from nine keyframes of light: night, before dawn, dawn, morning, noon, afternoon, golden hour, dusk and blue hour. The sky, the ground, the shadows, lamps switching on and the critters' shading all come from the same light. Weather and season add variants.

**Paint, not vector.** Soft gradients only inside the painting (sky, haze, glow), never on UI. A matte grain and a faint canvas weave sit over everything, with a gentle vignette. No outlines on critters or props: shapes are made by tone, rim light and soft shadow.

**Colour.** The UI uses three colours: near-black `#09080b`, bone `#f0ebe2` and ember `#ff5b45` (used only for "you are speaking" and the one red thing). Each scene brings its own field colour; the UI never adds more.

**Type.** Spoken words are set in Newsreader (a book serif with Vietnamese), large, like a caption in a film. Painting titles use Newsreader italic in curly quotes ("‘Out Like A Light’"). Everything else is SF Pro, small, tracked capitals for labels ("THE BURROW · 11:24 PM").

**iOS 27.** The one control is native liquid glass (blur, saturation, inset highlight, a slow sheen) floating over the painting. Sheets are native sheets. Haptics are soft and rare: a tick when the control morphs, a gentle thump when a painting is kept.

**Motion.** Everything moves on springs, never on linear or ease curves. The camera eases in towards whoever is speaking and drifts back out after. Scenes change with a soft blur and slight zoom, like a breath. Words arrive like paint (§5). Nothing bounces for fun; every movement has a reason.

## 4. The living world

- **The town keeps a timetable.** The 45 comes at :00, :20 and :40. The café opens at 7. Windows light up one by one at dusk. Passers-by cross the field (Mags walking home, gulls, a delivery otter). None of it needs the learner.
- **The cast have routines.** Each character has an hourly day: where they are and what they're doing. That's where you find them, and it's what the talk opens with.
- **Things happen while you're away.** The director writes small off-screen events (Pip tried to bake bread, a postcard came, the bus broke down). You come back to traces (a burnt loaf, a letter on the table), and asking about them becomes the lesson.
- **About 100 places at launch.** Each place is a recipe: colour field, horizon, light source, two to four props, who is usually there and when, and its sound. Every recipe gets all nine lights for free, plus weather and season variants. The proposal lists the first 100 by area.
- **Every place sounds like itself.** ElevenLabs music for each mood (a day loop and a night loop per area), an ambience loop per place, and effects for the town's events (the bus brakes, the café bell, rain). The mix follows the light and ducks under speech. Sound is off until the learner taps once.

## 5. Talking

- **Hands-free, always.** In a scene the microphone is open. The learner speaks; the character hears them. Turn-taking stays patient: long pauses mid-sentence keep the turn, silence never ends one, and a tap on the scene ends it at once. (This is v1's hands-free mode, which already ships.)
- **Live captions both ways.** The learner's words appear as they speak: grey while still being heard, white with a soft flash once final. The character's words sweep in with the voice, each word unblurring and rising slightly, in warm ink that dries to bone. Vietnamese sits small underneath when the learner wants it (a setting, and on by default for Visitor).
- **Help by voice.** "Again", "slower", "what does … mean?" or "tiếng Việt" makes the character repeat, slow down or explain, in character. No help buttons.
- **One control, three states.** A single glass piece at the bottom morphs: a quiet hint when idle ("Tap for sound" or "Just talk"), an ember that breathes with the learner's voice while they speak, and, when the scene is tapped, three choices: say it again (redo your last line), pause (the world keeps going, the talk waits) and menu.
- **Each conversation is a painting.** It opens with a wry title ("‘Waiting For The 45’") and closes with another ("‘Will You Wait With Me?’"), plus the date: "Kept · 24 Oct". The closing title is what the learner keeps.
- **Thinking is never dead air.** While the learner thinks, the character listens: ears up, a head tilt, a slow nod. While the reply is coming, the character glances up or away, as people do.

## 6. The cast

Pip (red panda), Linh (pangolin), Mei (otter), Sol (tarsier), Hank (raccoon), Nell (koala), Bea (bulldog), Dex (bison) and Mags (heron), as in `cast-bible.md`: same names, personalities and voices, repainted.

- **One soft body.** Each critter is a single painted silhouette from ears to feet that bends, squashes and turns. It is never assembled from circles, and it has no outlines. Ears, eyelids, arms, tail and one signature accessory (Pip's red scarf, Mei's apron, Bea's cap) hang off it on springs, so motion follows through instead of sliding.
- **No mouths.** Characters talk with their bodies: a small bend or nod on each beat of their voice, ear flicks, a raised paw for questions, a little hop on "!", a look away on "…". The voice is the mouth.
- **Painted, lit by the scene.** Flat fill, a soft shade on the side away from the light, a rim light from the place's light source, and the same grain as the scene. At night they glow faintly in lamp light.
- **The motion set:** breathe, blink, listen (lean in, tilt, nod along), think, talk (voice-driven beats), laugh, surprise, wave, walk in and out, sit, sleep (melt into a loaf, spring back up), plus one signature habit each (Mei wipes the counter, Hank shuffles cards, Sol checks a clipboard).
- **Model sheets** for each main character: front, three-quarter and side views; six expressions made with eyes, ears and posture only (happy, curious, worried, laughing, sleepy, surprised); species details that read at small size (Pip's tear marks and ringed tail).

## 7. The journey: an AI director

The pre-written seasons, weeks and beginner chapters go. Every conversation is planned for this learner by a director agent. It works from the Yapling world bible, the level guide (CEFR, never shown) and what it has inferred about the learner from talking with them. It never asks for any of that up front.

**The loop, per conversation:** plan (director) → check (Jev questions and code) → play (live call, Haiku in character) → judge (learner model and story memory) → plan the next one.

**Models.** Opus 5.5 plans the next conversation in the background as soon as a call ends (about 40 s). If the learner starts again before it's ready, Pip fills the gap with a free moment in the burrow, which needs no plan. Haiku 5.5 plays the characters live. Haiku judges after each call; Sonnet writes the feedback and memory items, as in v1.

**Rules the director test proved** (see the report):
- **Start low, climb.** The first conversation opens at Visitor level with two-choice questions. After the learner's second reply, code switches the actor to a simple lane (8-word lines, choices to repeat) or a rich lane (open why and how questions). A strong learner shows themselves in one reply; a beginner never drowns.
- **Doors.** Until we know three of the learner's interests, every conversation has one moment where the story needs something from their life (what they'd order, what their job is like, what they're good at). Beginners get two concrete choices plus "or something else?".
- **At most two open storylines.** A thread closes before a new mystery opens. A familiar face is in every scene, and any mystery is re-explained in the first two lines.
- **One beat at a time.** The live actor sees only the current beat. It moves on when the beat's goal is met (a Jev question), not on a turn count.
- **Level is a range.** The judge reads each conversation on its own, gets plain counts from code (turn length, lost turns, Vietnamese use), and decides B1 or B2 by grammatical control, not length. The level is held as plus or minus one band. The live lanes correct the rest during the call. Tune the judge on the first 20 to 30 real transcripts.
- **Safe stakes.** Cosy mysteries only: no darkness, danger, police or creepy objects. Real teams, brands and people become Natterwick versions. Jev checks plans and calls for frightening stakes and for characters answering on the learner's behalf.
- **Voice.** Only Bea says "love", once a scene. Pip says "I". No stage directions in speech.

**Progress the learner can feel.** Not points. The wall of paintings grows. Pip uses the learner's own words back to them weeks later. Can-dos ("You ordered and changed an order", "You pushed back on a deadline") appear on the closing painting when the judge sees them. A monthly voice capsule plays day 1 next to today.

## 8. Free and paid

- **Measured in live minutes, never days.** Nobody waits for tomorrow to see what happens next.
- **Free is a real taste.** A new learner gets enough live time to finish several whole conversations, feel understood and learn something they can name. We size it from the first learner test, not from cost: start with 20 minutes a day for the first 7 days, then 10 minutes a day. Everything that costs no AI is free and unlimited: the wall, replaying any kept painting with its transcript and audio, and the learner's words.
- **Plus is the full experience at a premium price:** generous daily live time, every place and character, the monthly capsule. The founder sets the price. No streaks, no loot boxes, no paid care; cosmetics come later under the existing shop rule.
- **Running out is kind.** At 60 seconds left the character wraps the scene up in character, and the painting is kept. The paywall is one quiet sheet, never a wall in the middle of a sentence.

## 9. Screens

The app is almost one screen.

1. **First open.** No onboarding wall: the app opens straight into the burrow at the real time, with Pip. Pip asks the learner's name and one easy question, and the microphone permission is asked for when Pip first waits for an answer, with one line of why. Sign in with Apple is offered later, after the first painting is kept.
2. **The scene** (hero): the painted place, the critters, the captions, the one glass control. Most of the app is here.
3. **The control's three states:** idle hint, listening ember, and the three choices (say it again, pause, menu).
4. **Paused:** the world keeps moving, the talk waits, one "Go on" control.
5. **Painting titles:** the opening title over the scene, and the closing card ("Kept · date", the can-dos seen, one line Pip learned from you).
6. **Menu sheet:** the wall, your words, settings, Plus. It also shows where the town is right now ("Mei is at the café"), so the learner can go somewhere else instead of the director's pick.
7. **The wall:** kept paintings as a quiet grid of small frames. Tap one to replay it: the painting, the transcript with audio, and the Vietnamese.
8. **Your words:** phrases the learner has used, grouped by when they were first said, each with the line it came from. Free practice with no AI (listen and repeat with the recorded voice).
9. **Settings:** Vietnamese captions, sound, hands-free sensitivity, memory (everything the characters remember about you, editable and deletable), account and deletion.
10. **Plus sheet** and the kind running-out moment.
11. **Safety sheet:** stepping out of character with the country's helpline numbers, as in v1.

Not in the app: home dashboard, town map, calendar, weekly ring, streaks, badges, a lesson list, an onboarding quiz, a level test.

## 10. Tech: what stays, what changes

**Stays:** Expo 58, React Native, Reanimated worklets, Skia; Hono on Workers with `CallDO` and `UserDO`, D1, R2 and Queues; the live cascade (Scribe v2 Realtime → Haiku 5.5 → ElevenLabs Flash with the cast voices), its latency budget and the hands-free turn-taking; Jev for checks; Better Auth (guest first, Sign in with Apple); RevenueCat; PostHog and Sentry; the i18n catalogues; the safety classifier.

**Changes:**
- **Art.** The painted renderer from the prototype is ported to Skia: places as recipe data plus a light model, and critters as one deformed silhouette with springs and chains. The v1 SVG generators, mouth shapes and viseme scheduler are retired.
- **Story.** `@yapling/story` seasons give way to a director service (plan, check, judge, memory) and the world bible as data. Recorded lines remain only for the small fixed set: greetings, wake-ups and help phrases.
- **Learning model.** `@yapling/domain` keeps stages, can-dos, phrases and the minute ledger, and drops the week, the ring and the calendar.
- **Time.** A town clock module gives the light, the timetable and the cast routines for any minute, on the phone and on the server, from the same data.
- **Sound.** Music and ambience are rendered once with ElevenLabs and bundled or streamed, and mixed on the phone with `react-native-audio-api`.

## 11. The first build

A vertical slice the founder can hold. It's done when, on a phone:

- The app opens into the burrow at the real local time, painted with the right light, with Pip breathing, blinking and dozing at night.
- Pip greets the learner by voice, and they have a real hands-free conversation with live captions both ways, help by voice, and the one control.
- The conversation was planned by the director for this learner, and the second one picks up something from the first.
- It ends with a closing painting that is kept on the wall and can be replayed.
- A second place (the bus stop, with the 45 on its timetable) can be visited from the menu.
- Sound follows the light; the minute ledger counts and the free allowance applies.
