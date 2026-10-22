# Yapling: learner test kit

_v0.1 · 22 Oct 2026 · Release 1 (First Week), Gate 3 · build: TestFlight "Yapling Dev" (`studio.oddeggs.yapling.dev`)_

The founder's kit for 5–8 moderated sessions. In each one a Vietnamese working professional plays day 1 to day 8 of the first week in one sitting, with the test menu moving the app from day to day. Inputs: `docs/prompts/claude-design-prototype.md` ("What we're testing"), `docs/concept.md`, `docs/journey-and-story.md` §1, `docs/season-1-script.md` (Prologue, Episode 1), `design/README.md` (d1–d8), `docs/undesigned-states.md` and the test menu in `apps/mobile/src/features/devmenu/`.

Vietnamese in this kit is a first draft. Every block marked **[VI review]** needs a native reviewer before the first session.

## At a glance

| | |
|---|---|
| Sessions | 6 booked + 2 spare (5 is the minimum to read anything). One dry run with a friend first |
| Length | About 1 h 45 min of session; book 2 h per tester and leave 30 min between testers for the reset |
| Format | In person, one tester, one phone. The moderator runs the test menu; a second person takes notes if possible |
| Build | Yapling Dev from TestFlight, pointed at the dev API (`https://yapling-api-dev.bkdev98.workers.dev`) |
| Path | d1 onboarding and placement call → d2 Episode 1 call with Mei → d3 Pip's story and Linh's postcard → d4 teach Pip to introduce yourself → d5 Pass it on, ring full, keepsake → d6 voicemail and season map → d7 Plus paywall → d8 coming back |
| Product rules in the room | No guilt, always AI. The moderator never calls a slip "wrong", never pushes a tester to keep talking, and says plainly that every character is AI |

## What we're testing

The five questions from the prototype brief, plus three the build adds. Score each tester on them in the synthesis sheet (below).

| # | Hypothesis | Where it shows | Confirms | Kills |
|---|---|---|---|---|
| H1 | People understand Pip is a roommate learning English **from them**, not a teacher | d1 placement, d2 "What does rent mean?", d4 Pip tries the intro back, d6 fixing Pip's "Can I helping you?" | Most testers (≥ 75%) describe Pip as someone they help or teach, unprompted or at the d1 question; they correct Pip on d6 without being told to | Half or more describe Pip as a teacher, a quiz or a chatbot, or don't see why Pip asks them things |
| H2 | They actually speak out loud | Every live call (d1, d2, d4, d5, d6) | Most speak on every call at a normal volume with no nudge from the moderator after d1; answers get longer by d5 (learner talk time per call in the call records) | Half or more need a nudge to speak, whisper, give one-word answers through d5, or ask to type |
| H3 | Each day feels new | Questions after d3–d8; the burrow card changes every day | Most can name what was new on at least 5 of days 2–8 without help | Half or more say it's "the same every day", or can't say what changed |
| H4 | They want to come back tomorrow | d6 cliffhanger, d8 return, survey Q1 and Q9 | Most answer 4–5 to "open tomorrow" and give a reason that is the story, Pip or their own progress | Half or more answer 1–2, or would come back only "to practise" with nothing pulling them |
| H5 | The paywall feels fair | d7, survey Q5–Q8, interview Q8 | Most rate it 4–5 for fairness, can say in their words what Free keeps and what Plus adds, and no one feels tricked | Anyone thinks Pip, the burrow or the story will be taken away; half or more call it pushy or unclear |
| S1 | Live calls hold up for nervous speakers (latency, turn-taking) | Every live call | No tester is cut off mid-sentence more than once in the session; waits for replies feel normal to them | Two or more testers cut off repeatedly, or a call fails twice for two or more testers |
| S2 | Vietnamese help is there when stuck, without becoming a crutch | Tap-to-gloss on the letter and story lines, the "What does that mean?" chip, hints after silence | Stuck testers find the help themselves and get back into English | Testers stay stuck in silence, or read Vietnamese all the way through |
| S3 | Coming back carries no guilt | d8 (normal and after three days away) | Testers describe the return as warm or happy | Anyone says they felt guilty, scolded or pressured |

## Who to recruit

| | Want |
|---|---|
| Age | 22–40 (18+ is required by the app) |
| Work | Office professionals in Vietnam (IT, logistics, finance, sales, operations, hospitality) who use English at work or will need it soon: meetings, clients, interviews |
| English | Can introduce themselves but freeze in live conversation: self-rated 2 or 3 on the scale below (at most one 4) |
| Phone | Uses an iPhone daily (iOS 17 or later), so iOS itself isn't a distraction |
| Paying | At least 2 who paid for English learning in the last 12 months (app, course, tutor) and at least 2 who didn't |
| Mix | At least 2 women and 2 men; at least 2 on a Work-heavy job and 2 on a Life-heavy one (hospitality, customer-facing) |
| Exclude | Teachers of English; people in edtech, language apps, UX or market research; close friends of the team; anyone who has seen Yapling |

### Screener [VI review]

| # | Question (VI / EN) | Keep if |
|---|---|---|
| 1 | Năm nay bạn bao nhiêu tuổi? / How old are you? | 22–40 |
| 2 | Công việc hiện tại của bạn là gì, ở công ty loại nào? / What's your job, and at what kind of company? | Office or customer-facing professional |
| 3 | Bạn có làm trong giáo dục, dạy tiếng Anh, ứng dụng học ngôn ngữ hay nghiên cứu người dùng không? / Do you work in education, English teaching, language apps or user research? | No |
| 4 | Trong 3 tháng qua, bạn phải nói tiếng Anh trong những dịp nào? (họp, gọi khách hàng, phỏng vấn, du lịch, không có) / In the last 3 months, when did you have to speak English? (meetings, client calls, interviews, travel, none) | Any spoken use, or a clear need coming up |
| 5 | Bạn tự đánh giá khả năng nói tiếng Anh: 1 Gần như không nói được · 2 Nói được câu đơn giản · 3 Nói được nhưng hay bí từ · 4 Khá tự tin · 5 Gần như người bản xứ / Rate your spoken English: 1 Barely · 2 Simple sentences · 3 I can, but I often get stuck · 4 Fairly confident · 5 Near-native | 2 or 3 (one 4 at most) |
| 6 | Khi phải nói tiếng Anh trực tiếp, bạn cảm thấy thế nào? / How do you feel when you have to speak English live? | Any answer; note it for the session |
| 7 | Trong 12 tháng qua, bạn có trả tiền để học tiếng Anh không? Khoảng bao nhiêu mỗi tháng? / In the last 12 months, did you pay for English learning? About how much a month? | Balance the group |
| 8 | Bạn dùng điện thoại gì hằng ngày? / What phone do you use every day? | iPhone |
| 9 | Bạn có quen ai trong nhóm làm Yapling không? / Do you know anyone on the Yapling team? | No, or only loosely |
| 10 | Bạn có thể tham gia 2 tiếng tại [địa điểm] và đồng ý cho ghi hình màn hình và ghi âm không? / Can you join for 2 hours at [place], and agree to screen and audio recording? | Yes |

## Before each session

### Setup checklist

| | Check |
|---|---|
| Build | The test phone has the latest Yapling Dev from TestFlight (internal testing: the phone is signed in to an Apple ID that is a tester on the App Store Connect team). Note the build number on the notes sheet |
| Phone | A dedicated test iPhone if possible. **No passcode** for the session (testers must open the knocks from the lock screen; Face ID won't know them), or the moderator unlocks it each time. Charged, charger in the room. Low Power Mode off. Auto-Lock: Never. Focus and Do Not Disturb off, so knocks ring. Other apps' notifications off. Ring/silent switch on ring, volume about 70% |
| Audio | Speaker by default, as most people will use it. Wired EarPods (USB-C or Lightning) as the backup if the room is noisy or the character's voice seems to cut the tester off. Avoid Bluetooth earbuds: they add delay and switch to a weaker mic |
| Room | Quiet, closed door, no music or aircon roar near the phone. The tester sits; the moderator sits beside, not opposite (so you can see the screen) |
| Network | Stable Wi-Fi, and a 4G hotspot as backup |
| Backend | Open `https://yapling-api-dev.bkdev98.workers.dev/api/health` on the laptop: it must answer. Nobody deploys the dev Worker during a session. Optional: run `pnpm exec wrangler tail --env dev --format pretty` from `apps/api` to log each call's seconds, cost and timings |
| Recording | Screen and app audio, plus the room's voices (see founder questions). Test that both the character's voice and the tester's voice are audible in a 20-second sample |
| App state | Fresh first run, with fresh iOS permissions (see "Reset between testers"). The app opens on the language sheet and the corner label reads `dev · day 1` |
| Paper | Signed consent, the notes sheet for this tester, the survey (paper or a form on a laptop), the incentive |

### The test menu

Open it with a **three-finger tap anywhere** on the screen, or a **long press (about half a second) on the small `dev · day N` label in the bottom-left corner**. It opens as a sheet titled "Test menu", with "Close" at the top right. Its labels are in English for you; the previews follow the app's language. Testers should never see it: turn the phone towards you before opening it, and never open it during a call.

| Part | What it does |
|---|---|
| Status line | `Day 3 · <date> <time> · debug clock · installed <date>`. "real clock" when the app runs on the phone's time |
| JUMP TO DAY: 1–8 | Moves the app to that day of the first week, at the phone's current time of day. The corner label turns pink and reads `dev · day N` |
| Real clock | Back to the phone's time (keeps the toggle below) |
| Came back after 3 days | Treats the next open as a return after three days away: Pip's welcome back with the story so far, and day 8's knock becomes "You're back? I kept your seat warm." The label adds `· away` |
| LANGUAGE | Tiếng Việt / English for the app's chrome (learning content stays English). Keep Tiếng Việt for testers |
| KNOCKS: Day 2–8 | Shows that day's knock as the lock screen would. **Tapping the preview** jumps to that day and opens the burrow there, as a tapped knock would |
| Day N, a minute before its knock | Moves the clock to a minute before day N's scheduled knock; the real notification rings about a minute later |
| Fire day N's knock in 5 s | Rings today's knock in 5 seconds, even with the app open. None on day 1 |
| Ask for notifications | Shown only when notifications aren't allowed |
| SETTLING IN (LÀM QUEN): status | Where the learner is: settling in with N of 6 chapters done and the next one, or the letter's day |
| Start as a Visitor | Clears this phone's learner, makes a new one at Visitor (onboarding skipped, the name "Lan" unless one was typed) and opens the burrow with Chapter 1 next. Asks for notifications |
| JUMP TO CHAPTER: 1–6 | Marks the chapters before it done, one a day from the install day, and moves the clock to that chapter's day. Jumps go forward; to go back, start a new Visitor |
| Jump to the letter day | All six chapters done and the clock on Chapter 6's day: the letter comes that evening, and it is week 1's day 1 (JUMP TO DAY then counts from it) |
| SETTLING-IN KNOCKS: Chapter 2–6 | That chapter's morning knock as the lock screen shows it; tapping the preview opens the chapter's call. "A minute before its knock" jumps to the chapter and rings the real scheduled knock; "Fire … in 5 s" rings it now, and tapping it opens the call |
| RESET | Clears everything on this phone: the learner (signed out), the debug clock and the knocks, and goes back to the first run. The account stays on the server |

The day and the learner survive closing and relaunching the app. There is no way to seed a learner mid-week: each tester creates theirs on day 1. If a session is cut short, the phone keeps the tester's week; reopen the app and jump to where you stopped.

### The hop between days

Use this every time the script says **Hop to day N**.

1. Wait until the tester is back in the burrow with the day's thing done, and you've asked the day's questions.
2. Take the phone: "Mình tua sang hôm sau nhé." / "Let me move us to the next day."
3. Open the test menu. Under JUMP TO DAY tap **N**. Check the status line reads `Day N`.
4. Tap **Fire day N's knock in 5 s**. Tap **Close**.
5. Press the side button to lock the phone and put it face up in front of the tester.
6. Say the day's line (below). The knock lands within about 5 seconds; the tester opens it as they would at home.

If no knock appears (notifications declined on day 1, or a Focus mode): open the menu, tap the day's lock-screen preview under KNOCKS (it opens the app on that day), and read the knock aloud to the tester. Note that they declined notifications; don't change their choice.

The lock screen shows the real time, not the knock's morning time. Say "Coi như là buổi sáng nhé." / "Imagine it's the morning."

### Reset between testers

1. Finish the previous session's close (below): Cost page screenshot, data deleted.
2. Test menu → **Reset**. The app goes back to the language sheet.
3. Delete the app from the home screen and reinstall it from TestFlight, so iOS asks for the microphone and notifications again (the permission moments are part of the test). Reset **before** deleting: the guest's install id lives in the Keychain, which outlives a reinstall, and would bring the last tester's account back.
4. Open the app once: the language sheet shows and the label reads `dev · day 1`. Check the menu's status line says "real clock".

## Consent [VI review]

Read it aloud together, then both sign. Give the tester a copy.

### Tiếng Việt

**Đồng ý tham gia buổi thử nghiệm Yapling**

Yapling là một ứng dụng luyện nói tiếng Anh đang được phát triển. Trong buổi này (khoảng 2 tiếng), bạn sẽ dùng thử ứng dụng và trả lời vài câu hỏi. Chúng tôi kiểm tra ứng dụng, không kiểm tra bạn.

**Các nhân vật đều là AI.** Pip và tất cả nhân vật trong ứng dụng, kể cả giọng nói của họ, đều do AI tạo ra. Họ không phải người thật, đôi khi có thể nói sai, và không thay thế bác sĩ, nhà trị liệu hay luật sư.

**Những gì được ghi lại**

- Màn hình điện thoại và âm thanh của buổi thử: giọng bạn, giọng các nhân vật và cuộc trò chuyện với người điều phối.
- Ghi chú của người điều phối.
- Trong ứng dụng: khi bạn nói, giọng nói được gửi qua máy chủ của Yapling (Cloudflare) tới các dịch vụ AI để nhận diện lời nói, tạo câu trả lời và tạo giọng (ElevenLabs, Anthropic). Ứng dụng lưu bản ghi chữ của cuộc gọi, không lưu file âm thanh. Ứng dụng cũng ghi lại các bước sử dụng (ví dụ "đã xong cuộc gọi đầu tiên"), không kèm tên bạn.

**Chúng tôi dùng và giữ dữ liệu thế nào**

- Chỉ để cải thiện Yapling. Chỉ nhóm Yapling xem bản ghi.
- Khi trích lời bạn, chúng tôi không ghi tên bạn.
- Trong ứng dụng, bạn có thể dùng biệt danh. Đừng nói bí mật công ty hay thông tin cá nhân nhạy cảm.
- Cuối buổi, dữ liệu của bạn trong ứng dụng sẽ được xoá (máy chủ xoá trong vòng 24 giờ).
- Bản ghi hình và ghi âm buổi thử được xoá sau [90] ngày. Bạn có thể yêu cầu xoá sớm hơn bất cứ lúc nào qua [email].

**Quyền của bạn.** Bạn có thể dừng, bỏ qua bất kỳ phần nào hoặc rút lại sự đồng ý bất cứ lúc nào, không cần giải thích. Bạn vẫn nhận [quà cảm ơn] dù dừng giữa chừng.

- [ ] Tôi đã đủ 18 tuổi.
- [ ] Tôi đồng ý cho ghi hình màn hình và ghi âm buổi thử.
- [ ] Tôi đồng ý để Yapling trích dẫn lời tôi mà không ghi tên.

Họ tên: ______ Chữ ký: ______ Ngày: ______

### English

**Consent to take part in a Yapling test session**

Yapling is an English-speaking app in development. In this session (about 2 hours) you'll try the app and answer a few questions. We're testing the app, not you.

**Every character is AI.** Pip and every character in the app, including their voices, are made by AI. They are not real people, they can get things wrong, and they don't replace a doctor, therapist or lawyer.

**What is recorded**

- The phone's screen and the session's sound: your voice, the characters' voices and your conversation with the moderator.
- The moderator's notes.
- In the app: when you speak, your voice goes through Yapling's servers (Cloudflare) to AI services that recognise speech, write the replies and make the voices (ElevenLabs, Anthropic). The app keeps a text transcript of each call, not the audio. It also logs usage steps (for example "finished the first call") without your name.

**How we use and keep it**

- Only to improve Yapling. Only the Yapling team sees the recordings.
- If we quote you, we don't use your name.
- You can use a nickname in the app. Please don't share company secrets or sensitive personal details.
- At the end of the session your app data is deleted (the server deletes it within 24 hours).
- The session's screen and audio recording is deleted after [90] days. You can ask us to delete it sooner, any time, at [email].

**Your rights.** You can stop, skip any part or withdraw your consent at any time without giving a reason. You still receive [the thank-you gift] if you stop early.

- [ ] I am 18 or older.
- [ ] I agree to screen and audio recording of this session.
- [ ] I agree that Yapling may quote what I say without my name.

Name: ______ Signature: ______ Date: ______

## Session plan

| Time | Part |
|---|---|
| 0:00–0:08 | Welcome, consent, recording on, intro script |
| 0:08–0:25 | Day 1: onboarding, placement call, residency card, notifications, Linh at the door |
| 0:25–0:40 | Day 2: the Episode 1 call with Mei, after the call |
| 0:40–0:46 | Day 3: Pip's story, Linh's postcard |
| 0:46–0:55 | Day 4: teach Pip to introduce yourself |
| 0:55–1:07 | Day 5: Pass it on on Bus 45, ring full, keepsake |
| 1:07–1:13 | Day 6: Pip's voicemail, season map |
| 1:13–1:19 | Day 7: the Plus paywall |
| 1:19–1:25 | Day 8: coming back (normal, then after three days away) |
| 1:25–1:38 | Interview |
| 1:38–1:43 | Survey |
| 1:43–1:48 | Close: Cost page, delete data, incentive |

Each day's questions take 1–2 minutes and are included. If you run late, drop the second question on days 3, 6 and 8 first, then day 8's away part.

## Intro script [VI review]

Moderator lines are in Vietnamese; the English is for the team. "Bạn" is used throughout; switch to anh/chị if that suits the tester.

> VI: Cảm ơn bạn đã đến. Hôm nay bạn sẽ thử Yapling, một ứng dụng luyện nói tiếng Anh vẫn đang được làm. Mình kiểm tra ứng dụng chứ không kiểm tra bạn, nên không có đúng hay sai. Chỗ nào khó hiểu là lỗi của ứng dụng, và đó chính là điều mình cần biết.
> EN: Thanks for coming. Today you'll try Yapling, an English-speaking app we're still building. We're testing the app, not you, so there's no right or wrong. Anything confusing is the app's fault, and that's exactly what we need to find.

> VI: Bạn sẽ dùng tám ngày đầu tiên của ứng dụng trong khoảng một tiếng rưỡi. Mình sẽ tua thời gian: mỗi lần sang ngày mới, mình cầm máy một chút rồi đưa lại bạn.
> EN: You'll go through the app's first eight days in about an hour and a half. I'll fast-forward time: each new day, I'll take the phone for a moment and hand it back.

> VI: Tất cả nhân vật trong ứng dụng đều là AI, kể cả giọng nói. Đôi khi họ trả lời chậm hoặc nói sai.
> EN: Every character in the app is AI, voices included. Sometimes they're slow or get things wrong.

> VI: Bạn cứ dùng như khi ở nhà một mình. Nếu được, vừa dùng vừa nói ra điều bạn đang nghĩ, bằng tiếng Việt cũng được. Còn khi nói chuyện với nhân vật, bạn cứ nói tiếng Anh như bình thường.
> EN: Use it as you would alone at home. If you can, think out loud as you go, in Vietnamese is fine. When you talk to the characters, just speak English as you normally would.

> VI: Mình sẽ cố không giúp, vì muốn xem ứng dụng có tự rõ ràng không. Nếu bí quá, bạn cứ hỏi. Bạn có thể dừng hoặc bỏ qua bất cứ phần nào. Mình bắt đầu nhé?
> EN: I'll try not to help, because I want to see if the app makes sense on its own. If you're really stuck, ask. You can stop or skip anything. Shall we start?

When the tester asks for help, answer with a question: "Bạn nghĩ nên làm gì?" / "What do you think you'd do?" Help directly only after 30 seconds stuck, and note it as an assist.

## Day by day [VI review]

Each day lists what you do first, what you say, the task, the path the tester should take (buttons as the app labels them in Vietnamese), what to watch, and the questions after. "Watch" items are things you can see or hear; write them down with the time.

### Day 1 · Moving in (d1-splash → d1-linh)

**Before:** The fresh first run from the reset. The label reads `dev · day 1`.

> VI: Bạn vừa tải ứng dụng này về. Bạn mở nó ra và bắt đầu như bình thường nhé.
> EN: You've just downloaded this app. Open it and get started as you normally would.

**Task:** Set up the app and do whatever it asks.

**Path:** language sheet (Tiếng Việt) → name ("TÊN CỦA BẠN"; a nickname is fine) and "Mình đã đủ 18 tuổi" → "Bước xuống phà" → "{Pip} và hàng xóm là AI" → "Mình hiểu rồi" → choose a roommate and name it → "Dọn vào" → the day-one burrow, "Trò chuyện đầu tiên · khoảng một phút" and the "Cho phép micro" card → the iOS microphone sheet → the placement call: Pip asks a few simple questions about their job and day (hold the mic button to talk, "Lượt của bạn · giữ để nói") → "Xem thẻ cư trú" → residency card (Newcomer, three strengths, two first aims, "Dễ quá" / "Khó quá") → notifications ("Cho phép thông báo" or "Để sau", quiet hours) → Linh knocks, her welcome plays, the café at dusk → "Chúc ngủ ngon" → the burrow with no button (the day is done).

**Watch:**

- Time on the AI explainer: read, skimmed or skipped. Any comment about AI.
- Hesitation or a question before allowing the microphone.
- Whether they find hold-to-talk on their own, or tap and wait; how long until their first full sentence.
- Volume and length of answers in the placement call; any mid-sentence cut-off (note the time).
- Reaction to the strengths on the residency card; whether they tap "Dễ quá" or "Khó quá".
- The notifications choice, and whether they read the quiet hours.
- Anything they say about who Pip is.

**Ask after:**

> VI: Theo bạn, Pip là ai, và Pip ở đây để làm gì?
> EN: In your own words, who is Pip, and why is it here?

> VI: Lúc nói chuyện với Pip, bạn cảm thấy thế nào?
> EN: How did it feel talking with Pip?

### Day 2 · The Letter (d2-lock → d2-post)

**Before:** Hop to day 2. The knock, from the roommate: "Something's going on at the café. Come with me?"

> VI: Bây giờ là sáng hôm sau. Điện thoại của bạn vừa có thông báo. Bạn làm như bình thường nhé.
> EN: It's the next morning. Your phone just got a notification. Do what you'd normally do.

**Task:** Whatever the knock leads to. Don't mention the café or the call.

**Path:** knock → burrow with Mei's letter card and Pip's line → (optional: the ring chip opens the week view with three calls and four seed packets) → "Đến quán cà phê với {Pip}" → the call at the Lantern Café: Pip whispers "Can you ask her what's wrong?", Mei deflects and shows the letter (tap a line for Vietnamese, which drops a seed packet), Pip asks "What does rent mean? Is it a kind of bread?", the call to the Harbour Lane office ("Who's calling, please?"), one piece of advice, Pip: "I'll get a job!" → "Kết thúc cuộc gọi" → after the call ("{Pip} đang ghi lại…", then two wins, one fix, seeds to sprouts, ring 1/3, a box unpacked) → "Về hang".

**Watch:**

- Do they ask Mei what's wrong when Pip whispers? Do they offer help when she deflects?
- Taps on the letter's lines for Vietnamese; use of "What does that mean?" and "Xem bản dịch".
- The correction: when Pip echoes their slip back as a question, do they notice and say it again? Do they see "Bạn tự sửa được rồi"?
- Silence: after a few seconds a hint slides up. Do they read it, say it, or freeze?
- How they explain "rent" to Pip (in English, Vietnamese, or not at all).
- Use of "Chờ chút" (pause).
- Waits that feel long to them (sighs, "hello?"), and any cut-off mid-sentence (note the time).
- On the after-call page: do they read the fix? Reaction to the box unpacked and the ring.

**Ask after:**

> VI: Chuyện gì vừa xảy ra ở quán cà phê?
> EN: What just happened at the café?

> VI: Có lúc nào bạn không biết nói gì không? Lúc đó bạn đã làm gì?
> EN: Was there a moment you didn't know what to say? What did you do?

### Day 3 · Something new without a call (d3-story)

**Before:** Hop to day 3. The knock, from Yapling: "{Pip} got lost today. It has a story for you." (in Vietnamese on the phone).

> VI: Một ngày mới. Bạn làm như bình thường nhé.
> EN: A new day. Carry on as you normally would.

**Task:** Whatever the knock leads to.

**Path:** knock → burrow, card about Pip's story → "Nghe chuyện của {Pip}" → Pip's voice story (the seagull) with line cards to tap for Vietnamese → Linh's postcard ("When you forget a word, describe it.") → back in the burrow: a mailbox and the seagull feather on the shelf.

**Watch:**

- Do they listen to the end, or skip? Taps on lines.
- Whether they try to talk (there's nothing to answer today) and how they take that: relief, confusion, disappointment.
- Whether they notice the feather or the mailbox without being told.

**Ask after:**

> VI: Hôm nay khác hôm qua ở chỗ nào?
> EN: What was different today from yesterday?

> VI: Một ngày không có cuộc gọi như hôm nay, bạn thấy thế nào?
> EN: How did a day without a call feel?

### Day 4 · Real week: teach Pip (d4-teach)

**Before:** Hop to day 4. The knock, from the roommate: "Can you teach me how to introduce myself at work?"

> VI: Sáng hôm sau. Bạn làm như bình thường nhé.
> EN: The next morning. Carry on as you normally would.

**Task:** Whatever the knock leads to.

**Path:** knock → burrow with Pip's line → "Dạy {Pip} giới thiệu bản thân" → the call: Pip asks how people introduce themselves at work → the tester introduces their own job (30-second ring) → Pip tries it back using their words, with a funny café job → one more try, their best one → Pip writes it down → "Xong" → after the call, ring 2/3 → "Về hang".

**Watch:**

- Do they use their real job? How long is the first try vs the second?
- Reaction when Pip reuses their words (smile, laugh, "it copied me"): strong H1 evidence.
- Pressure from the 30-second ring: do they rush, stop early, or ignore it?
- Any mention of a real situation this would help with.

**Ask after:**

> VI: Pip đã làm gì với những điều bạn nói?
> EN: What did Pip do with what you said?

> VI: Lần giới thiệu thứ hai có khác lần đầu không?
> EN: Was your second introduction different from the first?

### Day 5 · Pass it on, ring full (d5-bus → d5-keep)

**Before:** Hop to day 5. The knock, from Bea: "Bus 45 leaves at nine sharp. Bring your best story, love."

> VI: Sáng hôm sau. Bạn làm như bình thường nhé.
> EN: The next morning. Carry on as you normally would.

**Task:** Whatever the knock leads to.

**Path:** knock → burrow, Bea's card → "Ra bến xe buýt 45" → the same story about their day told three times: to Pip (90 s), Linh (60 s), Bea (45 s), with the "Gương nói" mirror after each round (Trôi chảy … giây, … từ/phút, ngắt … lần/phút) → "Xuống xe" → after the call → "Tiếp tục" → the keepsake: the ring full, Pip draws the certificate, "Treo lên tường" → the burrow with the keepsake on the wall.

The keepsake needs all three calls of the week done (days 2, 4, 5). If one was skipped, see "If a live call fails".

**Watch:**

- Do they keep the same story each round, and does it get shorter and smoother?
- Do they look at the mirror numbers? Can they say what "Trôi chảy" means?
- No Vietnamese help in this call: do they look for it?
- Reaction to the keepsake and Linh's name on it (the brief calls this the week's emotional payoff).

**Ask after:**

> VI: Các con số sau mỗi lượt có nghĩa là gì?
> EN: What did the numbers after each round mean?

> VI: Cái khung vừa treo lên tường có ý nghĩa gì với bạn không?
> EN: Does the frame on the wall mean anything to you?

### Day 6 · The cliffhanger (d6-vm → d6-season)

**Before:** Hop to day 6. The knock, from Yapling: "{Pip} left you a voicemail." (in Vietnamese on the phone).

> VI: Buổi tối hôm sau. Bạn làm như bình thường nhé.
> EN: The next evening. Carry on as you normally would.

**Task:** Whatever the knock leads to.

**Path:** knock → burrow, voicemail card → "Nghe thư thoại" → Pip's voicemail: "Big news! Hollowbrook is hiring. I have an interview on Thursday. Can you help me practise?" → Pip slips: "Can I helping you?" → the tester's turn to fix it → the phrase sticker (or, if they stay quiet, "{Pip} tự nhớ ra rồi") → "Xem bản đồ mùa" → the season map with Episode 2 glowing.

**Watch:**

- Do they correct Pip, and how (repeat the right phrase, explain, laugh)? Without being prompted?
- Reaction to the interview news; questions about Episode 2.
- The sticker: in a one-sitting test the phrase usually stays a sprout ("Đã nảy mầm") instead of becoming a leaf (see rough edges). Note only whether they notice a change.

**Ask after:**

> VI: Bạn có muốn biết chuyện gì xảy ra tiếp theo không? Vì sao?
> EN: Do you want to know what happens next? Why?

> VI: Lúc Pip nói sai, bạn đã nghĩ gì?
> EN: When Pip got it wrong, what did you think?

### Day 7 · The end of the free week (d7-pay)

**Before:** Hop to day 7. The knock, from Yapling: "Your first week is done. One small thing to tell you." (in Vietnamese on the phone).

> VI: Sáng hôm sau. Bạn làm như bình thường nhé.
> EN: The next morning. Carry on as you normally would.

**Task:** Whatever the knock leads to. Don't explain prices or plans, and don't react to the screen.

**Path:** knock → burrow, the first-week card → "Xem đó là gì" → the Plus paywall: the first week was on us; Free keeps about 10 live minutes a week and every story, postcard and voicemail; Plus is about 150 minutes a month (₫149k/month, ₫799k/year, ₫599k the first year, a student line); "Pip, the burrow and the story stay either way"; "Nâng cấp lên Plus" and "Không phải bây giờ" the same size → back to the burrow.

**Watch:**

- Time on the screen; do they scroll; do they read the plan cards?
- Which button they tap, and how fast. Face and comments as they read the price.
- Do they ask whether Pip goes away without Plus?
- If the build shows "Dev only: sample prices…" or Apple's sandbox purchase sheet, see rough edges.

**Ask after:**

> VI: Màn hình này nói gì? Bạn nói lại bằng lời của bạn nhé.
> EN: What is this screen saying? Put it in your own words.

> VI: Bạn thấy cách ứng dụng mời nâng cấp có công bằng không? Vì sao?
> EN: Does the way the app asks you to upgrade feel fair? Why?

### Day 8 · Coming back (d8-back)

**8a, a normal return.** Hop to day 8. The knock, from the roommate: "How was your week?"

> VI: Sáng hôm sau. Bạn làm như bình thường nhé.
> EN: The next morning. Carry on as you normally would.

**Path:** knock → coming back: Pip's day 8 line, the tester answers, the next-episode card rises → "Về hang" → the burrow shows the next episode.

**8b, after three days away** (skip if over time). Take the phone. Test menu → turn on **Came back after 3 days** → **Fire day 8's knock in 5 s** (it now reads "You're back? I kept your seat warm.") → Close → lock → hand back. If Pip doesn't greet them again when they open it, swipe home to leave the app and reopen it from the home screen.

> VI: Giả sử ba ngày qua bạn bận, không mở ứng dụng. Hôm nay bạn mở lại.
> EN: Imagine you were busy for three days and didn't open the app. Today you open it again.

**Path:** knock → coming back: Pip is glad to see them and tells the recap ("While you were away: Mei's rent doubled, we called the office, and I decided to get a job…"), the next-episode card shows at once → "Về hang".

Stop in the burrow. Don't start Episode 2: it isn't part of this test. "Hôm nay mình dừng ở đây nhé." / "We'll stop here for today."

**Watch:**

- Their face and words at the welcome back. Any sign of guilt ("sorry I was away") or pressure.
- Do they understand the recap? Do they remember the story so far?
- Interest in the next episode card.

**Ask after:**

> VI: Pip đón bạn quay lại thế nào? Bạn cảm thấy sao?
> EN: How did Pip welcome you back? How did that feel?

> VI: Nếu đây là điện thoại của bạn, ngày mai bạn có mở lại không?
> EN: If this were your phone, would you open it again tomorrow?

## Interview [VI review]

Take the phone away. Ask in this order; follow up with "Vì sao?" / "Why?" and "Bạn kể thêm được không?" / "Can you tell me more?".

| # | VI | EN |
|---|---|---|
| 1 | Bạn kể lại tuần vừa rồi cho một người bạn chưa biết ứng dụng này nghe đi. | Describe this week to a friend who has never seen the app. |
| 2 | Lúc nào bạn thích nhất? Lúc nào khó chịu nhất? | Which moment did you like most? Which annoyed you most? |
| 3 | Bạn đã nói tiếng Anh thành tiếng nhiều hơn hay ít hơn bạn nghĩ? Điều gì giúp bạn nói, điều gì làm bạn ngại? | Did you speak English out loud more or less than you expected? What helped, what held you back? |
| 4 | So với cách bạn đang học hoặc luyện tiếng Anh bây giờ, ứng dụng này khác ở đâu? | Compared with how you learn or practise English now, what's different here? |
| 5 | Nếu dùng thật, bạn sẽ mở nó lúc nào, ở đâu trong ngày? Ở đó bạn có nói thành tiếng được không? | If you used it for real, when and where in your day would you open it? Could you speak out loud there? |
| 6 | Có lúc nào bạn quên rằng các nhân vật là AI không? Bạn thấy điều đó thế nào? | Did you ever forget the characters are AI? How do you feel about that? |
| 7 | Có điều gì bạn không muốn nói với Pip, hoặc không muốn ứng dụng ghi lại không? | Is there anything you wouldn't want to tell Pip, or wouldn't want the app to record? |
| 8 | Nếu hết tuần đầu vào ngày mai, bạn sẽ chọn gì: miễn phí hay Plus? Điều gì sẽ khiến bạn trả tiền? | If the free week ended tomorrow, would you stay Free or get Plus? What would make you pay? |
| 9 | Bạn có muốn Pip gửi thông báo cho bạn không? Bao lâu một lần thì vừa? | Would you want Pip to send you notifications? How often is right? |
| 10 | Nếu được thay đổi một điều, bạn sẽ đổi gì? | If you could change one thing, what would it be? |

## Survey [VI review]

On paper or a form, after the interview, with the moderator out of sight of the answers.

| # | Question (VI / EN) | Answer |
|---|---|---|
| 1 | Ngày mai bạn có muốn mở lại ứng dụng không? / How likely are you to open the app tomorrow? | 1 (chắc chắn không / not at all) – 5 (chắc chắn có / definitely) |
| 2 | Ứng dụng giúp bạn luyện nói thật sự. / The app made me actually practise speaking. | 1 (không đồng ý / disagree) – 5 (rất đồng ý / strongly agree) |
| 3 | Tôi thấy thoải mái khi nói tiếng Anh thành tiếng trong ứng dụng. / I felt comfortable speaking English out loud in the app. | 1–5 |
| 4 | Mỗi ngày đều có điều gì đó mới. / Every day had something new. | 1–5 |
| 5 | Cách ứng dụng giới thiệu gói Plus là công bằng. / The way the app presented Plus was fair. | 1–5 |
| 6 | Nếu hôm nay phải chọn, bạn chọn gói nào? / If you had to choose today, which would you pick? | Miễn phí / Free · Plus tháng ₫149k / monthly · Plus năm ₫799k (năm đầu ₫599k) / yearly (₫599k first year) · Chưa biết / Not sure |
| 7 | Với Plus (khoảng 150 phút gọi mỗi tháng), mức giá mỗi tháng nào là: quá rẻ đến mức nghi ngờ · hời · bắt đầu đắt · quá đắt, không mua? / For Plus (about 150 call minutes a month), what monthly price is: so cheap you'd doubt it · a bargain · getting expensive · too expensive to buy? | Four amounts in ₫ |
| 8 | Hiện bạn chi bao nhiêu mỗi tháng cho việc học tiếng Anh? / How much do you spend a month on English learning now? | ₫ |
| 9 | Nếu không được dùng Yapling nữa, bạn thấy thế nào? / How would you feel if you could no longer use Yapling? | Rất tiếc / Very disappointed · Hơi tiếc / Somewhat · Không sao / Not disappointed |
| 10 | Một điều bạn muốn nói với nhóm làm Yapling? / One thing you'd tell the Yapling team? | Free text |

**Reading willingness to pay against the day 7 paywall.** Put three things side by side per tester: what they tapped on day 7 (and how fast), their plan choice (Q6), and their price points (Q7). The price holds if ₫149k sits at or under most testers' "getting expensive" answer and no one rates fairness (Q5) at 1–2. A tester who tapped "Không phải bây giờ" but chose Plus in Q6 is a timing signal (they want more than one week before paying); one who tapped upgrade but chose Free in Q6 was probably curious, not buying. Treat it as direction only: with 5–8 people this is not a pricing study.

## Close the session

1. Test menu → the **Cost page**: screenshot it (cost and minutes per call for this tester).
2. Note the tester's PostHog id or session time on the notes sheet if the funnel needs it.
3. Ask the tester to delete their data themselves (it doubles as a check of the flow): the roommate's face at the top left of the burrow → Me sheet → "Xoá dữ liệu của mình" → "Xoá tất cả". The app returns to the first run.
4. Recording off. Incentive. Thank them.
5. Test menu → **Reset**, so no knocks ring on the phone in the coming days. Then the reset steps for the next tester.

## Known rough edges

| What the tester may hit | Why | What to do |
|---|---|---|
| A call opens but no one speaks, or the character's voice is missing | Call audio may need an app relaunch before each call (seen on simulators; not yet checked on phones) | Exit the call, swipe the app away, reopen it (the day and the learner stay), start the call again. If the first call needs it, relaunch before every later call while the tester answers the day's questions |
| Day 6: the voicemail stalls after the tester's answer | Its ending (fix → sticker → "Xem bản đồ mùa") was checked only with recorded test answers, not a live voice | Wait 10 s. If a note "Đường dây đang rè…" shows, tap "Thử lại" once. "Xem bản đồ mùa" stays available; use it. Note the time |
| Day 6: the phrase stays a sprout ("Đã nảy mầm") instead of becoming a leaf | A phrase grows only on a new real day; the whole session runs on one real day (the test menu moves the app's day, not the server's) | Expected. Don't explain unless asked |
| "{Pip} đang ghi lại…" on the residency card or after a call | The summary is written after the call, a few seconds to a minute | Let them wait or carry on. The residency card fills in general strengths after a minute |
| Characters speak fast | Pip's voices are known to run fast for Newcomer pace (open founder item from the voice spike) | Note it and ask about speed after the day. Don't intervene |
| Day 7 shows "Dev only: sample prices, no App Store. Purchases are off." and the upgrade is disabled | The build has no RevenueCat key | "Bản thử chưa bật thanh toán, bạn cứ coi như thật nhé." Record what they would have tapped |
| Day 7: "Nâng cấp lên Plus" opens Apple's purchase sheet | The build has the sandbox key: no real charge | Let them see the sheet, then Cancel. Don't buy: it changes the account's minutes. Note it as a strong signal |
| The `dev · day N` label in the corner | The test build's label | "Đó là nhãn của bản thử, bạn bỏ qua nhé." |
| The lock screen shows the real time; the burrow's light is the same every day | The test menu keeps the real time of day | "Coi như là buổi sáng nhé." Ignore the light |
| Testers look for a town, a chat tab, voice notes or typing | Later releases: no Burrow / Chat / Town bar, no voice notes, no "Nhắn chữ thay thế" on the mic sheet, the no-connection sheet has only "Thử gọi lại" | Note what they looked for and why |
| Linh's knock on day 1: they try to answer her | The scene plays on the phone; the mic rests | Note it |
| Day 8 offers Episode 2 | Not part of this test | Stop in the burrow |
| A minutes chip appears mid-call ("Quán Lantern · 0:48") and the call ends with "Hết cảnh" | Each guest has one free hour in the first week, counted on the server; many retries can use it up | Let the scene wrap up. There is no top-up in the session: skip the remaining calls and note it |
| The safety sheet (115) appears | The safety check stepped out of the story | If it was a false alarm, say calmly it's an automatic safety check, note the exact words, and carry on from the burrow. If the tester is genuinely upset, stop the session and look after them first |
| "Sorry, I didn't catch that" or a slow reply | Speech wasn't heard clearly, or the reply was slow | Let them try again. Note how often, and whether they were near the phone |
| The microphone sheet ("{Pip} chưa nghe được bạn") | The tester declined the microphone on day 1 | "Mở Cài đặt" → Yapling Dev → Microphone on, then back to the app. Note that they declined and why |
| Notifications ring on the test phone in the following days | Knocks were scheduled ahead on the debug clock | Reset at the end of every session |

### If a live call fails

1. **Wait 10 seconds.** A dropped line reconnects on its own: the mic rests, the last line stays, and the scene carries on from the same beat.
2. **"Đường dây của {Pip} đang rè"** (shown at the start, or after two minutes without a connection): tap **"Thử gọi lại"** once.
3. **Still nothing:** leave the call (back), relaunch the app, and start the call again from the burrow's button (or its row in the week view). Check the phone's Wi-Fi and the health URL on the laptop.
4. **Second failure: skip it.** Say: "Cuộc gọi này đang bị lỗi, lỗi của ứng dụng chứ không phải của bạn. Mình chuyển sang phần tiếp theo nhé." / "This call is broken. It's the app's fault, not yours. Let's move on." Then hop to the next day.

What a skip changes:

| Skipped | Effect |
|---|---|
| A call after the tester spoke at least once | Its ring slot still fills (the summary runs when the call ends) |
| A call before the tester spoke | The slot stays open. The burrow keeps offering the oldest open call, so the tester can catch up later in the session from the burrow or the week view |
| Any of days 2, 4 or 5's calls, not caught up | No keepsake on day 5 (it needs the full ring). Note it, carry on |
| The placement call on day 1 | It can't be skipped. If it can't connect after the steps above, the backend is likely down: stop and reschedule |

## Notes template

One copy per tester. The note-taker writes; the moderator adds after the session.

```
TESTER  T_  · date · start/end · build no. · phone · speaker/headphones
Profile: job · self-rated English (1–5) · pays for learning? · notes from the screener
Roommate chosen / name:          Notifications: allowed / later        Too easy/hard tapped:

DAY _  · start __:__ · end __:__
Task done:        yes / with help (what) / no (why)
Spoke out loud:   every turn / some (whispered, one-word) / avoided     cut-offs: __ (times)
Help used:        taps on lines __ · meaning chip __ · hints shown __ · Chờ chút __
Confusions:       (time · screen · what they said or did)
Delight:          (time · screen · what they said or did)
Bugs:             (time · screen · what happened · what I did)
Moderator assists:
Q1 answer:
Q2 answer:
Quote worth keeping:

AFTER THE WEEK
Interview highlights (by question no.):
Survey: Q1 _ Q2 _ Q3 _ Q4 _ Q5 _ Q6 ____ Q7 __/__/__/__ Q8 ____ Q9 ____
Day 7: tapped ________ after __ s
Cost page: total $____ · minutes ____ (screenshot saved)      Data deleted: yes / no
```

## Synthesis sheet

After each session, score the tester (0, 1 or 2). After the last session, read across.

| | T1 | T2 | T3 | T4 | T5 | T6 | T7 | T8 | Mean |
|---|---|---|---|---|---|---|---|---|---|
| H1 Roommate | | | | | | | | | |
| H2 Speaks out loud | | | | | | | | | |
| H3 Each day new | | | | | | | | | |
| H4 Comes back | | | | | | | | | |
| H5 Paywall fair | | | | | | | | | |
| S1 Calls hold up | | | | | | | | | |
| S2 Vietnamese help | | | | | | | | | |
| S3 No guilt | | | | | | | | | |

| | 2 | 1 | 0 |
|---|---|---|---|
| H1 | Says unprompted that Pip learns from them, or corrects Pip on d6 without a prompt | Gets it when asked | Sees Pip as a teacher, a quiz or a chatbot |
| H2 | Speaks on every call, normal volume, no nudge after d1 | Speaks, but needed a nudge, whispered or gave one-word answers | Avoided speaking or asked to type |
| H3 | Names what was new on 5 or more of days 2–8 | Names some | "Same every day" |
| H4 | Survey Q1 is 4–5 and they give a story, Pip or progress reason | Q1 is 3, or a reason without pull | Q1 is 1–2 |
| H5 | Rates fairness 4–5 and can say what Free keeps and Plus adds | Understands it but finds the price high | Feels tricked or pressured, or thinks Pip goes away without Plus |
| S1 | No cut-offs; waits felt normal | One or two cut-offs, or a complaint about waits | A call failed twice, or many cut-offs |
| S2 | Found the help when stuck and went back to English | Found it only with a hint from the moderator | Stayed stuck, or read Vietnamese throughout |
| S3 | Warm or happy at the return | Neutral | Guilt or pressure |

**Decision rule.** A hypothesis holds when its mean is 1.5 or more and no tester scores 0 for a reason the app caused. It is killed when half or more score 0. In between: fix what the notes point to and retest with 3 new testers.

**Issues log.** One row per problem, counted across testers:

| Issue | Day · screen | Testers (n of N) | Severity (blocker · major · minor) | Kind (bug · copy · design · concept) | Next step |
|---|---|---|---|---|---|
| | | | | | |

## Where to look afterwards

| Source | What to read |
|---|---|
| PostHog | The funnel install → placement → first call → ring full → day 8, for the session's time window. Where each tester's run stopped, against the notes |
| The Cost page in the test menu | Each session's screenshot: cost and minutes per call. Roll up the cost of one tester's week and compare it with Plus's price (the gate: AI cost ≤ 30% of net revenue) |
| Worker logs (if `wrangler tail` ran) | One "call ended" line per call: seconds, cost and timing medians. Look for the calls the notes flag as slow |
| Crash reports | TestFlight crashes and feedback for the build |
| Recordings and notes | Quotes for the synthesis; the exact moment of every cut-off, confusion and assist |

### PostHog events for the beginner path

Every event carries `app_variant`, `test_session` and `debug_clock`; filter on `test_session` for session days. What the call's turn log keeps on the server (each turn's outcome and pass kind: match, generous or skip; "again" and "slowly" said aloud; first-word times) is read from the Worker logs, not PostHog.

| Event | Properties | Sent when | Measures |
|---|---|---|---|
| `path_chosen` | `path` (`visitor` · `placement`) | The profile first has the level question's answer (once per install) | B7 |
| `placement_result` | `stage`, `path` | The placement call ended complete and the server set the stage (once per install) | B7 |
| `chapter_started` | `chapter` (1–6), `scene_id`, `replay`, `turn_mode` | A Settling-in call answers | B1, B2, B6 |
| `chapter_ended` | as above, `ended_reason`, `complete`, `duration_seconds`, `learner_seconds` | A Settling-in call ends (`complete`: the scene played to its end) | B1, B2, B6, B8 |
| `call_started` · `call_ended` | `kind`, `scene_id`, `chapter`, `turn_mode`; the end adds `ended_reason`, durations | Every call; the café call is `scene_id` `s1-e1` | B2, B8 (`ended_reason` `too_hard`) |
| `replay_tapped` | call properties, `slower` | "Nói lại" or "Chậm thôi" tapped | B5 (with the turn log's spoken ones) |
| `too_hard_opened` · `too_hard_chosen` | `place` (`residency_card` · `call_exit` · `after_call` · `me`), `stage`; `choice` (`slower` · `practise_with_linh` · `closed`) | The "Khó quá" sheet opens, and what was chosen | B7, B8 |
| `stage_up_offered` · `stage_up_answered` | `week`; `accepted` | Linh's Newcomer card is offered, and taken or "Ở lại thêm" | (after week 1) |
| `turn_mode_switched` | call properties, `to` | Hold to talk ↔ hands-free during a call | — |
| `time_travel_used` | `action` (adds `start_visitor`, `jump_chapter`, `letter_day`), `day` | Any test-menu action; marks the install a test session | — |

B3 and B4 come from the turn log; B9 and B10 from the survey and interview.

## Before the first session: founder decisions

1. **Incentive:** amount and form (a suggestion: ₫500k in cash or an e-voucher for 2 hours), paid whether or not they finish.
2. **Recording tool:** how to capture the screen with the app's audio and the room's voices. iOS screen recording with the mic on competes with the app for the microphone; a Mac with QuickTime mirroring the phone over a cable (screen and app audio) plus a separate room recorder avoids that. Test it in the dry run.
3. **Devices:** run every session on the founder's test iPhone (the default here), or on testers' own phones. Internal TestFlight only reaches people on the App Store Connect team; testers' own phones need external TestFlight and Beta App Review first.
4. **Place and city:** where the quiet room is, and whether all sessions are in one city.
5. **Retention:** how long the screen and audio recordings are kept ([90] days in the consent) and the contact email for deletion requests. Whether to keep the app's call transcripts until synthesis instead of deleting the account at the end of each session (the consent text changes if so).
6. **Plus on day 7:** is the RevenueCat sandbox key in the TestFlight build? With it, testers reach Apple's sandbox purchase sheet; without it, the paywall shows the dev-only note and a disabled button.
7. **Live-call budget:** the founder gate before the learner test (ElevenLabs credits and Yapling's own Anthropic key). Each session uses about 15–20 minutes of live calls, more with retries.
8. **People:** who moderates, who takes notes, and who reviews this kit's Vietnamese (consent, screener, script, survey) before the first session.
9. **Day 8:** keep both returns for every tester (normal, then after three days away), or split testers between them for a cleaner read.
10. **Recruiting:** channels (LinkedIn, friends of friends, Facebook groups for working professionals) and who screens.
11. **Freeze:** agree that nothing is deployed to the dev Worker or pushed as a new TestFlight build during a session day.
