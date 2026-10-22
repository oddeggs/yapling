# Yapling — Season 1 script: "The Café Might Close"

*v0.3 · 2026-10-23 · Episodes 2–6 written in full with Visitor versions, the real-week and practice calls, stories, postcards and voicemails of weeks 2–6, Pip's minute and Bunting Week (Release 1.2, `every-week-loop.md`) · v0.2 added Settling in · 6 episodes, 1 per week · matches design round 5 · cast notes in `cast-bible.md`*

## How to read this script

- **[REC]** = a fixed line, written and voice-recorded (consistent acting, zero AI cost).
- **[GEN]** = a slot the live-call AI fills, with its intent. The AI uses the character's persona prompt (`cast-bible.md`), the learner's stage, their due phrases and their two target errors.
- **Lines are written at Newcomer level.** Each episode has a **Stage scaling** note for higher stages; the AI adapts speed, length and hints per the stage table in the cast bible. Visitors (A0–A1) first play **Settling in**, six short chapters after the prologue, and get easier versions of week 1's hard turns (both in the Settling-in section below) and a Visitor version of every episode after it ("Weeks 2–7" below).
- **Every line is checked against the level guide** (`packages/story/src/level-check.ts`, the rows in `story-engine.md` (a)). Story words the plot needs (*rent*, *petition*, *signature*, *percent*) stay and are glossed.
- **[REC-VI]** = a recorded line Linh speaks in Vietnamese (Settling in only).
- **Each week** = 1 Episode call (this script) + 1 Real-week call + 1 Practice call, plus free "between calls" content (Pip's story, a postcard, the cliffhanger voicemail) and, on days with no call, **Pip's minute** (two card turns, recorded lines, no live minutes).
- **Missed a week?** The episode waits. Pip tells the **Recap** line when the learner returns.

## Season overview

| Ep | Title | Place | Cast | Life can-do | Work can-do | New phrases |
|---|---|---|---|---|---|---|
| 1 | The Letter | Lantern Café | Mei, Pip, Linh | Ask someone what's wrong and offer help | Introduce yourself in 30 seconds | *What's wrong?* · *I need a plan* · *Can I help?* · *I think you should…* |
| 2 | Help Wanted | Hollowbrook office | Sol, Pip | Say what you're good at | Answer "Tell me about yourself" | *I'm good at…* · *For example,…* · *I'd love to…* · *Just to confirm…* |
| 3 | Cheaper Beans | Lantern Café counter | Hank, Mei, Pip | Say no politely | Push back once and offer an alternative | *I'm sorry, we can't do that* · *How about…?* · *That's a fair point, but…* · *Deal* |
| 4 | The Plan | Lantern Inn | Nell, Mei, Arjun*, Bea, Pip | Agree and disagree kindly | Keep a meeting moving and give everyone a turn | *What do you think?* · *Good idea, and…* · *Let's hear from…* · *So, to sum up…* |
| 5 | The Petition | Bus 45 | Bea, passengers, Pip | Tell a short story with a point | Give a 45-second pitch | *Here's the thing* · *It matters because…* · *Would you sign?* · *Thanks for listening* |
| 6 | The Town Meeting | Town Square | Everyone | Speak in front of a group | Make a short case and answer a question | *I'd like to say a few words* · *First,… Second,…* · *That's a great question* · *Thank you all* |

*\*Arjun stays off-mic in Season One: at the meeting Nell reads out his note. He moves in to Market Lane with his own voice and listening checkpoint later (Release 3).*

---

## Prologue (onboarding, day 1)

**Day-one burrow.** Boxes everywhere, one shelf, one seed packet.

- Pip [REC]: "This is it. Our burrow! It's… mostly boxes. One box left! Help me unpack?"
- *(Unpacking = the first chat in onboarding. After placement:)*
- Pip [REC]: "Okay. I know three things about you already. You keep going when you're stuck. You ask questions. And you're very good at unpacking."
- Linh knocks [REC]: "Hi! I'm Linh, from next door. I heard someone new moved in. When you're settled, come by the café. Mei makes the best kaya toast in town."
- **Hook into E1:** that evening, a letter is pushed under the café door (seen through the burrow window as a tiny animation; no explanation yet).
- **Visitors:** Linh's knock is Chapter 1 of Settling in instead of `s1-pro-03`, and the letter comes at the end of Chapter 6. A learner who chose "Mình mới bắt đầu" skips the unpacking call; one the placement call made a Visitor hears it as usual.

---

## Settling in (Visitors, before week 1)

*Release 1.1 · design in `beginner-path.md` · Vietnamese: "Làm quen".* Six short calls with Linh, Pip, Bea and Mei for learners at the **Visitor** stage (A0–A1), between day 1 and the letter. Each call is 2–3 minutes with 3–5 turns. Nothing fails: no timer, no score, and a chapter ends when its last line plays. After Chapter 6 the letter slides under the café door and week 1 starts the next morning.

**How to read these tables**

- **[REC]** English lines are recorded slow: speed 0.7, at most 8 words, each sentence its own clause, 100 wpm or slower (the gate in `tools/voice/yap_voice.py pace`). Two lines are fast on purpose and marked.
- **[REC-VI]** lines are Linh speaking Vietnamese, the only spoken Vietnamese in the cast: at the start of a new kind of task, in Chapters 1, 2, 3 and 6 only. If her Vietnamese voice is turned down after native review, each one shows as a text card instead (same words).
- **Turn** rows are the learner: the card or cards shown from the start (Vietnamese under each), and the words that pass (any try containing one of them; see `beginner-path.md` §5.2). After a pass, a praise line from the shared pool plays unless the row says otherwise.
- **[GEN]** is a short live line (it needs the learner's own words), 6 words at most at the Visitor row.
- Line ids are the keys in `audio/season-1/lines.json` (`pending` until recorded). The Vietnamese column is the line's on-screen gloss; for [REC-VI] lines it gives the English meaning in brackets instead.

| # | Title | Place | Cast | You learn to say | Phrase (seed packet) | Can-do |
|---|---|---|---|---|---|---|
| 1 | Hello | Burrow door (Linh's knock) | Linh, Pip | Hi · I'm … · Nice to meet you · Bye | *Nice to meet you* | Say hello and your name |
| 2 | Boxes | Day-one burrow | Linh, Pip | Yes · No · this or that · Yes, please · No, thank you · Thank you | *Yes, please* | Answer yes or no politely |
| 3 | Again, please | Burrow | Linh, Pip | Sorry? Again, please · Slowly, please | *Sorry? Again, please.* · *Slowly, please.* | Ask someone to say it again or slower |
| 4 | Bus 45 | Bus stop | Linh, Bea | Numbers (2, 9, 10, 45, 50) · Two, please | — | Understand a number, a time and a price |
| 5 | Mei's café | Lantern Café | Mei, Pip | Tea, please · How much? · Here you go | *How much?* | Order one thing |
| 6 | About me | Burrow at dusk | Pip, Linh | I'm from … · I'm a … / I work at … · I like … | *I'm from …* | Say where you're from and what you do |

### Chapter 1 · Hello (Linh at the door, day 1 evening)

| # | Id | Who | Line or turn | Vietnamese |
|---|---|---|---|---|
| 1 | | — | Knock | |
| 2 | `s1-set1-01` | Linh [REC] | "Hi! I'm Linh." | Chào bạn! Mình là Linh. |
| 3 | `s1-set1-02` | Linh [REC-VI] | "Chào bạn! Mình là Linh, ở nhà bên cạnh. Hồi mới xuống phà, mình cũng chưa nói được câu nào đâu. Giờ mình nói trước, bạn nói theo nhé." | (Hi! I'm Linh, from next door. When I got off the ferry, I couldn't say a word either. Now I'll say it first, and you say it after me.) |
| 4 | | Turn | Card **"Hi!"** (Chào!) · passes on hi, hello, hey | |
| 5 | `s1-set1-03` | Pip [REC] | "Hi! Hi, Linh!" (copies you; no praise line) | Chào! Chào Linh! |
| 6 | `s1-set1-04` | Linh [REC] | "I'm Linh. And you?" | Mình là Linh. Còn bạn? |
| 7 | | Turn | Card **"I'm {name}."** (Mình là {name}.) · passes on I'm, I am, my name, or their name | |
| 8 | `s1-set1-05` | Linh [REC] | "{name}! Nice to meet you." (recorded without the name; the name is spliced in) | {name}! Rất vui được gặp bạn. |
| 9 | | Turn | Card **"Nice to meet you, too."** (Mình cũng rất vui được gặp bạn.) · passes on nice, meet | |
| 10 | `s1-set1-06` | Pip [REC] | "Nice to meet you, too! I'm Pip!" | Mình cũng rất vui được gặp bạn! Mình là Pip! |
| 11 | `s1-set1-07` | Linh [REC] | "Bye! See you tomorrow." | Tạm biệt! Mai gặp nhé. |
| 12 | | Turn | Card **"Bye!"** (Tạm biệt!) · passes on bye, see you | |
| 13 | `s1-set1-08` | Linh [REC-VI] | "Bạn vừa nói tiếng Anh rồi đó! Mai gặp lại nhé." | (You just spoke English! See you tomorrow.) |

### Chapter 2 · Boxes

| # | Id | Who | Line or turn | Vietnamese |
|---|---|---|---|---|
| 1 | `s1-set2-01` | Pip [REC] | "So many boxes! Help, please!" | Nhiều thùng quá! Giúp mình với! |
| 2 | `s1-set2-02` | Linh [REC-VI] | "Mình hỏi, bạn chọn một thẻ rồi đọc to lên nhé." | (I'll ask; you pick a card and read it out loud.) |
| 3 | `s1-set2-03` | Linh [REC] | "Is this your box?" | Đây là thùng của bạn à? |
| 4 | | Turn | Cards **"Yes."** (Có.) / **"No."** (Không.) · either passes | |
| 5 | `s1-set-linh-okay`, `s1-set2-04` | Linh [REC] | "Okay!" then "Books or clothes?" | Được rồi! · Sách hay quần áo? |
| 6 | | Turn | Cards **"Books."** (Sách.) / **"Clothes."** (Quần áo.) | |
| 7 | `s1-set2-05` | Pip [REC] | "Tea? For you!" | Trà nhé? Cho bạn đó! |
| 8 | | Turn | Cards **"Yes, please."** (Có, cảm ơn nhé.) / **"No, thank you."** (Thôi, cảm ơn nhé.) | |
| 9 | `s1-set2-06` | Linh [REC] | "A gift for you. Here you go!" | Quà cho bạn nè. Của bạn đây! |
| 10 | | Turn | Card **"Thank you!"** (Cảm ơn!) · passes on thank, thanks | |
| 11 | `s1-set2-07` | Linh [REC] | "You're welcome!" | Không có gì! |
| 12 | `s1-set2-08` | Pip [REC] | "One box done! Thank you!" (a box unpacks) | Xong một thùng! Cảm ơn bạn! |

### Chapter 3 · Again, please (the two lifesavers, and the call honours them)

| # | Id | Who | Line or turn | Vietnamese |
|---|---|---|---|---|
| 1 | `s1-set3-01` | Linh [REC-VI] | "Mình chỉ bạn hai câu cứu nguy nhé. Không nghe kịp thì nói: Sorry? Again, please. Người ta nói nhanh quá thì nói: Slowly, please. Ở Natterwick, ai cũng sẵn lòng nói lại cho bạn." | (Here are two lifesavers. If you didn't catch it, say: Sorry? Again, please. If people talk too fast, say: Slowly, please. In Natterwick, everyone's happy to say it again for you.) |
| 2 | `s1-set3-02` | Linh [REC] | "Sorry? Again, please." (the model) | Xin lỗi? Nói lại giúp mình nhé. |
| 3 | | Turn | Card **"Sorry? Again, please."** (Xin lỗi? Nói lại giúp mình nhé.) · passes on sorry, again, pardon, repeat | |
| 4 | `s1-set3-03` | Linh [REC] | "Slowly, please." (the model) | Nói chậm giúp mình nhé. |
| 5 | | Turn | Card **"Slowly, please."** (Nói chậm giúp mình nhé.) · passes on slow, slowly | |
| 6 | `s1-set3-04` | Pip [REC] | "Ooh, I found my snacks and my map and my notebook!" (**fast on purpose**: 11 words at speed 1.0, the only long line in Settling in) | Ồ, mình tìm thấy đồ ăn vặt, bản đồ và sổ tay rồi! |
| 7 | | Turn | Cards **"Sorry? Again, please."** / **"Slowly, please."** · the call replays Pip's line slower (`beginner-path.md` §5) and the turn passes | |
| 8 | `s1-set3-05` | Pip [REC] | "Snacks. Map. Notebook!" | Đồ ăn vặt. Bản đồ. Sổ tay! |
| 9 | `s1-set3-06` | Linh [REC] | "See? It works. Every time." | Thấy chưa? Lần nào cũng được. |
| 10 | | Turn | Card **"Thank you!"** (Cảm ơn!) | |
| 11 | `s1-set3-07` | Linh [REC] | "Use them every day. Bye!" | Dùng mỗi ngày nhé. Tạm biệt! |

### Chapter 4 · Bus 45

| # | Id | Who | Line or turn | Vietnamese |
|---|---|---|---|---|
| 1 | `s1-set4-01` | Linh [REC] | "This is the bus stop." | Đây là trạm xe buýt. |
| 2 | | — | Task card: "Nghe số, rồi chọn thẻ và đọc to." | |
| 3 | `s1-set4-02` | Bea [REC] | "Morning! This is Bus forty-five." | Chào buổi sáng! Đây là xe buýt số 45. |
| 4 | `s1-set4-03` | Linh [REC] | "Which bus? Forty-five or fifty?" | Xe nào? Số 45 hay số 50? |
| 5 | | Turn | Cards **"Forty-five."** (Bốn mươi lăm.) / **"Fifty."** (Năm mươi.) · 45 passes; 50 gets Linh's "Again?" (`s1-set-linh-again`) and line 3 replays | |
| 6 | `s1-set4-04` | Bea [REC] | "I leave at nine." | Chín giờ xe chạy nhé. |
| 7 | `s1-set4-05` | Linh [REC] | "What time? Nine or ten?" | Mấy giờ? Chín giờ hay mười giờ? |
| 8 | | Turn | Cards **"Nine."** (Chín giờ.) / **"Ten."** (Mười giờ.) | |
| 9 | `s1-set4-06` | Bea [REC] | "Tickets are two dollars each, love." (**Bea's normal pace on purpose**, speed 0.92) | Mỗi vé hai đô nhé. |
| 10 | | Turn | Cards **"Sorry? Again, please."** / **"Two dollars."** (Hai đô.) · both pass; "again" replays it slower after Bea's "Of course, love." (`s1-set-bea-slowly`) | |
| 11 | `s1-set4-07` | Linh [REC] | "How many tickets? One or two?" | Mấy vé? Một hay hai? |
| 12 | | Turn | Cards **"Two, please."** (Hai vé nhé.) / **"One, please."** (Một vé nhé.) | |
| 13 | `s1-set4-08` | Bea [REC] | "Two tickets. Here you go!" | Hai vé. Của bạn đây! |
| 14 | | Turn | Card **"Thank you!"** (Cảm ơn!) | |
| 15 | `s1-set4-09` | Bea [REC] | "Lovely! Have a nice day!" | Tuyệt! Chúc một ngày vui vẻ! |

### Chapter 5 · Mei's café (meet Mei before her bad news)

| # | Id | Who | Line or turn | Vietnamese |
|---|---|---|---|---|
| 1 | `s1-set5-01` | Mei [REC] | "Hi! Welcome to my café!" | Chào! Chào mừng đến quán của mình! |
| 2 | | Turn | Cards **"Hi!"** (Chào!) / **"Hello!"** (Xin chào!) | |
| 3 | `s1-set5-02` | Mei [REC] | "I'm Mei. Tea or coffee?" | Mình là Mei. Trà hay cà phê? |
| 4 | | Turn | Task card: "Chọn món trên thẻ rồi đọc to nhé." · Cards **"Tea, please."** (Cho mình trà nhé.) / **"Coffee, please."** (Cho mình cà phê nhé.) | |
| 5 | `s1-set5-03` | Mei [REC] | "Kaya toast too? It's really good!" | Thêm bánh mì nướng kaya không? Ngon lắm đó! |
| 6 | | Turn | Cards **"Yes, please."** / **"No, thank you."** | |
| 7 | `s1-set5-04` | Pip [REC, whisper] | "Ask her: how much?" | Hỏi Mei đi: bao nhiêu tiền? |
| 8 | | Turn | Card **"How much?"** (Bao nhiêu tiền?) | |
| 9 | `s1-set5-05` | Mei [REC] | "Three dollars, please." | Ba đô nhé. |
| 10 | | Turn | Cards **"Here you go."** (Đây, gửi bạn.) / **"Thank you!"** (Cảm ơn!) | |
| 11 | `s1-set5-06` | Mei [REC] | "Thanks lah. Enjoy!" (Mei's one "lah") | Cảm ơn nha. Ăn ngon nhé! |
| 12 | `s1-set5-07` | Mei [REC] | *(sighs)* "Okay. Back to work." | Thôi. Làm tiếp thôi. |
| 13 | `s1-set5-08` | Pip [REC, whisper] | "Mei looks tired." | Mei trông mệt quá. |

### Chapter 6 · About me (Pip writes a page about you; the letter arrives)

| # | Id | Who | Line or turn | Vietnamese |
|---|---|---|---|---|
| 1 | `s1-set6-01` | Pip [REC] | "I'm writing a page about you!" | Mình đang viết một trang về bạn! |
| 2 | `s1-set6-02` | Linh [REC] | "I'm from Vietnam. And you?" (re-recorded per market by that market's Home Neighbour) | Mình đến từ Việt Nam. Còn bạn? |
| 3 | | Turn | Task card: "Nói về bạn: chọn thẻ, hoặc nói bằng từ của bạn." · Card **"I'm from …"** (Mình đến từ …) with chip **"I'm from Vietnam."** (Mình đến từ Việt Nam.) · passes on from (their own town is welcome) | |
| 4 | | Pip [GEN] | Repeats their place, delighted, 6 words at most ("From Hanoi! Writing it down.") | |
| 5 | `s1-set6-03` | Linh [REC] | "I work at the library. And you?" | Mình làm ở thư viện. Còn bạn? |
| 6 | | Turn | Cards **"I'm a student."** (Mình là sinh viên.) / **"I work in an office."** (Mình làm văn phòng.) · passes on I'm a, I work, or any job word | |
| 7 | | Pip [GEN] | Repeats their job ("A teacher! Wow!") | |
| 8 | `s1-set6-04` | Pip [REC] | "I like snacks! And you?" | Mình thích đồ ăn vặt! Còn bạn? |
| 9 | | Turn | Cards **"I like coffee."** (Mình thích cà phê.) / **"I like music."** (Mình thích âm nhạc.) · passes on like | |
| 10 | | Pip [GEN] | Reads its page back in three bits: their name, their place, what they like | |
| 11 | `s1-set6-05` | Linh [REC-VI] | "Giỏi lắm! Bạn sẵn sàng rồi đó. Mai mình gặp nhau ở quán của Mei nhé." | (Well done! You're ready. See you at Mei's café tomorrow.) |
| 12 | | — | Dusk: the letter under the café door (the existing `dusk_letter` beat) | |
| 13 | `s1-set6-06` | Pip [REC] | "Look! A letter under Mei's door!" | Nhìn kìa! Có lá thư dưới cửa quán Mei! |

### Shared lines (all chapters and the week-1 Visitor turns)

| Use | Id | Who | Line | Vietnamese |
|---|---|---|---|---|
| Praise (after a pass) | `s1-set-linh-great` · `s1-set-linh-yes` | Linh | "Great!" · "Yes!" | Tuyệt! · Đúng rồi! |
| | `s1-set-pip-great` · `s1-set-pip-yes` | Pip | "Great!" · "Yes!" | Tuyệt! · Đúng rồi! |
| | `s1-set-mei-great` | Mei | "Great!" | Tuyệt! |
| | `s1-set-bea-lovely` | Bea | "Lovely!" | Tuyệt quá! |
| Okay / again | `s1-set-linh-okay` · `s1-set-linh-again` | Linh | "Okay!" · "Again?" | Được rồi! · Nói lại nhé? |
| | `s1-set-mei-okay` | Mei | "Okay!" | Được rồi! |
| | `s1-set-bea-right` | Bea | "Right!" | Được rồi! |
| Before a slow replay | `s1-set-linh-slowly` | Linh | "Sure. Slowly." | Được. Mình nói chậm nhé: |
| | `s1-set-pip-slowly` | Pip | "Okay! Slowly." | Ừ! Nói chậm nhé: |
| | `s1-set-mei-slowly` | Mei | "Sure, sure." | Được, được. |
| | `s1-set-bea-slowly` | Bea | "Of course, love." | Tất nhiên rồi. |
| Linh's help [REC-VI] | `s1-set-linh-together` | Linh | "Mình nói cùng nhau nhé." | (Let's say it together.) |
| | `s1-set-linh-english` | Linh | "Bạn thử nói bằng tiếng Anh nhé, cứ đọc thẻ gợi ý là được." (after a Vietnamese answer, once per chapter) | (Try it in English; just read the card.) |
| Skip | `s1-set-linh-skip` | Linh | "That's okay!" | Không sao đâu! |

Only Linh has a recorded "Again?". When Mei, Bea or Pip needs one, the call speaks it with the live voice at the Visitor row.

### Week 1 for Visitors

Same story, scenes and recordings. Each hard turn gets a Visitor version (`maxStage: 'visitor'`), and each Newcomer-only beat gets `minStage: 'newcomer'`. Cards show from the start, each with its Vietnamese; a Vietnamese task card opens each new kind of turn.

| Day · beat | Newcomer | Visitor | Task card |
|---|---|---|---|
| 2 · Pip whispers "Can you ask her what's wrong?" | Ask in your own words | Card **"What's wrong?"** (Có chuyện gì vậy?) · passes on wrong, okay | Hỏi Mei có chuyện gì. Đọc thẻ nhé. |
| 2 · Mei deflects ("nothing lah") | Ask again or offer help | Skipped: Mei shows the letter | |
| 2 · "What does rent mean?" | Explain the word | Pip [REC] `s1-e1-visitor-rent` "Rent… is it bread? Or money?" ("Rent"… là bánh mì à? Hay là tiền?) · cards **"It's money."** (Là tiền.) / **"It's money for a home."** (Là tiền thuê nhà.) | Pip hỏi "rent" là gì. Chọn một thẻ. |
| 2 · "Can you call them for me? My English goes funny…" | Agree | Mei [REC] `s1-e1-visitor-call` "Can you call them? Please?" (Bạn gọi cho họ được không? Nhờ bạn nhé?) · cards **"Yes, I can help."** (Ừ, mình giúp được.) / **"Okay!"** (Được!) | Mei nhờ bạn gọi điện. Nhận lời nhé. |
| 2 · Office: "Who's calling, please?" | Introduce yourself and say you're calling for Mei | Office [GEN, Visitor row] asks in 5 words · cards **"I'm {name}."** (Tôi là {name}.) / **"I'm {name}. I'm calling for Mei."** (Tôi là {name}. Tôi gọi giúp Mei.) · new Visitor turn after the Friday meeting: card **"Thank you. Bye!"** (Cảm ơn. Tạm biệt!) | Văn phòng hỏi ai đang gọi. Nói tên bạn. · Chào tạm biệt văn phòng. |
| 2 · "Okay. So… what do I do?" | Give one piece of advice | Cards **"Go on Friday."** (Thứ Sáu đi gặp họ nhé.) / **"I think you should go on Friday."** (Mình nghĩ bạn nên đi vào thứ Sáu.) | Mei hỏi nên làm gì. Chọn một lời khuyên. |
| 3 · Linh's postcard | As is | Linh [REC, postcard] `s1-e1-visitor-postcard` "Remember: Sorry? Again, please. It always works!" (Nhớ nhé: Sorry? Again, please. Lúc nào cũng được!) | |
| 3 · Pip's story | Tap lines for Vietnamese | The same, with Vietnamese shown under each line | |
| 4 · Introduce yourself in 30 s, twice | Timer ring | No timer. Three short turns from Chapters 1 and 6 (cards **"Hi, I'm …"**, **"I'm a … / I work at …"**, **"Nice to meet you."**), then once more all together from one card: the learner's first three-sentence run. Pip tries it back [GEN] | Giới thiệu bản thân: từng câu một. · Giờ nói cả ba câu liền nhau nhé. |
| 5 · Pass it on, 90/60/45 s | Talk about your day | 30/25/20 s, the frame "Today I … / I went to … / I'm …" as English cards (no Vietnamese: the Pass it on rule); every round passes when the timer ends | (none) |
| 5 · Keepsake | Pip's certificate | Linh hands over the Newcomer residency card, if at least 70% of week-1 turns passed without the generous pass (`beginner-path.md` §2.2) | |
| 6 · Fix Pip's "Can I helping you?" | Frame after a pause | Card **"Can I help you?"** (Mình giúp gì được cho bạn?) from the start | Pip nói sai. Đọc câu đúng cho Pip nhé. |

**Later episodes.** Episodes 2–6, their real-week and practice calls and Pip's minute each have a Visitor version, written below ("Weeks 2–7"). Until they are built (Release 1.2, `packages/story`), a Visitor who stays past week 1 plays the Newcomer turns with the Visitor's speech settings.

### Edits from the design draft (native-editor pass, 22 Oct 2026)

| Line | Was (`beginner-path.md` §4) | Now | Why |
|---|---|---|---|
| `s1-set1-02` | "…Mình là Linh, nhà bên cạnh. Hồi mới xuống phà tới đây, mình cũng chưa nói được câu nào…" | "…Mình là Linh, ở nhà bên cạnh. Hồi mới xuống phà, mình cũng chưa nói được câu nào đâu…" | "ở nhà bên cạnh" is how people say it; "xuống phà tới đây" doubled the motion |
| `s1-set2-06` | Linh "Here you go." | "A gift for you. Here you go!" | Pip offers the tea, so Linh handing it over didn't follow, and it made no sense after "No, thank you". A small gift works after either answer |
| `s1-set3-01` | "hai câu cứu cánh" · "ai cũng sẽ nói lại cho bạn" | "hai câu cứu nguy nhé" · "ai cũng sẵn lòng nói lại cho bạn" | "cứu cánh" also means "the end goal", so it reads oddly; "sẵn lòng" is warmer |
| `s1-set3-07` | "Use it every day. Bye!" | "Use them every day. Bye!" | Two phrases |
| `s1-set4-04` | Bea "The next bus is at nine." | "I leave at nine." | Bea's bus is already at the stop; "next bus" contradicted that |
| `s1-set4-09` | Bea "Lovely. See you, love!" | "Lovely! Have a nice day!" | One "love" per chapter (line 9 keeps it); a useful set phrase |
| `s1-set5-03` | Mei "Kaya toast too? Yes or no?" | "Kaya toast too? It's really good!" | "Yes or no?" sounded like a quiz, not a café owner; the cards already show the choice |
| `s1-set6-06` | Pip "Look! A letter at Mei's café!" | "Look! A letter under Mei's door!" | Says what Pip sees, and matches the dusk beat |
| `s1-set-bea-slowly` | "Course, love." | "Of course, love." | The clipped form is hard to catch at A0 |
| `s1-set-linh-english` | "Bạn thử nói bằng tiếng Anh nhé, nhìn thẻ gợi ý đó." | "Bạn thử nói bằng tiếng Anh nhé, cứ đọc thẻ gợi ý là được." | The task is to read the card aloud, not look at it; "là được" reassures |

The other lines stand as drafted. Every character line is 8 words or fewer except the deliberate `s1-set3-04`.

---

## Episode 1 — The Letter

**Logline.** Mei's rent doubles overnight. You help her read the letter, call the landlord, and decide what to do.
**Learning focus.** Asking what's wrong, offering help, giving simple advice; self-introduction (when calling the landlord's office).
**Real-week call this week.** Introduce yourself / your job (30 seconds), rehearsed with Pip.
**Practice call this week.** First "Pass it on" with Bea: tell Pip about your day (90 s), Linh (60 s), Bea (45 s).

### Between calls
- **Pip's story** [GEN, ~40 s]: Pip's first walk around town; it got lost and asked a seagull for directions. Seeded with *Can I help?*
- **Postcard from Linh** [REC]: "Tip from a neighbour: when you forget a word, describe it. 'The thing you use to cut bread' works fine!"

### Episode call — at the Lantern Café

1. **Open.** Mei [REC]: "Oh! Hi, you two. Sorry, I'm a bit… *(sighs)* Sit, sit. Kaya toast?"
2. **Notice.** Pip [REC, whisper]: "She looks sad. Can you ask her what's wrong?"
   - Learner asks. *(Target chunk: What's wrong?)*
   - [GEN] Mei deflects once ("Aiyah, nothing lah"), then shows the letter if the learner asks again kindly or offers help.
3. **The letter.** On screen: a short letter. Tap any line for the Vietnamese gloss (L10 behaviour).
   > *Dear Ms Mei, From next month, the rent for 12 Harbour Lane will be 2× the current rent. Please reply by Friday. — Harbour Property Office*
   - Mei [REC]: "Double! I can't pay double. I need a plan by Friday."
4. **Teach the yapling.** Pip [REC]: "What does *rent* mean? Is it a kind of bread?"
   - Learner explains. Pip writes it in its notebook in the learner's words.
5. **The call to the landlord's office.** Mei [REC]: "Can you call them for me? My English goes funny when I'm angry."
   - The office (voiced by [GEN], polite neutral receptionist) asks: "Who's calling, please?"
   - Learner introduces themselves and explains they're calling for Mei. *(Work can-do: introduce yourself.)*
   - [GEN] Receptionist: "Ms Mei can come in on Friday to discuss it." (Always resolves to a meeting.)
6. **Advice.** Mei [REC]: "Okay. So… what do I do?"
   - Learner gives one piece of advice. *(Target chunk: I think you should…)* [GEN] Mei reacts warmly to any reasonable idea.
7. **Close.** Pip [REC]: "I have an idea too! I'll get a job! I'll help pay!"
   Mei [REC]: "You? A job? *(laughs)* Okay, okay. Thank you, both of you."

**Stage scaling.** Neighbour+: Mei deflects twice and the learner has to read her mood; the receptionist asks follow-up questions (account number, reason for the call). Regular+: the learner negotiates a delay ("Could we have until the end of the month?").

**Cliffhanger voicemail** [REC, Pip]: "Big news! Hollowbrook is hiring. I have an interview on Thursday. *(gulp)* Can you help me practise?"
**Recap if missed** [REC, Pip]: "While you were away: Mei's rent doubled, we called the office, and I decided to get a job. Very brave. Very scary."

---

## Weeks 2–7: how to read them

*Release 1.2 · design in `every-week-loop.md` · the weeks after week 1, written in full.* Each week has the shape week 1 has: the new episode on day 1 (it pays off last week's voicemail), Pip's story and sometimes a postcard on day 2, the real-week call on day 3, the practice call on day 4, the cliffhanger voicemail on day 5, Pip's minute on day 6 (and on any day a phrase is due), and the week's wrap on day 7. Days count from the story's start: week 2 is story days 8–14. A missed call waits; nothing expires.

- **Episode tables** run top to bottom as the call plays. Newcomer and up play the first table (higher stages add the **Stage scaling** turns); a Visitor plays the second (`maxStage: 'visitor'` beats; every beat of the first table that a Visitor skips is `minStage: 'newcomer'`).
- **Newcomer turns** (`Turn` rows) say what the learner does, the **hint** (English, then the Vietnamese gloss in brackets; shown once, silently, after a long quiet or when asked) and the phrase and can-do the turn gives evidence for. Pass it on rounds and timed pitches keep English-only hints, as week 1's Pass it on does.
- **Visitor turns** follow Settling in: one or two cards shown from the start, Vietnamese under each, and the words that pass (any try containing one of them, whole words; see `beginner-path.md` §5.2). A Vietnamese task card opens each new kind of turn. After a pass, a praise line from the shared pool plays when the listener has one (Linh, Pip, Mei, Bea); Sol, Hank, Nell, Dex and Mags react with a short [GEN] line instead.
- **[REC] lines** are recorded; their ids are the keys in `audio/season-1/lines.json` (`pending` until rendered; `_vi` there repeats the gloss). Visitor [REC] lines are at most 8 words, rendered at speed 0.7 with `[pause]` between sentences. Newcomer [REC] lines keep to the Newcomer row (a sentence at most 12 words, one idea, no idioms) except the few recorded before this pass, which are marked where they stretch it.
- **[GEN]** rows are live lines with an intent and an example; at Visitor they use the Visitor row (6 words or fewer for a reaction, 8 at most).
- **Listening content** (stories, postcards, voicemails) is the same recording at every stage. At Visitor each line shows its Vietnamese underneath (as week 1's story does), so these lines are written in short, plain sentences.

### The six weeks at a glance

| Week | Story days | Episode | Real-week call | Practice call | Pip's story | Postcard | Voicemail (day 5) |
|---|---|---|---|---|---|---|---|
| 2 | 8–14 | Help Wanted | Pip: tell me about yourself, for real | Teach the yapling: *deadline*, *team*, *shift* | Too much tie | Sol (day 1, before the interview) | Pip: "I GOT THE JOB!" |
| 3 | 15–21 | Cheaper Beans | Dex: a real "no" this week | Pass it on at the café: why it matters | The quick sync | Linh: saying no | Mei: "Someone wants to buy the café building…" |
| 4 | 22–28 | The Plan | Dex: one point for a real meeting | Nell's time (listening checkpoint), then Teach the yapling: *petition*, *signature* | The poster | Nell: the papers are ready | Nell: a hundred signatures by Friday |
| 5 | 29–35 | The Petition | Dex: your own 60-second pitch | Pass it on on Bus 45: the petition story | The lamp post | Bea: "Bring your best story" | Mei: the vote, will you speak? |
| 6 | 36–42 | The Town Meeting | Pip: how did it go? | Accent warm-up: answer six postcards | The moon | Six well-done notes | Pip: Bunting Week is coming |
| 7 | 43–49 | Bunting Week (festival) | any, replayed or new | any | Pip's season story | Mei: thank you | Bea: the boat |

What each week builds on: week 2 reuses week 1's self-introduction and Settling in's "I'm a … / I work at …"; week 3 the café and "Can I help?"; week 4 week 3's "How about…?" and "That's a fair point, but…" (disagreeing gently) and Chapter 4's numbers (the time on Nell's postcard); week 5 week 1's Pass it on (the same task, now with a point; the then-and-now card compares them); week 6 the three-sentence run from week 1, day 4, and every episode's phrases in the six postcards.

---

## Episode 2 — Help Wanted

**Logline.** Pip has its first job interview, with Sol at Hollowbrook. You rehearse it with Pip, then swap: Sol interviews you.
**Learning focus.** Talking about strengths with an example; answering "Tell me about yourself"; checking details.
**Real-week call.** "Tell me about yourself, for real": Pip asks about the learner's own job or study, picking up what they said in week 1 (from memory). Bring your homework (a pasted CV or job post, with Dex) stays in Release 2.
**Practice call.** Teach the yapling: explain three job words Pip copied from the Hollowbrook poster (*deadline*, *team*, *shift*).

### Week 2 (story days 8–14)

| Day | The day's thing | Scene | Ring slot |
|---|---|---|---|
| 1 | Sol's postcard (`s1-e2-01`, "See you and Pip on Thursday"), then the episode | `s1-e2-postcard`, `s1-e2` | 1 |
| 2 | Pip's story: Too much tie | `s1-e2-story` | |
| 3 | Real-week call | `s1-e2-real-week` | 2 |
| 4 | Practice call (Pip is waiting to hear about the job) | `s1-e2-practice` | 3 |
| 5 | Pip's voicemail (`s1-e2-13`) | `s1-e2-voicemail` | |
| 6 | Pip's minute | daily | |
| 7 | The week's wrap | | |

*Sol's postcard moves from day 2 to day 1, before the call: it says "See you on Thursday", so after the interview it read backwards.*

### Episode call · `s1-e2` (Newcomer and up)

The burrow first, then the Hollowbrook office.

| # | Id | Who | Line or turn | Vietnamese |
|---|---|---|---|---|
| 1 | `s1-e2-02` | Pip [REC] | "Can you be Sol? Ask me something hard." | Bạn đóng vai Sol nhé? Hỏi mình câu nào khó khó ấy. |
| 2 | | Turn | Ask Pip an interview question, as Sol. Hint **"Tell me about yourself."** / **"What are you good at?"** (Hãy giới thiệu về bản thân bạn. / Bạn giỏi việc gì?) | |
| 3 | | Pip [GEN] | Answers one stage below the learner with one mistake that matches the learner's own target error (no target yet: a past-tense slip). "I'm good at cook. Yesterday I cook for Mei!" | |
| 4 | | Turn | Fix Pip's mistake. Hint **"You mean: …"** (Ý Pip là: …) | |
| 5 | | Pip [GEN] | Writes the fix in its notebook and promises to use it. "Cooking, cooked. Writing it down!" | |
| 6 | | — | The Hollowbrook office | |
| 7 | `s1-e2-03` | Sol [REC] | "Hi, Pip! Thanks for coming. Let's start easy: tell me about yourself." | Chào Pip! Cảm ơn bạn đã đến. Mình bắt đầu bằng câu dễ nhé: hãy giới thiệu về bản thân bạn. |
| 8 | | Pip [GEN] | Answers Sol with the learner's fix (listening; the callback lands). "I'm good at cooking. Yesterday, I cooked for Mei!" | |
| 9 | `s1-e2-11` | Sol [REC, re-take of `s1-e2-04`] | "And you came with Pip! Can I ask you the same question?" | Bạn đi cùng Pip à! Mình hỏi bạn câu đó luôn nhé? |
| 10 | | Turn | Answer "Tell me about yourself". Hint **"I'm … I work at … / I study … Every day, I …"** (Mình là … Mình làm ở … / Mình học … Mỗi ngày, mình …) · can-do *Answer "Tell me about yourself"* | |
| 11 | | Sol [GEN] | Picks up one thing they said, then one question. "A nurse! So, what are you good at?" | |
| 12 | | Turn | Hint **"I'm good at …"** (Mình giỏi …) · phrase *I'm good at…* · can-do *Say what you're good at* | |
| 13 | | Sol [GEN] | Asks for an example, nothing else. "Nice. Can you give me an example?" | |
| 14 | | Turn | Hint **"For example, last week I …"** (Ví dụ, tuần trước mình …) · phrase *For example,…* (a past-tense moment) | |
| 15 | | Sol [GEN] | Regular and up: a weakness, then a time they solved a problem (stage scaling) | |
| 16 | `s1-e2-12` | Sol [REC, re-take of `s1-e2-05`] | "Last thing. The job starts on the fourteenth, mornings only." | Còn một việc nữa. Công việc bắt đầu từ ngày mười bốn, chỉ làm buổi sáng. |
| 17 | `s1-e2-09` | Pip [REC, whisper] | "Wait, was that the fourteenth? Can you check?" | Khoan đã, ngày mười bốn hả? Bạn hỏi lại giúp mình nhé? |
| 18 | | Turn | Check the details for Pip. Hint **"Just to confirm: the fourteenth, mornings?"** (Cho mình xác nhận lại: ngày mười bốn, làm buổi sáng, đúng không?) · phrase *Just to confirm…* | |
| 19 | | Sol [GEN] | Confirms in a few words. "That's right. The fourteenth, mornings." | |
| 20 | `s1-e2-10` | Sol [REC] | "Before you go, would you like to see the office?" | Trước khi về, hai bạn có muốn xem văn phòng một chút không? |
| 21 | | Turn | Say yes. Hint **"I'd love to!"** (Có chứ, mình rất muốn!) · phrase *I'd love to…* | |
| 22 | | Sol [GEN] | One line of the tour, with something to smile at. "This is the team room. And this is the snack shelf, Pip." | |
| 23 | `s1-e2-06` | Sol [REC] | "Thanks, both. Pip, we'll be in touch soon." | Cảm ơn hai bạn. Pip ơi, bên mình sẽ sớm liên lạc nhé. |

**Stage scaling.** Neighbour: Sol asks one more follow-up after the example ("What did you learn from that?"). Regular+: Sol asks about a weakness and a time you solved a problem; Local+: Sol asks a hypothetical ("What would you do if…?") and interrupts to dig deeper.

### Episode call at Visitor

| # | Id | Who | Line or turn | Vietnamese |
|---|---|---|---|---|
| 1 | | — | Task card: "Pip sắp đi phỏng vấn. Bạn đóng vai Sol: đọc câu hỏi trên thẻ." | |
| 2 | `s1-e2-visitor-practise` | Pip [REC] | "Be Sol, please! Ask me: what's your job?" | Bạn làm Sol nhé! Hỏi mình: bạn làm nghề gì? |
| 3 | | Turn | Card **"What's your job?"** (Bạn làm nghề gì?) · passes on job, work, what | |
| 4 | `s1-e2-visitor-pip-me` | Pip [REC] | "I'm Pip. I help at Mei's café." (no praise line; the same line is Pip's real answer at the office) | Mình là Pip. Mình phụ việc ở quán của Mei. |
| 5 | | — | The Hollowbrook office | |
| 6 | `s1-e2-visitor-sol-hi` | Sol [REC] | "Hi! I'm Sol. Welcome to Hollowbrook!" | Chào! Mình là Sol. Chào mừng đến Hollowbrook! |
| 7 | `s1-e2-visitor-pip-me` | Pip [REC] | (the same line again: the learner hears the model before their turn) | |
| 8 | `s1-e2-visitor-sol-you` | Sol [REC] | "Thank you, Pip. And you?" | Cảm ơn Pip. Còn bạn? |
| 9 | | Turn | Task card: "Sol hỏi về bạn. Nói tên và công việc của bạn." · Cards **"I'm {name}. I'm a …"** (Mình là {name}. Mình là …) / **"I'm {name}. I work at …"** (Mình là {name}. Mình làm ở …) · passes on I'm, I am, work, their name, or any job word | |
| 10 | | Sol [GEN] | Says their job back, warmly ("A nurse! Great!") | |
| 11 | `s1-e2-visitor-sol-good` | Sol [REC] | "I'm good at meetings. And you?" | Mình giỏi chủ trì các cuộc họp. Còn bạn? |
| 12 | | Turn | Task card: "Bạn giỏi việc gì? Chọn một thẻ, hoặc nói bằng từ của bạn." · Cards **"I'm good at cooking."** (Mình nấu ăn giỏi.) / **"I'm good at numbers."** (Mình giỏi tính toán.) · passes on good (their own "I'm good at …" is welcome) | |
| 13 | | Sol [GEN] | Says it back ("Cooking! Very nice.") | |
| 14 | `s1-e2-visitor-sol-mornings` | Sol [REC] | "Pip's job is in the mornings. Okay?" | Pip sẽ làm buổi sáng. Được không? |
| 15 | | Turn | Task card: "Nhắc lại giờ làm và nhận lời giúp Pip." · Cards **"Mornings. Okay!"** (Buổi sáng. Được!) / **"Yes, mornings are okay."** (Vâng, buổi sáng thì được.) · passes on morning, mornings, okay, yes | |
| 16 | `s1-e2-visitor-sol-bye` | Sol [REC] | "Thank you both. Goodbye!" | Cảm ơn hai bạn. Tạm biệt! |
| 17 | | Turn | Card **"Thank you. Bye!"** (Cảm ơn. Tạm biệt!) · passes on thank, thanks, bye | |
| 18 | `s1-e2-visitor-pip-done` | Pip [REC] | "We did it! Thank you!" | Chúng mình làm được rồi! Cảm ơn bạn! |

### Real-week call · `s1-e2-real-week` (Pip, in the burrow)

| # | Id | Who | Line or turn | Vietnamese |
|---|---|---|---|---|
| 1 | `s1-e2-rw-open` | Pip [REC] | "No Sol today, just me. Tell me about yourself, for real?" | Hôm nay không có Sol, chỉ có mình thôi. Kể thật về bạn cho mình nghe nhé? |
| 2 | | Pip [GEN] | From memory: picks up the job or study the learner gave in week 1 ("Last week you said you work at a bank. What do you do there?"); with nothing in memory, "Do you work, or study?" | |
| 3 | | Turn | Hint **"I'm … I work at … Every day, I …"** (Mình là … Mình làm ở … Mỗi ngày, mình …) · can-do *Answer "Tell me about yourself"* · 30–60 s | |
| 4 | | Pip [GEN] | One question: what are you good at, at work or at home? | |
| 5 | | Turn | Hint **"I'm good at … For example, …"** (Mình giỏi … Ví dụ, …) · phrases *I'm good at…*, *For example,…* · can-do *Say what you're good at* | |
| 6 | | Pip [GEN] | No example yet: "Ooh, an example? Please?" (then row 7). Otherwise it says the example back, impressed | |
| 7 | | Turn | Only after the nudge. Hint **"For example, last week I …"** (Ví dụ, tuần trước mình …) | |
| 8 | | Pip [GEN] | One dream question. "And one day? What would you love to do?" | |
| 9 | | Turn | Hint **"One day, I'd love to …"** (Một ngày nào đó, mình rất muốn …) · phrase *I'd love to…* | |
| 10 | | Pip [GEN] | Reads back one line from its notebook, in the learner's words | |
| 11 | `s1-e2-rw-close` | Pip [REC] | "I wrote it all down. Now I know you better!" | Mình ghi lại hết rồi. Giờ mình hiểu bạn hơn rồi! |

**At Visitor** (three card turns about the learner; Pip models each answer first):

| # | Who | Line or turn |
|---|---|---|
| 1 | Pip [GEN] | "Tell me about you. Please?" |
| 2 | Turn | Task card: "Pip muốn biết thêm về bạn. Chọn thẻ, hoặc nói bằng từ của bạn." · Cards **"I'm a …"** (Mình là …) / **"I work at …"** (Mình làm ở …) · passes on I'm a, I am a, I work, or any job word |
| 3 | Pip [GEN] | Says it back, then models: "A teacher! Wow! I like maps. And you?" |
| 4 | Turn | Card **"I like …"** (Mình thích …) with chips **"I like music."** (Mình thích âm nhạc.) / **"I like coffee."** (Mình thích cà phê.) · passes on like |
| 5 | Pip [GEN] | "I'm good at maps. And you?" |
| 6 | Turn | Cards **"I'm good at cooking."** (Mình nấu ăn giỏi.) / **"I'm good at my job."** (Mình làm tốt công việc của mình.) · passes on good |
| 7 | Pip [GEN] | Reads its page back in three bits: the job, the like, the good-at |

### Practice call · `s1-e2-practice` (Teach the yapling, in the burrow)

| # | Id | Who | Line or turn | Vietnamese |
|---|---|---|---|---|
| 1 | `s1-e2-pr-open` | Pip [REC] | "I copied the poster at Hollowbrook. Three words I don't know!" | Mình chép lại tấm áp phích ở Hollowbrook. Có ba từ mình không biết! |
| 2 | | — | Pip's notebook page: TEAM MEETING · EVERY SHIFT STARTS AT 8 · DEADLINE: FRIDAY | |
| 3 | | Pip [GEN] | Guesses the first word, wrong and sweet. "Deadline. Is it… a very tired line?" | |
| 4 | | Turn | Explain *deadline*. Hint **"It's the last day to …"** (Là ngày cuối cùng để …) | |
| 5 | | Pip [GEN] | Writes it in the learner's words, tries it on its own life ("My snack deadline is now!"), then guesses *team* | |
| 6 | | Turn | Explain *team*. Hint **"A team is a group of people who …"** (Team là một nhóm người cùng …) | |
| 7 | | Pip [GEN] | Writes it, then guesses *shift*. "Shift… like moving a big box?" | |
| 8 | | Turn | Explain *shift*. Hint **"A shift is the time when you …"** (Ca làm là khoảng thời gian bạn …) | |
| 9 | | Pip [GEN] | Reads its three notebook lines back | |
| 10 | `s1-e2-pr-close` | Pip [REC] | "Deadline, team, shift. Now I can read the whole poster!" | Hạn chót, nhóm, ca làm. Giờ mình đọc được cả tấm áp phích rồi! |

**At Visitor** (two picture-word cards; *deadline* is left out):

| # | Who | Line or turn |
|---|---|---|
| 1 | Pip [GEN] | "Two words. Help me, please?" |
| 2 | — | Picture card: four critters at one desk, the word TEAM |
| 3 | Pip [GEN] | "Team? What is team?" |
| 4 | Turn | Task card: "Giải thích từ cho Pip: chọn một thẻ." · Cards **"It's a group."** (Là một nhóm.) / **"It's people. They work together."** (Là những người làm việc cùng nhau.) · passes on group, people, together |
| 5 | — | Picture card: a clock from 8 to 12, the word SHIFT |
| 6 | Pip [GEN] | "Shift? What is shift?" |
| 7 | Turn | Cards **"It's work time."** (Là giờ làm.) / **"It's your work hours."** (Là giờ làm việc của bạn.) · passes on work, time, hours |
| 8 | Pip [GEN] | Reads its two notebook lines back |

### Between calls

**Pip's story** · `s1-e2-story` [REC, about 40 s] · seeded with *I'd love to…* · told the day after the interview, in the past tense.

| Id | Line | Vietnamese |
|---|---|---|
| `s1-e2-story-01` | "Story time! Before my interview, I tried on three things." | Đến giờ kể chuyện rồi! Trước buổi phỏng vấn, mình đã thử ba món đồ. |
| `s1-e2-story-02` | "First, a big red hat. Mei said, 'Too much hat.'" | Đầu tiên là một cái mũ đỏ thật to. Mei nói: "Mũ lố quá." |
| `s1-e2-story-03` | "Then, my blue coat. Linh said, 'Too much coat.'" | Rồi đến cái áo khoác xanh. Linh nói: "Áo lố quá." |
| `s1-e2-story-04` | "Then, a long, long tie. It went down to the floor. Too much tie!" | Rồi một chiếc cà vạt dài ơi là dài, dài chấm tận sàn. Cà vạt lố quá! |
| `s1-e2-story-05` | "So I wore my green scarf. Not too much. Just right." | Thế là mình quàng chiếc khăn xanh. Không lố. Vừa đẹp. |
| `s1-e2-story-06` | "Sol said, 'Would you like some tea?' And I said, 'I'd love to!' I felt very smart." | Sol hỏi: "Bạn uống trà nhé?" Mình đáp: "Có chứ, mình rất muốn!" Mình thấy mình giỏi ghê. |

**Postcard from Sol** [REC] `s1-e2-01` (day 1): "Hi! Sol from Hollowbrook. See you and Pip on Thursday. Quick tip: interviewers love examples!"

**Cliffhanger voicemail** [REC, Pip] `s1-e2-13`, a re-take of `s1-e2-07` (its 19-word sentence and "loud" were past the Newcomer row): "I GOT THE JOB! *(happy noises)* Oh, and Mei says a big man wants cheaper coffee beans. She looked worried." · MÌNH ĐƯỢC NHẬN RỒI! À, Mei kể có một ông to con muốn mua hạt cà phê rẻ hơn. Trông Mei lo lắm.
**Recap if missed** [REC, Pip] `s1-e2-08`: "While you were away, I had my interview. Sol asked about me, then about you! And I got the job. Mostly thanks to you."

---

## Episode 3 — Cheaper Beans

**Logline.** Hank, a fast-talking regular who buys beans for his shipping crew, demands a discount. You help Mei hold her price without losing him.
**Learning focus.** Saying no politely, offering alternatives, keeping up with fast speech. (This is the "same scene, two stages" episode in the design.)
**Real-week call.** A real "no" the learner needs to say this week, rehearsed with Dex, who plays the other side.
**Practice call.** Pass it on at the café: why the café matters to you, told to Pip, Linh and then Hank (90/60/45 s).

### Week 3 (story days 15–21)

| Day | The day's thing | Scene | Ring slot |
|---|---|---|---|
| 1 | The burrow's "since you were away" card shows a silhouette at the café window: "A stranger measured the café door." Then the episode | `s1-e3` | 1 |
| 2 | Pip's story: the quick sync; Linh's postcard | `s1-e3-story`, `s1-e3-postcard` | |
| 3 | Real-week call with Dex | `s1-e3-real-week` | 2 |
| 4 | Practice call | `s1-e3-practice` | 3 |
| 5 | Mei's voicemail (`s1-e3-07`, then the beep) | `s1-e3-voicemail` | |
| 6 | Pip's minute | daily | |
| 7 | The week's wrap | | |

### Episode call · `s1-e3` (Newcomer and up)

| # | Id | Who | Line or turn | Vietnamese |
|---|---|---|---|---|
| 1 | `s1-e3-01` · `s1-e3-10` · `s1-e3-11` · `s1-e3-02` | Hank [REC, one take per stage] | **Newcomer** (speed 0.85): "Hi. I want cheaper beans, please. Can you do ten percent?" · **Neighbour** (0.95, two requests): "Morning! I buy fifty kilos a month. I'd like ten percent off. And free delivery?" · **Regular** (1.05): "Look, I buy fifty kilos a month. Ten percent off and we're friends. Deal?" · **Local and up** (1.2): "Look, I buy fifty kilos a month, the place across the harbour does it for less, so unless you can match—" | Chào. Tôi muốn mua hạt cà phê rẻ hơn. Giảm mười phần trăm được không? · Chào buổi sáng! Mỗi tháng tôi mua năm mươi ký. Tôi muốn được giảm mười phần trăm. Và giao hàng miễn phí nữa, được không? · Nghe này, mỗi tháng tôi mua năm mươi ký. Giảm mười phần trăm là mình thành bạn. Chốt không? · Nghe này, mỗi tháng tôi mua năm mươi ký, chỗ bên kia bến cảng bán rẻ hơn, nên trừ khi cô giảm bằng họ— |
| 2 | `s1-e3-03` | Mei [REC, whisper] | "If I say yes, I can't pay the rent. If I say no, he goes. Help!" | Nếu mình đồng ý thì không trả nổi tiền thuê nhà. Nếu mình từ chối thì ông ấy đi mất. Cứu mình với! |
| 3 | | Turn | Say no, kindly. Hint **"I'm sorry, we can't do that."** (Xin lỗi, chúng tôi không làm vậy được.) · phrase *I'm sorry, we can't do that* · can-do *Say no politely* | |
| 4 | | Hank [GEN] | Pushes once, and names the big café across the harbour (Episode 4's reveal needs it): "Come on, Big Bean across the harbour is cheaper. Ten percent?" | |
| 5 | | Turn | Hold the no. Hint **"Sorry, we really can't."** (Xin lỗi, thật sự là không được.) · phrase *I'm sorry, we can't do that* | |
| 6 | `s1-e3-04` | Pip [REC, whisper] | "Maybe… something else? Not money?" | Hay là… cái gì khác? Không phải tiền? |
| 7 | | Turn | Offer something else. Hint **"How about free kaya toast?"** / **"How about …?"** (Hay là tặng kèm bánh mì nướng kaya nhé? / Hay là … nhé?) · phrase *How about…?* · can-do *Push back once and offer an alternative* | |
| 8 | | Hank [GEN] | Objects once, gruff but friendly. "Toast? My team wants cheap beans, not toast." | |
| 9 | | Turn | Agree a little, and hold. Hint **"That's a fair point, but …"** (Ông nói cũng có lý, nhưng …) · phrase *That's a fair point, but…* | |
| 10 | `s1-e3-05` | Hank [REC] | "Huh. Ok. I like you. Fine. Deal." | Hừm. Được. Tôi quý bạn đấy. Thôi được. Chốt! |
| 11 | | Turn | Shake on it. Hint **"Deal! Thank you."** (Chốt! Cảm ơn ông.) · phrase *Deal* | |
| 12 | `s1-e3-09` · `s1-e3-06` | Hank [REC, lowers voice] | **Newcomer and Neighbour** (`s1-e3-09`, speed 0.85): "One more thing: a man from the office was here. He checked the size of your door." · **Regular and up** (`s1-e3-06`, recorded before this pass): "But between us, this town's gotta show it actually wants this place. Saw the landlord's guy measuring the door. Just saying." | Còn chuyện này nữa: có người của văn phòng vừa tới đây. Ông ta đo kích thước cửa quán của cô đấy. · Nói nhỏ thôi nhé, cả thị trấn phải cho thấy là mọi người muốn giữ quán này. Tôi thấy người của chủ nhà đo cửa đấy. Nói vậy thôi. |
| 13 | | Mei [GEN] | One worried line to the learner, nothing to answer. "My door? But why…?" | |

**Stage scaling.** See `journey-and-story.md` §2.4: Neighbour explains why, offers an alternative and confirms the deal; Regular negotiates with reasons; Local gets interruptions and a mid-sentence change of mind; Voice must de-escalate and keep the relationship. `s1-e3-06` was the twist for every stage; its idioms ("between us", "gotta", "just saying") are past the Newcomer row, so Newcomer and Neighbour now hear `s1-e3-09`, which also drops "landlord" and "measuring" (above A2). The silhouette card on day 1 says the same thing in Vietnamese.

### Episode call at Visitor

Mei and Pip carry the scene; the learner says no, offers one thing and shakes on it (`journey-and-story.md` §2.4).

| # | Id | Who | Line or turn | Vietnamese |
|---|---|---|---|---|
| 1 | | — | Task card: "Hank muốn mua cà phê rẻ hơn. Bạn giúp Mei từ chối thật lịch sự." | |
| 2 | `s1-e3-visitor-hank` | Hank [REC, Visitor take] | "I'm Hank. Ten percent off. Okay?" | Tôi là Hank. Giảm mười phần trăm nhé. Được không? |
| 3 | `s1-e3-visitor-mei` | Mei [REC, whisper] | "Please say no. I need the money." | Bạn từ chối giúp mình nhé. Mình cần tiền lắm. |
| 4 | | Turn | Cards **"Sorry, no."** (Xin lỗi, không được.) / **"I'm sorry, we can't do that."** (Xin lỗi, chúng tôi không làm vậy được.) · passes on sorry, no, can't, cannot | |
| 5 | `s1-e3-visitor-hank-hmm` | Hank [REC] | "Hmm. Then what?" | Hừm. Vậy thì sao? |
| 6 | `s1-e3-visitor-pip` | Pip [REC, whisper] | "Offer him something. Not money." | Mời ông ấy món gì đó đi. Đừng giảm tiền. |
| 7 | | Turn | Task card: "Mời Hank một món khác thay cho giảm giá." · Cards **"How about a free cake?"** (Tặng ông một cái bánh nhé?) / **"How about free tea?"** (Tặng ông trà miễn phí nhé?) · passes on how about, free, cake, tea | |
| 8 | `s1-e3-visitor-hank-deal` | Hank [REC] | "Free? Okay. Deal!" | Miễn phí à? Được. Chốt! |
| 9 | | Turn | Card **"Deal!"** (Chốt!) · passes on deal, okay, yes | |
| 10 | `s1-e3-visitor-twist` | Hank [REC, lowers voice] | "A man checked your door." | Có một người đã đến xem xét cửa quán đấy. |
| 11 | `s1-e3-visitor-mei-why` | Mei [REC] | "Thank you! My door? Why?" | Cảm ơn bạn! Cửa quán mình á? Sao vậy? |

### Real-week call · `s1-e3-real-week` (Dex, the interview room)

Dex's first call. He plays whoever the learner has to say no to.

| # | Id | Who | Line or turn | Vietnamese |
|---|---|---|---|---|
| 1 | `s1-e3-rw-open` | Dex [REC] | "Hi, I'm Dex. I hear you said no to Hank, very kindly." | Chào bạn, tôi là Dex. Nghe nói bạn đã từ chối Hank, mà rất khéo nữa. |
| 2 | | Dex [GEN] | One question: is there a "no" you need to say this week, at work or at home? (Reads the learner's job from memory.) | |
| 3 | | Turn | Say what it is. Hint **"This week, someone asked me to …"** (Tuần này, có người nhờ mình …) | |
| 4 | | Dex [GEN] | Sets the scene and becomes that person, then asks. "Okay, I'm your manager. Can you work on Saturday?" | |
| 5 | | Turn | Say no, kindly. Hint **"I'm sorry, I can't do that."** (Xin lỗi, mình không làm vậy được.) · phrase *I'm sorry, we can't do that* · can-do *Say no politely* | |
| 6 | | Dex [GEN] | Pushes once, fairly, as that person would | |
| 7 | | Turn | Offer something else. Hint **"How about …?"** (Hay là … nhé?) · phrase *How about…?* · can-do *Push back once and offer an alternative* | |
| 8 | | Dex [GEN] | Accepts as the person, steps out of the role, names one strong thing they did | |
| 9 | `s1-e3-rw-close` | Dex [REC] | "That was strong. Say it just like that this week." | Tốt lắm. Tuần này bạn cứ nói đúng như vậy nhé. |

**At Visitor** (Dex plays the learner's boss with a small request):

| # | Who | Line or turn |
|---|---|---|
| 1 | Dex [GEN] | "I'm Dex. Work on Sunday? Okay?" |
| 2 | Turn | Task card: "Dex đóng vai sếp của bạn. Từ chối thật lịch sự." · Cards **"Sorry, no."** (Xin lỗi, không được.) / **"Sorry, I can't."** (Xin lỗi, mình không đi làm được.) · passes on sorry, no, can't |
| 3 | Dex [GEN] | "Okay. Then Monday?" |
| 4 | Turn | Cards **"Yes, Monday is okay."** (Vâng, thứ Hai thì được.) / **"How about Tuesday?"** (Hay là thứ Ba nhé?) · passes on yes, okay, Monday, how about, Tuesday |
| 5 | Dex [GEN] | "Good! Thank you." |
| 6 | Turn | Card **"Thank you. Bye!"** (Cảm ơn. Tạm biệt!) · passes on thank, thanks, bye |
| 7 | Dex [GEN] | "Well done. Bye!" |

### Practice call · `s1-e3-practice` (Pass it on, at the café)

| # | Id | Who | Line or turn | Vietnamese |
|---|---|---|---|---|
| 1 | `s1-e3-pr-open` | Pip [REC] | "Mei might lose this café. Why does it matter to you?" | Mei có thể mất quán này. Với bạn, quán quan trọng thế nào? |
| 2 | | Turn | Round 1, to Pip · 90 s (Neighbour 75, Regular 60) · Hint, English only **"I like this café because … Mei is … Every week, I …"** · can-do *Tell a short story with a point* | |
| 3 | | — | Fluency mirror 1 | |
| 4 | | Linh [GEN] | Comes in for tea and asks to hear it too: one minute | |
| 5 | | Turn | Round 2, to Linh · 60 s · the same hint, English only **"I like this café because … Mei is … Every week, I …"** | |
| 6 | | — | Fluency mirror 2 | |
| 7 | | Hank [GEN] | At the counter, in a hurry (Newcomer speed): "Quick, quick. Why this café?" | |
| 8 | | Turn | Round 3, to Hank · 45 s · the same hint | |
| 9 | | — | Fluency mirror 3 | |
| 10 | `s1-e3-pr-close` | Pip [REC] | "Three times! And Hank listened to the very end." | Ba lần liền! Hank còn nghe tới tận cuối nữa. |

**At Visitor:** rounds of 30, 25 and 20 s to the same three listeners ([GEN], Visitor row: "Why do you like the café?"), with the frame on English cards from the start (no Vietnamese, the Pass it on rule): **"I like the café."** / **"Mei is my friend."** / **"The toast is good."** Every round passes when the timer ends.

### Between calls

**Pip's story** · `s1-e3-story` [REC, about 40 s] · seeded with *Just to confirm…* · the joke is a sound: *sync* and *sink* sound the same.

| Id | Line | Vietnamese |
|---|---|---|
| `s1-e3-story-01` | "My first morning at Hollowbrook! Sol said, 'Quick sync at nine.'" | Buổi sáng đầu tiên của mình ở Hollowbrook! Sol nói: "Chín giờ quick sync nhé." |
| `s1-e3-story-02` | "Quick sync? I didn't know it. A quick sink? For washing dishes?" | "Quick sync" á? Mình không biết là gì. "Quick sink", cái bồn rửa à? Để rửa bát nhanh hả? |
| `s1-e3-story-03` | "So I brought soap. A big yellow bottle of soap." | Thế là mình mang theo xà phòng. Một chai xà phòng to, màu vàng. |
| `s1-e3-story-04` | "But a quick sync is a short meeting. Everyone says their plan for today." | Nhưng "quick sync" là một cuộc họp ngắn. Mỗi người nói kế hoạch hôm nay của mình. |
| `s1-e3-story-05` | "Sol asked, 'Pip, your plan?' I said, 'Washing!' Sol smiled. 'Good guess.'" | Sol hỏi: "Pip, kế hoạch của bạn là gì?" Mình nói: "Rửa bát!" Sol mỉm cười: "Đoán hay đấy." |
| `s1-e3-story-06` | "Then I asked, 'Just to confirm: no dishes?' Sol said, 'No dishes, Pip.' The soap is on my desk now. For luck." | Rồi mình hỏi: "Cho mình xác nhận lại: không phải rửa bát hả?" Sol nói: "Không rửa bát đâu, Pip." Giờ chai xà phòng nằm trên bàn làm việc của mình. Để lấy may. |

**Postcard from Linh** [REC] `s1-e3-postcard-linh` (day 2, for the real-week call): "Tip from a neighbour: I used to say yes to everything. Now I say, 'Sorry, I can't. How about Monday?'" · Mẹo nhỏ từ hàng xóm: trước đây việc gì mình cũng nhận lời. Giờ mình nói: "Sorry, I can't. How about Monday?"

**Cliffhanger voicemail** [REC, Mei] `s1-e3-07`: "{name}, sit down. Someone wants to buy the café building, and you'll never guess who… *(beep)*" *(Pays off at the start of Episode 4: Big Bean, the big café across the harbour that Hank talked about.)*
**Recap if missed** [REC, Pip] `s1-e3-12`, a re-take of `s1-e3-08` (a 13-word sentence, "landlord"): "While you were away, a raccoon called Hank wanted cheaper beans. We said no, nicely, and he said 'deal'! Then he told us about a man at Mei's door." · Trong lúc bạn đi vắng, một chú gấu mèo tên Hank muốn mua hạt cà phê rẻ hơn. Chúng mình đã từ chối thật khéo, và ông ấy nói "chốt"! Rồi ông ấy kể có một người lạ đến xem cửa quán Mei.

---

## Episode 4 — The Plan

**Logline.** The town gathers at Nell's inn to save the café. You chair the chat so everyone gets a turn and the town leaves with one plan.
**Learning focus.** Asking for opinions, agreeing and adding, disagreeing gently, summarising. Work: keeping a meeting moving.
**Payoff.** Mei's voicemail ("you'll never guess who…") pays off in the first line: Big Bean, the big café across the harbour that Hank talked about.
**Arjun stays off-mic** until he moves in to Market Lane (Release 3): Nell reads out his note. Nobody speaks with a borrowed accent.
**Real-week call.** Speaking up in one of your real meetings: rehearse one point you want to make, with Dex.
**Practice call.** First the listening checkpoint for Nell's move-in (what time did her postcard say?), then Teach the yapling: Pip doesn't understand *petition*, then *signature*.

### Week 4 (story days 22–28)

| Day | The day's thing | Scene | Ring slot |
|---|---|---|---|
| 1 | The episode; Nell's inn appears on the town map | `s1-e4` | 1 |
| 2 | Pip's story: the poster; Nell's postcard (the petition papers are ready after four) | `s1-e4-story`, `s1-e4-postcard` | |
| 3 | Real-week call with Dex | `s1-e4-real-week` | 2 |
| 4 | Practice call (the checkpoint, then the two words) | `s1-e4-practice` | 3 |
| 5 | Nell's voicemail (`s1-e4-05`) | `s1-e4-voicemail` | |
| 6 | Pip's minute | daily | |
| 7 | The week's wrap | | |

### Episode call · `s1-e4` (Newcomer and up)

| # | Id | Who | Line or turn | Vietnamese |
|---|---|---|---|---|
| 1 | | — | The back room of the Lantern Inn: everyone around one table | |
| 2 | `s1-e4-07` | Mei [REC] | "It's Big Bean, the big café across the harbour. They want my building." | Là Big Bean, chuỗi quán cà phê lớn bên kia bến cảng. Họ muốn mua toà nhà của mình. |
| 3 | `s1-e4-01` | Nell [REC] | "Right, everyone's here. Tea's on. Who wants to run this?" | Rồi, mọi người đủ cả rồi. Trà pha sẵn rồi đây. Ai muốn chủ trì nào? |
| 4 | `s1-e4-02` | Pip [REC] | "You! You're good at this." | Bạn đó! Bạn giỏi việc này mà. |
| 5 | | Turn | Open the meeting and give the first person a turn. Hint **"Hello, everyone. Let's hear from Bea. What do you think?"** (Chào mọi người. Mời Bea nói trước nhé. Bea nghĩ sao?) · phrases *Let's hear from…*, *What do you think?* · can-do *Keep a meeting moving* | |
| 6 | | Bea [GEN] | One idea, short and cheerful. "A cake sale on the bus!" | |
| 7 | | Turn | Agree and add, then pass to Nell. Hint **"Good idea, and … Nell, what do you think?"** (Ý hay đó, và … Nell thấy sao?) · phrases *Good idea, and…*, *What do you think?* · can-do *Agree and disagree kindly* | |
| 8 | `s1-e4-08` | Nell [REC] | "Arjun from Market Lane couldn't come. His note says: a market day!" | Arjun ở Market Lane không đến được. Anh ấy gửi lời nhắn: mở một phiên chợ! |
| 9 | | Nell [GEN] | Her own view in one line. "And the office must listen to us." | |
| 10 | | Mei [GEN] | A tired idea the learner can gently disagree with. "Maybe I just pay double. I can work nights." | |
| 11 | | Turn | Disagree gently. Hint **"I see, but … How about …?"** (Mình hiểu, nhưng … Hay là … nhé?) · can-do *Agree and disagree kindly* (builds on Episode 3) | |
| 12 | | Bea [GEN] | Talks too long, cheerfully, about a passenger and a goose (the one long turn here, about 25 words), then stops for breath | |
| 13 | | Turn | Move on, kindly. Hint **"Thanks, Bea. Let's hear from Linh."** (Cảm ơn Bea. Giờ mời Linh nói nhé.) · phrase *Let's hear from…* · can-do *Keep a meeting moving* | |
| 14 | `s1-e4-03` | Linh [REC] | "In my old town, people signed a petition. A hundred names, and the office had to listen." | Ở thị trấn cũ của mình, mọi người đã ký một bản kiến nghị. Một trăm chữ ký, và văn phòng phải lắng nghe. |
| 15 | | Turn | Sum up. Hint **"So, to sum up: a petition. A hundred names."** (Vậy, tóm lại: một bản kiến nghị. Một trăm chữ ký.) · phrase *So, to sum up…* | |
| 16 | | Nell [GEN] | Checks the summary and hands out jobs. "Pip, you get the names. Bus 45 goes everywhere." | |
| 17 | `s1-e4-04` | Mei [REC] | "Thank you. Really. Okay. Let's save my café." | Cảm ơn mọi người. Thật đấy. Được rồi. Cùng cứu quán của mình nào. |

**Stage scaling.** Neighbour: Mei and Bea both answer the disagreement, so the learner sums up two views. Regular+: two characters disagree with each other and the learner mediates; Local+: the meeting has a time limit and someone interrupts.

### Episode call at Visitor

"Hello, everyone!" opens the meeting; the learner asks two neighbours "What do you think?" and reacts; Nell sums up for them.

| # | Id | Who | Line or turn | Vietnamese |
|---|---|---|---|---|
| 1 | `s1-e4-visitor-mei` | Mei [REC] | "A big café wants my place." | Một quán cà phê lớn muốn lấy chỗ của mình. |
| 2 | `s1-e4-visitor-nell` | Nell [REC] | "I'm Nell. Please start the meeting!" | Mình là Nell. Bạn mở đầu cuộc họp nhé! |
| 3 | | Turn | Task card: "Bạn chủ trì cuộc họp. Chào mọi người trước nhé." · Card **"Hello, everyone!"** (Chào mọi người!) · passes on hello, hi, everyone | |
| 4 | | Turn | Task card: "Hỏi ý kiến từng người." · Card **"Bea, what do you think?"** (Bea nghĩ sao?) · passes on think, what, Bea | |
| 5 | `s1-e4-visitor-bea` | Bea [REC] | "A cake sale on my bus!" | Bán bánh ngay trên xe buýt của mình! |
| 6 | | Turn | Cards **"Good idea!"** (Ý hay đó!) / **"I like it!"** (Mình thích ý này!) · passes on good, idea, like | |
| 7 | | Turn | Card **"Linh, what do you think?"** (Linh nghĩ sao?) · passes on think, what, Linh | |
| 8 | `s1-e4-visitor-linh` | Linh [REC] | "A petition. A hundred names!" | Một bản kiến nghị. Một trăm chữ ký! |
| 9 | | Turn | Cards **"Good idea!"** / **"I like it!"** · passes on good, idea, like | |
| 10 | `s1-e4-visitor-nell-sum` | Nell [REC] | "So, a petition. A hundred names. Okay?" | Vậy là: một bản kiến nghị. Một trăm chữ ký. Được chứ? |
| 11 | | Turn | Cards **"Okay!"** (Được!) / **"Yes! Thank you, everyone."** (Vâng! Cảm ơn mọi người.) · passes on okay, yes, thank | |
| 12 | `s1-e4-visitor-mei-thanks` | Mei [REC] | "Thank you. Let's save my café!" | Cảm ơn mọi người. Cùng cứu quán của mình nhé! |

### Real-week call · `s1-e4-real-week` (Dex)

| # | Id | Who | Line or turn | Vietnamese |
|---|---|---|---|---|
| 1 | `s1-e4-rw-open` | Dex [REC] | "You ran the town meeting! Now let's practise one of yours." | Bạn đã chủ trì cuộc họp của cả thị trấn! Giờ chúng ta tập cho một cuộc họp của bạn nhé. |
| 2 | | Dex [GEN] | One question: is there a meeting this week, and what's one thing you want to say there? | |
| 3 | | Turn | Hint **"On … I have a meeting about … I want to say …"** (Vào … mình có cuộc họp về … Mình muốn nói …) | |
| 4 | | Dex [GEN] | Plays the chair. "Okay, we're in the meeting. Anything to add?" | |
| 5 | | Turn | Make the point. Hint **"Can I add something? I think we should …"** (Cho mình góp một ý nhé? Mình nghĩ chúng ta nên …) | |
| 6 | | Dex [GEN] | As a colleague, one fair doubt. "Hmm. Isn't that a bit slow?" | |
| 7 | | Turn | Hint **"That's a fair point, but …"** (Bạn nói cũng có lý, nhưng …) · phrase *That's a fair point, but…* (builds on Episode 3) | |
| 8 | | Dex [GEN] | Steps out of the role: one strong thing, one thing to try (shorter, or a number) | |
| 9 | `s1-e4-rw-close` | Dex [REC] | "Clear and kind. Try it in your real meeting." | Rõ ràng mà vẫn nhẹ nhàng. Hãy thử nói vậy trong cuộc họp thật của bạn nhé. |

**At Visitor** (Dex runs a tiny meeting; three card turns from the episode):

| # | Who | Line or turn |
|---|---|---|
| 1 | Dex [GEN] | "I'm Dex. Meeting time! You start?" |
| 2 | Turn | Card **"Hello, everyone!"** (Chào mọi người!) · passes on hello, hi, everyone |
| 3 | Dex [GEN] | "My idea: lunch at twelve." |
| 4 | Turn | Cards **"Good idea!"** (Ý hay đó!) / **"I like it!"** (Mình thích ý này!) · passes on good, idea, like |
| 5 | Dex [GEN] | "Your idea?" |
| 6 | Turn | Task card: "Bạn góp một ý. Chọn một thẻ." · Cards **"Coffee at three?"** (Ba giờ uống cà phê nhé?) / **"Let's start at nine."** (Mình bắt đầu lúc chín giờ nhé.) · passes on coffee, start, three, nine |
| 7 | Dex [GEN] | "Good idea! Thank you, everyone." |

### Practice call · `s1-e4-practice` (Nell's time, then Teach the yapling)

| # | Id | Who | Line or turn | Vietnamese |
|---|---|---|---|---|
| 1 | `s1-e4-pr-open` | Pip [REC] | "I forgot the time on Nell's postcard. What did she say?" | Mình quên mất giờ ghi trên bưu thiếp của Nell. Nell hẹn mấy giờ nhỉ? |
| 2 | | Turn | The listening checkpoint (no Vietnamese). Hint **"She said: after …"** · passes when the answer has *four*; otherwise Pip plays Nell's postcard again, slower, and asks once more, and the second answer passes either way | |
| 3 | | Pip [GEN] | "After four! Okay. But first… what is a petition?" | |
| 4 | | Turn | Explain *petition*. Hint **"It's a paper. People sign it to ask for …"** (Là một tờ giấy. Mọi người ký vào đó để đề nghị …) | |
| 5 | | Pip [GEN] | Writes it in the learner's words, then: "And signature?" | |
| 6 | | Turn | Explain *signature*. Hint **"It's your name, written by you."** (Là tên của bạn, do chính bạn viết.) | |
| 7 | | Pip [GEN] | Tries a signature out loud and asks. "P, I, P… and a star? Is that a signature?" | |
| 8 | | Turn | Hint **"Yes! That's your signature."** (Đúng rồi! Đó là chữ ký của Pip.) | |
| 9 | `s1-e4-pr-close` | Pip [REC] | "Petition, signature, and my signature has a star. Ready for Bus 45!" | Kiến nghị, chữ ký, mà chữ ký của mình còn có ngôi sao nữa. Sẵn sàng lên xe buýt 45 rồi! |

**At Visitor** (the time, as Chapter 4; then two picture-word cards):

| # | Who | Line or turn |
|---|---|---|
| 1 | Pip [GEN] | "Nell's postcard! What time?" |
| 2 | Turn | Task card: "Nghe lại bưu thiếp của Nell, rồi chọn giờ." · Cards **"At four."** (Lúc bốn giờ.) / **"At nine."** (Lúc chín giờ.) · *four* passes; *nine* gets Pip's "Again?" (live) and Nell's postcard plays again, slower |
| 3 | — | Picture card: a sheet of paper with many names, the word PETITION |
| 4 | Pip [GEN] | "Petition? What is it?" |
| 5 | Turn | Task card: "Giải thích từ cho Pip: chọn một thẻ." · Cards **"It's names on paper."** (Là tên mọi người trên một tờ giấy.) / **"People sign it."** (Mọi người ký vào đó.) · passes on names, paper, sign |
| 6 | — | Picture card: a name written by hand, with a star, the word SIGNATURE |
| 7 | Pip [GEN] | "Signature? What is it?" |
| 8 | Turn | Cards **"It's your name."** (Là tên của bạn.) / **"You write your name."** (Bạn tự viết tên mình.) · passes on name, write |
| 9 | Pip [GEN] | "Got it! Thank you!" |

### Between calls

**Pip's story** · `s1-e4-story` [REC, about 40 s] · seeded with *What do you think?*

| Id | Line | Vietnamese |
|---|---|---|
| `s1-e4-story-01` | "I made a poster for the petition. Big letters. Very big." | Mình làm một tấm áp phích cho bản kiến nghị. Chữ to. Rất to. |
| `s1-e4-story-02` | "It says: SAVE THE CAFÉ. SIGN HERE." | Trên đó ghi: CỨU QUÁN CÀ PHÊ. KÝ VÀO ĐÂY. |
| `s1-e4-story-03` | "I showed Nell. I asked, 'What do you think?'" | Mình đưa Nell xem. Mình hỏi: "Nell thấy sao?" |
| `s1-e4-story-04` | "Nell looked at it for a long time. Then she said, 'Count the f's, love.'" | Nell nhìn nó rất lâu. Rồi Nell nói: "Đếm thử xem có mấy chữ f nào." |
| `s1-e4-story-05` | "I counted. C, A, F, F, F, E. Three f's! Oops." | Mình đếm: C, A, F, F, F, E. Ba chữ f! Ối. |
| `s1-e4-story-06` | "Now it says CAFÉ, with one f. And a small star. Stars make everything better." | Giờ thì ghi đúng CAFÉ, một chữ f thôi. Thêm một ngôi sao nhỏ. Có sao là cái gì cũng đẹp hơn. |

**Nell's postcard** [REC] `s1-e4-postcard-nell` (day 2; Nell's move-in, and the time the practice call asks for): "It's Nell from the Lantern Inn: great meeting! The petition papers are ready at my desk after four." · Nell ở quán trọ Lantern đây: cuộc họp tuyệt lắm! Giấy kiến nghị để sẵn ở quầy của mình, sau bốn giờ ghé lấy nhé. *(At Visitor the Vietnamese shows under each line, as for every postcard; the checkpoint is the number, as in Chapter 4.)*

**Cliffhanger voicemail** [REC, Nell] `s1-e4-05`: "We need a hundred signatures by Friday. Pip's very excited. Pip's also never spoken to strangers. Good luck, love."
**Recap if missed** [REC, Pip] `s1-e4-09`, a re-take of `s1-e4-06` (a 16-word sentence, "in charge"): "While you were away, the town met at Nell's inn. You ran the meeting! The plan: a petition, a hundred names. And I have to get them. Help!" · Trong lúc bạn đi vắng, cả thị trấn đã họp ở quán trọ của Nell. Bạn chủ trì cuộc họp đó! Kế hoạch là: một bản kiến nghị, một trăm chữ ký. Và mình phải đi xin chữ ký. Cứu với!

---

## Episode 5 — The Petition

**Logline.** Pip rides Bus 45 collecting signatures. At each stop you have a few seconds to convince a passenger. "Pass it on" becomes the story.
**Learning focus.** Short persuasive pitch; telling a story with a point; adapting the same message to different listeners.
**Then and now.** Stop 3 is week 1's Pass it on with a point. After the call, the after-call card puts the learner's Flow from week 1's Pass it on next to stop 3's ("48 seconds without stopping. In week 1 it was 20.").
**Real-week call.** Your own 60-second self-pitch (for work, a client or an interview), with Dex.
**Practice call.** Pass it on on Bus 45: tell the petition story to Linh and Mei, who weren't on the bus, then to Bea (90/60/45 s). Bea's postcard on day 2 invites it.

### Week 5 (story days 29–35)

| Day | The day's thing | Scene | Ring slot |
|---|---|---|---|
| 1 | The episode, then the then-and-now card | `s1-e5` | 1 |
| 2 | Pip's story: the street light; Bea's postcard (`s1-e5-11`) | `s1-e5-story`, `s1-e5-postcard` | |
| 3 | Real-week call with Dex | `s1-e5-real-week` | 2 |
| 4 | Practice call on Bus 45 | `s1-e5-practice` | 3 |
| 5 | Mei's voicemail (`s1-e5-06`) | `s1-e5-voicemail` | |
| 6 | Pip's minute | daily | |
| 7 | The week's wrap | | |

*Pip's story moves from day 3 to day 2, with the postcard, so day 3 is the real-week call as in every other week.*

### Episode call · `s1-e5` (Newcomer and up)

| # | Id | Who | Line or turn | Vietnamese |
|---|---|---|---|---|
| 1 | `s1-e5-09` | Bea [REC, re-take of `s1-e5-02`] | "Morning! You can talk about your petition until the next stop." | Chào buổi sáng! Bạn được nói về bản kiến nghị cho tới trạm kế tiếp nhé. |
| 2 | `s1-e5-08` | Pip [REC, whisper] | "Strangers! Can you go first, please?" | Người lạ! Bạn nói trước giúp mình nhé? |
| 3 | | Commuter [GEN] | Sleepy and kind. "Mm? A petition? What for?" | |
| 4 | | Turn | Stop 1 · 90 s (Neighbour 75, Regular 60) · Hint, English only **"Here's the thing: … It matters because … Would you sign?"** · phrases *Here's the thing*, *It matters because…*, *Would you sign?* · can-do *Give a 45-second pitch* | |
| 5 | | Commuter [GEN] | One simple question. "Is the café nice?" | |
| 6 | | Turn | Hint **"Yes! The kaya toast is the best in town."** (Có chứ! Bánh mì nướng kaya ở đó ngon nhất thị trấn.) | |
| 7 | | Commuter [GEN] | Signs. Pip counts quietly: "Seventy-one!" | |
| 8 | | Parent [GEN] | In a hurry. "Quickly, please. Why should I sign?" | |
| 9 | | Turn | Stop 2 · 60 s (Neighbour 50, Regular 45) · Hint, English only **"It matters because … Would you sign? Thanks for listening!"** · phrases *It matters because…*, *Thanks for listening* | |
| 10 | | Parent [GEN] | Signs, already walking. "Done. Good luck!" | |
| 11 | | Tourist [GEN] | Off a boat from the harbour. "I'm only visiting. What café?" | |
| 12 | | Turn | Stop 3 · 45 s (Neighbour 40, Regular 30) · Hint, English only **"Here's the thing: the Lantern Café is the heart of the town. …"** · can-do *Tell a short story with a point* | |
| 13 | | Tourist [GEN] | Signs and asks the way. "How do I get there?" | |
| 14 | | Turn | Hint **"Go along the harbour. It's next to the bus stop."** (Đi dọc bến cảng. Quán ở ngay cạnh trạm xe buýt.) | |
| 15 | `s1-e5-03` | Pip [REC] | "Ninety-seven… ninety-eight… ninety-nine. We need ONE more." | Chín mươi bảy… chín mươi tám… chín mươi chín. Cần thêm MỘT chữ ký nữa thôi. |
| 16 | `s1-e5-04` | Bea [REC] | "Well, I haven't signed yet, have I? Cheers, love. Lovely story, that." (Bea's one "love" in the scene) | Ơ, mình còn chưa ký mà, phải không? Cảm ơn nhé. Câu chuyện hay lắm. |
| 17 | | Turn | Thank Bea. Hint **"Thanks for listening, Bea!"** (Cảm ơn Bea đã lắng nghe!) · phrase *Thanks for listening* | |
| 18 | `s1-e5-10` | Pip [REC, re-take of `s1-e5-05`] | "One hundred! You got shorter and better every time!" | Một trăm! Mỗi lần bạn lại nói ngắn hơn và hay hơn! |
| 19 | | — | Fluency mirror from stop 1 to stop 3; the then-and-now card after the call | |

**Stage scaling.** Times: Newcomer 90/60/45 s · Neighbour 75/50/40 · Regular 60/45/30 · Local adds an objection at every stop · Voice adds a sceptical passenger who argues back. `s1-e5-02` ("Go on then, love…", an idiom and a second "love" in the scene) and `s1-e5-05` ("amazing", above A2) are retired for `s1-e5-09` and `s1-e5-10`.

### Episode call at Visitor

One card line per stop, modelled by Bea first; 20, 20 and 15 s; every passenger signs.

| # | Id | Who | Line or turn | Vietnamese |
|---|---|---|---|---|
| 1 | `s1-e5-visitor-bea` | Bea [REC] | "Morning, love! Listen to me first." | Chào buổi sáng! Nghe mình nói trước nhé. |
| 2 | `s1-e5-visitor-bea-model` | Bea [REC] | "Please sign. It's for Mei's café." (to a passenger: the model) | Ký giúp nhé. Là để giúp quán của Mei. |
| 3 | `s1-e5-visitor-pip` | Pip [REC, whisper] | "So many people! You go first?" | Đông người quá! Bạn nói trước nhé? |
| 4 | | — | Task card: "Mỗi trạm, đọc thẻ cho một hành khách. Ai cũng sẽ ký." | |
| 5 | | Commuter [GEN] | "Hm? Yes?" | |
| 6 | | Turn | Stop 1 · 20 s · Cards **"Please sign. It's for Mei's café."** (Ký giúp nhé. Là để giúp quán của Mei.) / **"Hello! Please sign."** (Xin chào! Ký giúp nhé.) · passes on sign, please, café | |
| 7 | | Commuter [GEN] | Signs. "Okay! Here you go." | |
| 8 | | Turn | Card **"Thank you!"** (Cảm ơn!) · passes on thank, thanks | |
| 9 | | Parent [GEN] | "Quick, please!" | |
| 10 | | Turn | Stop 2 · 20 s · the same two cards | |
| 11 | | Parent [GEN] | Signs. "Done. Bye!" | |
| 12 | | Tourist [GEN] | "What café?" | |
| 13 | | Turn | Stop 3 · 15 s · Cards **"Mei's café. It's very good."** (Quán của Mei. Ngon lắm.) / **"The Lantern Café. Please sign."** (Quán Lantern. Ký giúp nhé.) · passes on café, Mei, sign, good | |
| 14 | | Tourist [GEN] | Signs. "Okay! Thank you." | |
| 15 | `s1-e5-visitor-count` | Pip [REC] | "Ninety-nine names! One more!" | Chín mươi chín chữ ký! Thêm một nữa thôi! |
| 16 | `s1-e5-visitor-bea-signs` | Bea [REC] | "Wait! I can sign!" | Khoan đã! Mình ký được mà! |
| 17 | | Turn | Cards **"Thank you, Bea!"** (Cảm ơn Bea!) / **"Thanks for listening!"** (Cảm ơn bạn đã lắng nghe!) · passes on thank, thanks | |
| 18 | `s1-e5-visitor-pip-100` | Pip [REC] | "One hundred! You were great!" | Một trăm chữ ký! Bạn giỏi quá! |

### Real-week call · `s1-e5-real-week` (Dex)

| # | Id | Who | Line or turn | Vietnamese |
|---|---|---|---|---|
| 1 | `s1-e5-rw-open` | Dex [REC] | "A hundred names in one ride. Now, a short talk about you." | Một trăm chữ ký chỉ trong một chuyến xe. Giờ đến một bài nói ngắn về chính bạn. |
| 2 | | Dex [GEN] | "Who is it for? A boss, a client, or an interview?" | |
| 3 | | Turn | Hint **"It's for … (my boss / a client / an interview)."** (Để nói với … (sếp / khách hàng / người phỏng vấn).) | |
| 4 | | Dex [GEN] | Plays that person in one line, then: "Sixty seconds. Go when you're ready." | |
| 5 | | Turn | 60 s (Neighbour 50, Regular 45) · Hint **"Here's the thing: I'm … I'm good at … For example, … It matters because …"** (Chuyện là thế này: mình là … Mình giỏi … Ví dụ, … Điều đó quan trọng vì …) · builds on Episodes 2 and 5 | |
| 6 | | Dex [GEN] | One strong thing, and one thing to add (a number or an example) | |
| 7 | | Turn | Once more, with that one thing. Hint **"Same pitch, plus one number."** (Như lúc nãy, thêm một con số.) | |
| 8 | `s1-e5-rw-close` | Dex [REC] | "Much better. Sixty seconds, and I wanted to hear more." | Tốt hơn nhiều. Sáu mươi giây, mà tôi vẫn muốn nghe thêm. |

**At Visitor** (the self-introduction from week 1, day 4, now with week 2's "I'm good at"):

| # | Who | Line or turn |
|---|---|---|
| 1 | Dex [GEN] | "I'm Dex. Tell me about you!" |
| 2 | Turn | Task card: "Giới thiệu bản thân: từng câu một." · Card **"Hi, I'm {name}."** (Xin chào, mình là {name}.) · passes on hi, hello, I'm, their name |
| 3 | Turn | Cards **"I'm a …"** (Mình là …) / **"I work at …"** (Mình làm ở …) · passes on I'm a, I work, or any job word |
| 4 | Turn | Cards **"I'm good at …"** (Mình giỏi …) · passes on good |
| 5 | Turn | Task card: "Giờ nói cả ba câu liền nhau nhé." · Card **"Hi, I'm {name}. I'm a … I'm good at …"** · passes on hi, I'm, good, their name |
| 6 | Dex [GEN] | "Great pitch! Well done." |

### Practice call · `s1-e5-practice` (Pass it on, on Bus 45)

| # | Id | Who | Line or turn | Vietnamese |
|---|---|---|---|---|
| 1 | `s1-e5-pr-open` | Pip [REC] | "Linh and Mei weren't on the bus. Tell them our petition story!" | Linh với Mei không đi chuyến xe đó. Bạn kể chuyện xin chữ ký cho hai người nghe nhé! |
| 2 | | Turn | Round 1, to Linh · 90 s (Neighbour 75, Regular 60) · Hint, English only **"First, … Then, … In the end, …"** · can-do *Tell a short story with a point* | |
| 3 | | — | Fluency mirror 1 | |
| 4 | | Mei [GEN] | "Linh told me a bit. Tell me too? One minute." | |
| 5 | | Turn | Round 2, to Mei · 60 s · the same hint, English only **"First, … Then, … In the end, …"** | |
| 6 | | — | Fluency mirror 2 | |
| 7 | | Bea [GEN] | At the last stop. "Your turn, love. Before the next stop!" | |
| 8 | | Turn | Round 3, to Bea · 45 s · the same hint | |
| 9 | | — | Fluency mirror 3 | |
| 10 | `s1-e5-pr-close` | Pip [REC] | "Three friends! Bea says it's her favourite story this week." | Ba người bạn! Bea bảo đây là câu chuyện Bea thích nhất tuần này. |

**At Visitor:** rounds of 30, 25 and 20 s, the frame on English cards from the start: **"We got a hundred names."** / **"Bea signed last."** / **"Mei is happy."** Every round passes when the timer ends.

### Between calls

**Pip's story** · `s1-e5-story` [REC, about 40 s] · seeded with *Here's the thing* · a secret from before the ride.

| Id | Line | Vietnamese |
|---|---|---|
| `s1-e5-story-01` | "Can I tell you a secret? Before Bus 45, I practised what to say." | Kể bạn nghe một bí mật nhé? Trước chuyến xe 45, mình đã tập trước những gì sẽ nói. |
| `s1-e5-story-02` | "Not with a person. With a street light, outside the bread shop." | Không phải với người đâu. Với một cây đèn đường, ngoài tiệm bánh mì. |
| `s1-e5-story-03` | "I said, 'Excuse me, street light. Here's the thing. Mei's café might close.'" | Mình nói: "Xin lỗi, đèn đường ơi. Chuyện là thế này. Quán của Mei có thể phải đóng cửa." |
| `s1-e5-story-04` | "The street light said nothing. Very quiet. Very tall." | Cây đèn đường chẳng nói gì. Rất im lặng. Rất cao. |
| `s1-e5-story-05` | "I said it again, slower. Then a bird sat on top and looked at me." | Mình nói lại, chậm hơn. Rồi một con chim đậu lên trên và nhìn mình. |
| `s1-e5-story-06` | "The street light didn't sign. But the bird listened to the end. That's a start!" | Cây đèn không ký. Nhưng con chim nghe tới cuối. Vậy cũng là một khởi đầu rồi! |

**Bea's postcard** [REC] `s1-e5-11`, a re-take of `s1-e5-01` ("sharp", above A2) (day 2, the invitation to the practice ride): "Bus 45 leaves at nine o'clock. Bring your best story, love." · Xe buýt 45 chạy lúc chín giờ. Mang theo câu chuyện hay nhất của bạn nhé. *(Week 1's day-5 knock keeps "nine sharp"; that is copy in `knocks.*`, not a recording.)*

**Cliffhanger voicemail** [REC, Mei] `s1-e5-06`: "A hundred names! The office says the town can vote on Saturday. In the square. In front of everyone. Will you speak for the café?"
**Recap if missed** [REC, Pip] `s1-e5-12`, a re-take of `s1-e5-07` (a 13-word sentence, "signatures"): "While you were away, we got a hundred names on Bus 45. Bea signed last! Now there's a vote. Mei wants you to speak." · Trong lúc bạn đi vắng, chúng mình đã xin được một trăm chữ ký trên xe buýt 45. Bea ký cuối cùng! Giờ sắp có cuộc bỏ phiếu. Mei muốn bạn lên phát biểu.

---

## Episode 6 — The Town Meeting

**Logline.** The whole town gathers in the square. You speak for the café, answer one question, and the town votes. Mei stays.
**Learning focus.** A short structured speech; answering a question from the floor; thanking a group.
**Real-week call.** "How did it go?": Pip asks about a real event the learner mentioned earlier in the season (from memory), or rehearses one coming up.
**Practice call.** Accent warm-up: six neighbours send well-done postcards; the learner answers each one with a phrase from the season.

### Week 6 (story days 36–42)

| Day | The day's thing | Scene | Ring slot |
|---|---|---|---|
| 1 | The episode (the finale; the bunting is up in the square on the town map) | `s1-e6` | 1 |
| 2 | Pip's story: the moon; six postcards arrive together | `s1-e6-story`, `s1-e6-postcards` | |
| 3 | Real-week call with Pip | `s1-e6-real-week` | 2 |
| 4 | Practice call: answer the six postcards | `s1-e6-practice` | 3 |
| 5 | Pip's voicemail: Bunting Week is coming | `s1-e6-voicemail` | |
| 6 | Pip's minute | daily | |
| 7 | The week's wrap: the season's last ring | | |

*The outline had good-luck postcards arriving through the week, but the vote is on day 1, so they are well-done notes now, and each ends with something to answer.*

### Episode call · `s1-e6` (Newcomer and up)

| # | Id | Who | Line or turn | Vietnamese |
|---|---|---|---|---|
| 1 | `s1-e6-08` | Pip [REC] | "Want to practise your speech first? Just once, with me." | Bạn có muốn tập bài phát biểu trước không? Một lần thôi, với mình. |
| 2 | | Turn | Yes or no. Hint **"Yes, please."** / **"No, let's go!"** (Có, tập nhé. / Thôi, đi luôn!) · yes: one untimed run with row 6's hint, then Pip [GEN] names one good thing; no: straight to the square | |
| 3 | | — | The town square: bunting, the crowd (`s1-e6-sfx-crowd-murmur`) | |
| 4 | `s1-e6-11` | Mags [REC, re-take of `s1-e6-01`] | "The office wants to sell 12 Harbour Lane. Does anyone want to speak?" | Văn phòng muốn bán toà nhà số 12 đường Harbour. Có ai muốn phát biểu không? |
| 5 | `s1-e6-12` | Pip [REC, whisper, re-take of `s1-e6-02`] | "You can do it. First, second, thank you, like we practised." | Bạn làm được mà. Thứ nhất, thứ hai, cảm ơn, như mình đã tập. |
| 6 | | Turn | The speech · 60 s (Neighbour 75, Regular 90) · Hint **"I'd like to say a few words. First, … Second, … Thank you."** (Tôi xin phép nói vài lời. Thứ nhất, … Thứ hai, … Xin cảm ơn.) · phrases *I'd like to say a few words*, *First,… Second,…* · can-do *Speak in front of a group* | |
| 7 | | Hank [GEN] | A friendly but real question from the floor, at Newcomer speed. "One café. Why does it matter?" | |
| 8 | | Turn | Hint **"That's a great question. It matters because …"** (Câu hỏi hay quá. Điều đó quan trọng vì …) · phrase *That's a great question* · can-do *Make a short case and answer a question* (builds on Episode 5) | |
| 9 | | — | The vote: hands up, then the cheer (`s1-e6-sfx-crowd-cheer`) | |
| 10 | `s1-e6-03` | Mags [REC] | "The town has voted. The café stays." | Thị trấn đã bỏ phiếu. Quán cà phê được ở lại. |
| 11 | `s1-e6-10` | Mei [REC, crying and laughing, re-take of `s1-e6-04`] | "Shiok! Thank you, everyone, especially you." | Đã quá! Cảm ơn mọi người, nhất là bạn. |
| 12 | | Turn | Thank the town. Hint **"Thank you all. …"** (Cảm ơn tất cả mọi người. …) · phrase *Thank you all* | |
| 13 | `s1-e6-09` | Pip [REC] | "Look! Your name is on the flags!" (the bunting spells the learner's name) | Nhìn kìa! Tên bạn ở trên dây cờ! |
| 14 | `s1-e6-07` | Hank [REC] | "Full price, fifty kilos, Mei. Don't tell anyone." | Giá gốc, năm mươi ký nhé, Mei. Đừng nói với ai đấy. |
| 15 | `s1-e6-05` | Pip [REC] | "Look! In the harbour. A boat. Who's on it?" | Nhìn kìa! Ngoài bến cảng. Một con thuyền. Ai ở trên đó vậy? |

**Stage scaling.** Neighbour: 75 s speech, two questions. Regular: 90 s, Mags raises an objection. Local+: a rival speaker argues for the sale and the learner responds. Retired: `s1-e6-01` ("proposes", above A2), `s1-e6-02` (three sentences) and `s1-e6-04` ("shiok" and "lah" in one line; Mei keeps one regional word a scene).

### Episode call at Visitor

A three-line speech built one line at a time, then once together (as week 1's day 4).

| # | Id | Who | Line or turn | Vietnamese |
|---|---|---|---|---|
| 1 | `s1-e6-visitor-mags` | Mags [REC] | "Does anyone want to speak?" | Có ai muốn phát biểu không? |
| 2 | `s1-e6-visitor-pip` | Pip [REC, whisper] | "You can do it. Line by line." | Bạn làm được mà. Từng câu một thôi. |
| 3 | | Turn | Task card: "Bài phát biểu ba câu. Nói từng câu một." · Card **"Hello, everyone."** (Chào mọi người.) · passes on hello, hi, everyone | |
| 4 | | Turn | Card **"I love Mei's café."** (Mình rất yêu quán của Mei.) · passes on love, like, café | |
| 5 | | Turn | Card **"Please say yes. Thank you!"** (Mọi người đồng ý nhé. Cảm ơn!) · passes on please, yes, thank | |
| 6 | | Turn | Task card: "Giờ nói cả ba câu liền nhau nhé." · Card **"Hello, everyone. I love Mei's café. Please say yes. Thank you!"** · passes on hello, café, yes, thank | |
| 7 | `s1-e6-visitor-hank` | Hank [REC] | "Good speech. But why this café?" | Nói hay lắm. Nhưng sao lại là quán này? |
| 8 | | Turn | Task card: "Hank hỏi một câu. Chọn thẻ để trả lời." · Cards **"It's our café."** (Đó là quán của chúng ta.) / **"Mei is our friend."** (Mei là bạn của chúng ta.) · passes on our, friend, café, Mei | |
| 9 | `s1-e6-visitor-hank-yes` | Hank [REC] | "Okay. I say yes!" | Được. Tôi đồng ý! |
| 10 | `s1-e6-visitor-mags-vote` | Mags [REC] | "The town says yes. The café stays!" | Thị trấn đồng ý. Quán cà phê được ở lại! |
| 11 | `s1-e6-visitor-mei` | Mei [REC] | "Thank you lah! You were great!" | Cảm ơn nhiều nha! Bạn giỏi lắm! |
| 12 | | Turn | Card **"Thank you all!"** (Cảm ơn tất cả mọi người!) · passes on thank, all, everyone | |
| 13 | `s1-e6-visitor-flags` | Pip [REC] | "Look! Your name! On the flags!" | Nhìn kìa! Tên bạn! Ở trên dây cờ! |
| 14 | `s1-e6-visitor-boat` | Pip [REC] | "Look! A boat! Who's on it?" | Nhìn kìa! Một con thuyền! Ai ở trên đó vậy? |

### Real-week call · `s1-e6-real-week` (Pip)

| # | Id | Who | Line or turn | Vietnamese |
|---|---|---|---|---|
| 1 | `s1-e6-rw-open` | Pip [REC] | "I have a question from my notebook. A real one." | Mình có một câu hỏi trong sổ tay. Câu hỏi thật đấy. |
| 2 | | Pip [GEN] | From memory, one real thing the learner mentioned this season (week 3's "no", week 4's meeting, week 5's pitch). "In week three, you had to say no at work. How did it go?" With nothing in memory: "Is something big coming up for you?" (then rows 6–7 only) | |
| 3 | | Turn | Hint **"It went well. I said … / It was hard, because …"** (Ổn lắm. Mình đã nói … / Hơi khó, vì …) · past tense | |
| 4 | | Pip [GEN] | One follow-up. "What did they say?" | |
| 5 | | Turn | Hint **"They said … Then I …"** (Họ nói … Sau đó mình …) | |
| 6 | | Pip [GEN] | "What's next? Anything coming up?" | |
| 7 | | Turn | Hint **"Next week, I have to …"** (Tuần sau, mình phải …) · then a 30-second rehearsal of it if they want one | |
| 8 | `s1-e6-rw-close` | Pip [REC] | "I'm so happy for you. Tell a friend about it, too!" | Mình mừng cho bạn lắm. Kể cho một người bạn nghe nữa nhé! |

**At Visitor** (three card turns about this week; Pip models first):

| # | Who | Line or turn |
|---|---|---|
| 1 | Pip [GEN] | "My week: very good! Your week?" |
| 2 | Turn | Task card: "Pip hỏi về tuần của bạn. Chọn một thẻ." · Cards **"A good week."** (Một tuần vui.) / **"A busy week."** (Một tuần bận rộn.) · passes on good, busy, week |
| 3 | Pip [GEN] | "I like the flags. And you?" |
| 4 | Turn | Cards **"I like the café."** (Mình thích quán cà phê.) / **"I like my job."** (Mình thích công việc của mình.) · passes on like |
| 5 | Pip [GEN] | "Tomorrow I work. And you?" |
| 6 | Turn | Cards **"I work tomorrow."** (Mai mình đi làm.) / **"I rest tomorrow."** (Mai mình nghỉ.) · passes on work, rest, tomorrow |
| 7 | Pip [GEN] | "Writing it down!" |

### Practice call · `s1-e6-practice` (accent warm-up: answer six postcards)

Pip opens and closes live ([GEN]: "Six postcards! Let's answer them, one by one." · "Six answers! Everyone will be so happy."). Each postcard plays (recorded at the neighbour's natural pace), then one turn. Each answer is a phrase from a different episode, so the warm-up is also a season review.

| # | Id | Who | Postcard | Vietnamese | Turn: hint (Newcomer) | Visitor cards |
|---|---|---|---|---|---|---|
| 1 | `s1-e6-postcard-linh` | Linh | "You spoke to the whole town! How did you get so brave?" | Bạn đã nói trước cả thị trấn! Sao bạn dũng cảm vậy? | **"That's a great question! …"** (Câu hỏi hay quá! …) · Episode 6 | **"Thank you!"** (Cảm ơn!) |
| 2 | `s1-e6-postcard-mei` | Mei | "The café is staying! Ok, so what's the plan for the party?" | Quán được ở lại rồi! Ok, vậy tiệc tính sao đây? | **"I think you should …"** (Mình nghĩ bạn nên …) · Episode 1 | **"A party! Yes!"** (Tiệc! Đồng ý!) |
| 3 | `s1-e6-postcard-sol` | Sol | "Pip is doing great at work. Can you come to our team lunch on Friday?" | Pip làm việc tốt lắm. Thứ Sáu bạn đến ăn trưa với nhóm mình được không? | **"I'd love to! Just to confirm: Friday?"** (Mình rất muốn! Cho mình xác nhận lại: thứ Sáu nhé?) · Episode 2 | **"Yes, please!"** (Có, cảm ơn nhé!) |
| 4 | `s1-e6-postcard-hank` | Hank | "Full price, fifty kilos, every month. Deal?" | Giá gốc, năm mươi ký, tháng nào cũng vậy. Chốt không? | **"Deal!"** (Chốt!) · Episode 3 | **"Deal!"** (Chốt!) |
| 5 | `s1-e6-postcard-nell` | Nell | "The inn wants a party for the café. What do you think?" | Quán trọ muốn mở tiệc mừng cho quán cà phê. Bạn thấy sao? | **"Good idea, and …"** (Ý hay đó, và …) · Episode 4 | **"Good idea!"** (Ý hay đó!) |
| 6 | `s1-e6-postcard-bea` | Bea | "Tell me again, love. Why does the café matter to you?" | Kể lại cho mình nghe nào. Vì sao quán cà phê quan trọng với bạn? | **"Here's the thing: … It matters because …"** (Chuyện là thế này: … Điều đó quan trọng vì …) · Episode 5 | **"I love Mei's café."** (Mình rất yêu quán của Mei.) |

**At Visitor** each postcard plays at its natural pace on purpose (as Bea's ticket line in Chapter 4), so every turn also shows **"Sorry? Again, please."**: saying it replays the postcard slower and the turn passes; the answer card passes on its words. Task card before the first: "Hàng xóm gửi bưu thiếp. Nghe, rồi chọn thẻ để trả lời. Nghe không kịp thì nói: Sorry? Again, please."

### Between calls

**Pip's story** · `s1-e6-story` [REC, about 40 s] · seeded with *First,… Second,…* · the night before the meeting. (Owls say "hoo", which sounds like *who*.)

| Id | Line | Vietnamese |
|---|---|---|
| `s1-e6-story-01` | "The night before the meeting, I couldn't sleep." | Đêm trước buổi họp, mình không ngủ được. |
| `s1-e6-story-02` | "So I went outside and practised your speech. To the moon." | Thế là mình ra ngoài tập bài phát biểu của bạn. Tập với mặt trăng. |
| `s1-e6-story-03` | "'I'd like to say a few words,' I said. The moon said nothing. It was busy being round." | "Tôi xin phép nói vài lời," mình nói. Mặt trăng chẳng nói gì. Nó còn bận tròn. |
| `s1-e6-story-04` | "'First, the café is our home. Second, Mei makes the best toast.'" | "Thứ nhất, quán cà phê là nhà của chúng ta. Thứ hai, Mei làm bánh mì nướng ngon nhất." |
| `s1-e6-story-05` | "An owl said, 'Who? Who?' And I said, 'Mei! Mei's café!'" | Một con cú kêu: "Ai? Ai?" Mình đáp: "Mei! Quán của Mei!" |
| `s1-e6-story-06` | "Then I said, 'Thank you all,' to the moon and the owl. And I went to bed." | Rồi mình nói "Cảm ơn tất cả" với mặt trăng và con cú. Rồi mình đi ngủ. |

**Six postcards** (day 2, together, from Linh, Mei, Sol, Hank, Nell and Bea): the table above. They stay in the postcard list, and the practice call plays them back.

**Voicemail** [REC, Pip] `s1-e6-vm-bunting` (day 5): "Big news! The little flags in the square stay up for a whole week. It's called Bunting Week. It starts next week!" · Tin vui đây! Mấy dây cờ nhỏ ở quảng trường sẽ treo suốt một tuần. Gọi là Tuần Cờ Dây. Tuần sau là bắt đầu rồi!
**Recap if missed** [REC, Pip] `s1-e6-06`: "While you were away… actually, no. I waited. The town meeting is today, and you're speaking. Ready?" *(The finale never happens without the learner.)*

**Season finale payoffs (all automatic):** can-dos ticked, the last ring of the season; the season keepsake, the then-and-now card and the boat come in Bunting Week.

---

## Bunting Week (week 7, the festival)

*Natterwick's own festival, tied to nothing outside the town: after a town vote, the little flags stay up in the square for a week, and each flag carries something someone said. This year the flags carry the learner's phrases.* No new story pressure (`journey-and-story.md` §2.3). The ring's three slots each take any call of their kind: replay any episode at today's stage, any real-week call (always new, because it's about this week), any practice call.

| Day | The day's thing | Scene |
|---|---|---|
| 1 | Bunting Week opens: the town map with the bunting, each flag one of the learner's phrases at leaf or bloom; the season keepsake (a tiny Lantern Café sign) on the burrow wall | |
| 2 | Pip's season story | `s1-fest-story` |
| 3 | Mei's thank-you postcard | `s1-fest-postcard` |
| 4 | Then and now: week 1's Pass it on next to week 5's petition and the season's best Flow | |
| 5 | Bea's voicemail: the boat | `s1-fest-voicemail` |
| 6 | Pip's minute | daily |
| 7 | The season's end: the residency card stamped "Season One", and what comes next | |

**Pip's season story** · `s1-fest-story` [REC, about 60 s] · the season told back. Line 1 is recorded without the name; the name is spliced in before it.

| Id | Line | Vietnamese |
|---|---|---|
| `s1-fest-story-01` | "{name}, this is the story of our season." | {name} ơi, đây là câu chuyện mùa này của chúng mình. |
| `s1-fest-story-02` | "Six weeks ago, Mei got a letter. Her rent doubled." | Sáu tuần trước, Mei nhận được một lá thư. Tiền thuê nhà tăng gấp đôi. |
| `s1-fest-story-03` | "You asked, 'What's wrong?' Then you called the office for her." | Bạn hỏi: "Có chuyện gì vậy?" Rồi bạn gọi điện cho văn phòng giúp Mei. |
| `s1-fest-story-04` | "I had my first interview. You helped me, and I got the job!" | Mình đi phỏng vấn lần đầu. Bạn giúp mình, và mình được nhận! |
| `s1-fest-story-05` | "Hank wanted cheaper beans. You said no, so kindly. He said, 'Deal.'" | Hank muốn mua hạt cà phê rẻ hơn. Bạn từ chối thật khéo. Ông ấy nói: "Chốt." |
| `s1-fest-story-06` | "You ran the meeting at Nell's inn. Everyone had a turn." | Bạn chủ trì cuộc họp ở quán trọ của Nell. Ai cũng được nói. |
| `s1-fest-story-07` | "We rode Bus 45 and got a hundred names. Bea signed last." | Chúng mình đi xe buýt 45 và xin được một trăm chữ ký. Bea ký cuối cùng. |
| `s1-fest-story-08` | "Then you spoke in front of the whole town. And the café stays." | Rồi bạn phát biểu trước cả thị trấn. Và quán cà phê được ở lại. |
| `s1-fest-story-09` | "I wrote it all in my notebook. The best pages are about you." | Mình ghi hết vào sổ tay. Những trang hay nhất là về bạn. |

**Mei's postcard** [REC] `s1-fest-postcard-mei`: "Thank you lah. The café stays because of you. Free kaya toast for you, all week!" · Cảm ơn nhiều nha. Quán còn là nhờ bạn đó. Cả tuần này bánh mì nướng kaya miễn phí cho bạn!

**Voicemail** [REC, Bea] `s1-fest-vm-boat`: "Bea here, love. That boat is still in the harbour. Nobody has come off it yet." · Bea đây. Con thuyền đó vẫn còn ở bến cảng. Chưa có ai bước xuống cả.

**Weeks 8 on, until the town weeks (Release 3):** the same ring of replays and new real-week calls, and Pip's minute on any day a phrase is due. The season map replays any episode at today's stage. The burrow says so plainly (copy in `vi-copy-review.md`), with no count of anything missed.

---

## Pip's minute (every day a phrase is due)

*Release 1.2 · `every-week-loop.md` §2.3.* About a minute in the burrow with Pip, two turns, built from recorded lines and say-this cards judged by their words: no model, no generated voice, no live minutes. It never makes a bloom (blooms come from using a phrase unprompted in a live call).

| Step | What plays | Lines |
|---|---|---|
| 1 | Pip opens (one of three; never the same one two days running) | `s1-pm-open-1..3` |
| 2 | Pip sets up a small moment where the due phrase fits | `s1-pm-<phrase>-setup` |
| 3 | **Turn:** the phrase card · shown at once at Visitor, after the stage's pause at Newcomer and Neighbour, a gloss on tap at Regular and up · passes on the words in the table | |
| 4 | Praise from the shared pool (`s1-set-pip-great`, `s1-set-pip-yes`) | |
| 5 | When `pickPipReuse` has a phrase: Pip says it slightly wrong, on purpose | `s1-pm-<phrase>-wrong` |
| 6 | **Turn:** fix it · the card is the right sentence (from the start at Visitor; after the pause at Newcomer) · passes only on the corrected words, so repeating Pip's mistake doesn't pass | |
| 7 | Pip closes (one of three) and writes the phrase in its notebook: the phrase grows | `s1-pm-close-1..3` |

At Visitor, the first Pip's minute opens with the task card "Một phút với Pip: đọc thẻ giúp Pip nhé." and the first fix turn with week 1's "Pip nói sai. Đọc câu đúng cho Pip nhé." Every line is Pip's own careful voice: at most 8 words, recorded once at speed 0.7 with `[pause]` between sentences, and played at every stage (Pip speaks below the learner anyway). Two set-ups are fast on purpose (speed 1.0), so the learner's answer is the lifesaver itself; the call then replays the line slower. Words match whole words ("example" doesn't match "examples").

### Open and close

| Id | Pip says | Vietnamese |
|---|---|---|
| `s1-pm-open-1` | "It's Pip's minute! Ready?" | Một phút với Pip đây! Sẵn sàng chưa? |
| `s1-pm-open-2` | "Quick question! Just one." | Hỏi nhanh nhé! Một câu thôi. |
| `s1-pm-open-3` | "Hi! My notebook needs you." | Chào bạn! Cuốn sổ của mình cần bạn giúp. |
| `s1-pm-close-1` | "Writing it down. Thank you!" | Mình ghi lại đây. Cảm ơn bạn! |
| `s1-pm-close-2` | "In my notebook! See you later!" | Vào sổ tay rồi! Lát gặp nhé! |
| `s1-pm-close-3` | "Got it! You're a good teacher." | Mình nhớ rồi! Bạn dạy hay ghê. |

### Set-ups (one per phrase)

| Phrase | Id | Pip says | Vietnamese | Card · passes on |
|---|---|---|---|---|
| *Nice to meet you* | `s1-pm-nice-to-meet-you-setup` | "A new neighbour! What do I say?" | Hàng xóm mới! Mình nói gì đây? | **"Nice to meet you!"** · nice, meet |
| *Yes, please* | `s1-pm-yes-please-setup` | "I have snacks. Want some?" | Mình có đồ ăn vặt đây. Bạn ăn không? | **"Yes, please!"** · yes, please |
| *Sorry? Again, please.* | `s1-pm-sorry-again-please-setup` | "Bea says the bus is late again today!" (**fast on purpose**, speed 1.0) | Bea nói hôm nay xe buýt lại trễ nữa! | **"Sorry? Again, please."** · sorry, again, pardon, repeat · the line replays slower |
| *Slowly, please.* | `s1-pm-slowly-please-setup` | "The library closes at five on Fridays!" (**fast on purpose**, speed 1.0) | Thư viện đóng cửa lúc năm giờ vào thứ Sáu đó! | **"Slowly, please."** · slow, slowly · the line replays slower |
| *How much?* | `s1-pm-how-much-setup` | "I want this cake. What do I ask?" | Mình muốn mua cái bánh này. Mình hỏi gì đây? | **"How much?"** · much, price |
| *I'm from …* | `s1-pm-im-from-setup` | "A tourist asks: where are you from?" | Một du khách hỏi: bạn từ đâu đến? | **"I'm from …"** · from |
| *What's wrong?* | `s1-pm-whats-wrong-setup` | "Mei looks sad again. What do I ask?" | Mei lại trông buồn rồi. Mình hỏi gì đây? | **"What's wrong?"** · wrong, okay |
| *I need a plan* | `s1-pm-i-need-a-plan-setup` | "So many jobs today! What do I need?" | Hôm nay nhiều việc quá! Mình cần gì đây? | **"I need a plan."** · plan |
| *Can I help?* | `s1-pm-can-i-help-setup` | "Oh no, Linh's books! What do I say?" | Ôi, sách của Linh rơi kìa! Mình nói gì đây? | **"Can I help?"** · help |
| *I think you should…* | `s1-pm-i-think-you-should-setup` | "Bea is so tired. Any advice?" | Bea mệt quá. Bạn khuyên Bea một câu nhé? | **"I think you should …"** · think, should |
| *I'm good at…* | `s1-pm-im-good-at-setup` | "Sol asks: what are you good at?" | Sol hỏi: bạn giỏi việc gì? | **"I'm good at …"** · good at |
| *For example,…* | `s1-pm-for-example-setup` | "You're good at your job. How? Tell me!" | Bạn làm giỏi công việc của mình. Giỏi thế nào? Kể mình nghe! | **"For example, …"** · example |
| *I'd love to…* | `s1-pm-id-love-to-setup` | "Mei has a new cake. Want to try?" | Mei có bánh mới. Bạn ăn thử không? | **"I'd love to!"** · love |
| *Just to confirm…* | `s1-pm-just-to-confirm-setup` | "Sol says: meeting at nine. Check it!" | Sol nói: chín giờ họp. Bạn hỏi lại cho chắc nhé! | **"Just to confirm: nine?"** · confirm |
| *I'm sorry, we can't do that* | `s1-pm-sorry-we-cant-setup` | "A man wants free coffee. Every day!" | Có ông khách muốn uống cà phê miễn phí. Ngày nào cũng vậy! | **"I'm sorry, we can't do that."** · sorry, can't, cannot |
| *How about…?* | `s1-pm-how-about-setup` | "Hank wants a lower price. Offer something else?" | Hank muốn giá rẻ hơn. Bạn mời món khác nhé? | **"How about …?"** · how about |
| *That's a fair point, but…* | `s1-pm-fair-point-but-setup` | "Hank says: Big Bean is cheaper. Answer him?" | Hank nói: Big Bean rẻ hơn. Bạn trả lời ông ấy nhé? | **"That's a fair point, but …"** · fair point |
| *Deal* | `s1-pm-deal-setup` | "Hank says: free toast, full price. Okay?" | Hank nói: tặng bánh mì nướng, giữ nguyên giá. Được không? | **"Deal!"** · deal |
| *What do you think?* | `s1-pm-what-do-you-think-setup` | "Nell is very quiet. Ask her!" | Nell im lặng quá. Bạn hỏi Nell đi! | **"What do you think?"** · think |
| *Good idea, and…* | `s1-pm-good-idea-and-setup` | "Bea says: a cake sale! Add your idea?" | Bea nói: bán bánh! Bạn góp thêm ý nhé? | **"Good idea, and …"** · good idea |
| *Let's hear from…* | `s1-pm-lets-hear-from-setup` | "Bea talks and talks. Linh wants a turn." | Bea nói mãi không dừng. Linh muốn được nói. | **"Let's hear from Linh."** · hear from |
| *So, to sum up…* | `s1-pm-to-sum-up-setup` | "Long meeting! Say it short?" | Họp lâu quá! Bạn nói gọn lại nhé? | **"So, to sum up, …"** · sum up |
| *Here's the thing* | `s1-pm-heres-the-thing-setup` | "A man asks: why the petition?" | Có người hỏi: kiến nghị để làm gì? | **"Here's the thing: …"** · the thing |
| *It matters because…* | `s1-pm-it-matters-because-setup` | "Why is the café important? Tell me!" | Sao quán cà phê lại quan trọng? Kể mình nghe! | **"It matters because …"** · matters, because |
| *Would you sign?* | `s1-pm-would-you-sign-setup` | "A man on the bus. Get his name!" | Có một ông trên xe buýt. Xin chữ ký của ông ấy đi! | **"Would you sign?"** · sign |
| *Thanks for listening* | `s1-pm-thanks-for-listening-setup` | "My story is done. Bea is smiling!" | Mình kể xong rồi. Bea đang mỉm cười kìa! | **"Thanks for listening!"** · thanks, listening |
| *I'd like to say a few words* | `s1-pm-a-few-words-setup` | "A big party! You stand up and say…?" | Một bữa tiệc lớn! Bạn đứng lên và nói…? | **"I'd like to say a few words."** · few words |
| *First,… Second,…* | `s1-pm-first-second-setup` | "Two reasons. Say them in order?" | Hai lý do. Bạn nói lần lượt nhé? | **"First, … Second, …"** · first, second |
| *That's a great question* | `s1-pm-great-question-setup` | "A child asks: why is the sea blue?" | Một bạn nhỏ hỏi: sao biển lại màu xanh? | **"That's a great question!"** · great question |
| *Thank you all* | `s1-pm-thank-you-all-setup` | "Everyone helps us! What do I say?" | Mọi người đều giúp chúng mình! Mình nói gì đây? | **"Thank you all!"** · thank, all, everyone |

### Slightly wrong (where a natural mistake exists)

The mistakes are the ones Vietnamese learners make most (a missing *be* or *'s*, a missing article, *-s*, *-ing*, *to* after a modal, word order), said by Pip, never by the learner. The gloss gives the meaning; the mistake is only in the English. *Yes, please* and *Deal* have no natural wrong version and skip turn two.

| Phrase | Id | Pip says | Vietnamese | Fix card · passes on |
|---|---|---|---|---|
| *Nice to meet you* | `s1-pm-nice-to-meet-you-wrong` | "Nice to meeting you!" | Rất vui được gặp bạn! | **"Nice to meet you!"** · to meet |
| *Sorry? Again, please.* | `s1-pm-sorry-again-please-wrong` | "Sorry? Repeat me, please?" | Xin lỗi? Nói lại giúp mình nhé? | **"Sorry? Again, please."** · again |
| *Slowly, please.* | `s1-pm-slowly-please-wrong` | "Speak more slow, please!" | Nói chậm hơn chút nhé! | **"Slowly, please."** · slowly |
| *How much?* | `s1-pm-how-much-wrong` | "How many is the cake?" | Cái bánh này bao nhiêu tiền? | **"How much is the cake?"** · how much |
| *I'm from …* | `s1-pm-im-from-wrong` | "I from Far Meadow!" | Mình đến từ Far Meadow! | **"I'm from Far Meadow."** · i'm from, i am from |
| *What's wrong?* | `s1-pm-whats-wrong-wrong` | "What wrong, Mei?" | Có chuyện gì vậy, Mei? | **"What's wrong, Mei?"** · what's wrong, what is wrong |
| *I need a plan* | `s1-pm-i-need-a-plan-wrong` | "I need plan." | Mình cần một kế hoạch. | **"I need a plan."** · a plan |
| *Can I help?* | `s1-pm-can-i-help-wrong` | "Can I to help?" | Mình giúp được không? | **"Can I help?"** · can i help |
| *I think you should…* | `s1-pm-i-think-you-should-wrong` | "I think you should to sleep." | Mình nghĩ bạn nên đi ngủ. | **"I think you should sleep."** · should sleep |
| *I'm good at…* | `s1-pm-im-good-at-wrong` | "I'm good at draw maps." | Mình giỏi vẽ bản đồ. | **"I'm good at drawing maps."** · drawing |
| *For example,…* | `s1-pm-for-example-wrong` | "For examples, I like tea!" | Ví dụ, mình thích trà! | **"For example, I like tea!"** · for example |
| *I'd love to…* | `s1-pm-id-love-to-wrong` | "I love to, Mei!" | Có chứ, mình rất muốn, Mei ơi! | **"I'd love to, Mei!"** · i'd love, i would love |
| *Just to confirm…* | `s1-pm-just-to-confirm-wrong` | "Just for confirm: nine?" | Cho mình xác nhận lại: chín giờ nhé? | **"Just to confirm: nine?"** · to confirm |
| *I'm sorry, we can't do that* | `s1-pm-sorry-we-cant-wrong` | "Sorry, we don't can do that." | Xin lỗi, chúng tôi không làm vậy được. | **"Sorry, we can't do that."** · we can't, we cannot |
| *How about…?* | `s1-pm-how-about-wrong` | "How about give a cake?" | Hay là tặng một cái bánh? | **"How about a free cake?"** · about a |
| *That's a fair point, but…* | `s1-pm-fair-point-but-wrong` | "It's fair point, but I like Mei!" | Ông nói cũng có lý, nhưng mình thích quán Mei! | **"That's a fair point, but I like Mei!"** · a fair point |
| *What do you think?* | `s1-pm-what-do-you-think-wrong` | "What you think, Nell?" | Nell nghĩ sao? | **"What do you think, Nell?"** · do you think |
| *Good idea, and…* | `s1-pm-good-idea-and-wrong` | "Good ideas, and cookies!" | Ý hay đó, thêm bánh quy nữa! | **"Good idea, and cookies!"** · good idea |
| *Let's hear from…* | `s1-pm-lets-hear-from-wrong` | "Let we hear from Linh." | Mời Linh nói nhé. | **"Let's hear from Linh."** · let's hear, let us hear |
| *So, to sum up…* | `s1-pm-to-sum-up-wrong` | "To summary: a petition!" | Tóm lại: một bản kiến nghị! | **"So, to sum up: a petition!"** · sum up |
| *Here's the thing* | `s1-pm-heres-the-thing-wrong` | "Here is thing: the café!" | Chuyện là thế này: quán cà phê! | **"Here's the thing: the café!"** · the thing |
| *It matters because…* | `s1-pm-it-matters-because-wrong` | "It matter because Mei is kind!" | Điều đó quan trọng vì Mei tốt bụng! | **"It matters because Mei is kind!"** · it matters |
| *Would you sign?* | `s1-pm-would-you-sign-wrong` | "You would sign?" | Ông ký giúp được không? | **"Would you sign?"** · would you |
| *Thanks for listening* | `s1-pm-thanks-for-listening-wrong` | "Thanks for listen, Bea!" | Cảm ơn Bea đã lắng nghe! | **"Thanks for listening, Bea!"** · for listening |
| *I'd like to say a few words* | `s1-pm-a-few-words-wrong` | "I'd like to say a little words." | Tôi xin phép nói vài lời. | **"I'd like to say a few words."** · a few |
| *First,… Second,…* | `s1-pm-first-second-wrong` | "First, toast. Two, tea!" | Thứ nhất, bánh mì nướng. Thứ hai, trà! | **"First, toast. Second, tea!"** · second |
| *That's a great question* | `s1-pm-great-question-wrong` | "That's a great questions!" | Câu hỏi hay quá! | **"That's a great question!"** · great question |
| *Thank you all* | `s1-pm-thank-you-all-wrong` | "Thanks you all!" | Cảm ơn tất cả mọi người! | **"Thank you all!"** · thank you |

---

## Knocks, weeks 2–7 (draft copy)

Three a week, from the weekly plan (`every-week-loop.md` §2.6): the new episode (day 1), Pip's story (day 2), the voicemail (day 5). At most one a day, quiet hours, always an event, never guilt, none for Pip's minute. A knock from a character is a line they say and stays in English; a knock from Yapling is chrome and is in Vietnamese. **At Visitor every knock comes from Yapling** (the Vietnamese column), because a Visitor can't yet read a character's English on the lock screen. `{name}` is the roommate. The app lane puts these in `knocks.*`; the Vietnamese is in `vi-copy-review.md`.

| Week · day | From | English | Tiếng Việt (Yapling, and every Visitor knock) |
|---|---|---|---|
| 2 · 1 | Pip | Interview day! Sol is waiting. Come with me? | Hôm nay {name} đi phỏng vấn. Đi cùng {name} nhé? |
| 2 · 2 | Yapling | {name} tried on three things for the interview. | {name} đã thử ba món đồ cho buổi phỏng vấn. Nghe kể không? |
| 2 · 5 | Yapling | {name} left you a voicemail. | {name} để lại cho bạn một thư thoại. |
| 3 · 1 | Mei | A big customer is coming. Can you help at the counter? | Mei sắp có một vị khách lớn. Ra quầy giúp Mei nhé? |
| 3 · 2 | Yapling | {name} had its first morning at work. | {name} vừa có buổi sáng đầu tiên đi làm. Có chuyện để kể đây. |
| 3 · 5 | Yapling | Mei left you a voicemail. | Mei để lại cho bạn một thư thoại. |
| 4 · 1 | Nell | Meeting at the inn tonight. Tea's on. Bring an idea? | Tối nay họp ở quán trọ của Nell. Mang theo một ý tưởng nhé? |
| 4 · 2 | Yapling | {name} made a poster. Count the f's. | {name} vừa làm một tấm áp phích. Đếm thử mấy chữ f xem. |
| 4 · 5 | Yapling | Nell left you a voicemail. | Nell để lại cho bạn một thư thoại. |
| 5 · 1 | Bea | Petition day! Bus 45 leaves at nine. | Hôm nay đi xin chữ ký! Xe buýt 45 chạy lúc chín giờ. |
| 5 · 2 | Yapling | {name} has a secret to tell you. | {name} có một bí mật muốn kể bạn nghe. |
| 5 · 5 | Yapling | Mei left you a voicemail. | Mei để lại cho bạn một thư thoại. |
| 6 · 1 | Mei | The vote is today. The whole town is in the square. | Hôm nay bỏ phiếu. Cả thị trấn đang ở quảng trường. |
| 6 · 2 | Yapling | Six postcards came for you. | Có sáu tấm bưu thiếp gửi cho bạn. |
| 6 · 5 | Yapling | {name} left you a voicemail. | {name} để lại cho bạn một thư thoại. |
| 7 · 1 | Yapling | Bunting Week! Your words are on the flags. | Tuần Cờ Dây bắt đầu rồi! Câu nói của bạn ở trên những lá cờ. |
| 7 · 2 | Yapling | {name} wrote the story of your season. | {name} đã viết lại câu chuyện mùa này của hai bạn. |
| 7 · 5 | Yapling | Bea left you a voicemail. | Bea để lại cho bạn một thư thoại. |

Week 6's day-2 knock is the postcards, not the story: a stack of six is the bigger event that day.

---

## Recorded lines this pass changes

The level guide (`packages/story/src/level-check.ts`) flagged recorded lines past the Newcomer or Visitor rows. Episodes 2–6 weren't final, so their lines are fixed here as **re-takes with new ids**; the old recording stays on disk, unused (or, for `s1-e3-06`, kept as the Regular-and-up take). A new id is needed because a rendered line is found by its id: the same id with new text would keep the old take.

| Old id | New id | Why | New line |
|---|---|---|---|
| `s1-e2-04` | `s1-e2-11` | three sentences | "And you came with Pip! Can I ask you the same question?" |
| `s1-e2-05` | `s1-e2-12` | "part-time" above A2 | "Last thing. The job starts on the fourteenth, mornings only." |
| `s1-e2-07` | `s1-e2-13` | a 19-word sentence, "loud" | "I GOT THE JOB! Oh, and Mei says a big man wants cheaper coffee beans. She looked worried." |
| `s1-e3-06` | `s1-e3-09` (Newcomer and Neighbour; `s1-e3-06` stays for Regular and up) | idioms ("between us", "gotta", "just saying"), "landlord", "measuring" | "One more thing: a man from the office was here. He checked the size of your door." |
| `s1-e3-08` | `s1-e3-12` | a 13-word sentence, "landlord" | "While you were away, a raccoon called Hank wanted cheaper beans. We said no, nicely, and he said 'deal'! Then he told us about a man at Mei's door." |
| `s1-e4-06` | `s1-e4-09` | a 16-word sentence, "in charge" | "While you were away, the town met at Nell's inn. You ran the meeting! The plan: a petition, a hundred names. And I have to get them. Help!" |
| `s1-e5-01` | `s1-e5-11` | "sharp" | "Bus 45 leaves at nine o'clock. Bring your best story, love." |
| `s1-e5-02` | `s1-e5-09` | "go on then", a second "love" in the scene, four sentences | "Morning! You can talk about your petition until the next stop." |
| `s1-e5-05` | `s1-e5-10` | "amazing" above A2, three sentences | "One hundred! You got shorter and better every time!" |
| `s1-e5-07` | `s1-e5-12` | a 13-word sentence, "signatures" | "While you were away, we got a hundred names on Bus 45. Bea signed last! Now there's a vote. Mei wants you to speak." |
| `s1-e6-01` | `s1-e6-11` | "proposes" | "The office wants to sell 12 Harbour Lane. Does anyone want to speak?" |
| `s1-e6-02` | `s1-e6-12` | three sentences | "You can do it. First, second, thank you, like we practised." |
| `s1-e6-04` | `s1-e6-10` | "shiok" and "lah" in one line | "Shiok! Thank you, everyone, especially you." |

**Kept on purpose:** the story words the plot needs (*rent*, *petition*, *signature*, *percent*), Hank's "Huh. Ok. I like you. Fine. Deal." and Bea's "Well, I haven't signed yet, have I? Cheers, love. Lovely story, that." (the payoffs; Bea's is her one "love" in the scene now), and the voicemails that only run long (`s1-e3-07`, `s1-e4-05`, `s1-e5-06`), which play with a gloss under each line at Visitor.

**Week 1 and the prologue (recorded, already played by testers): flagged, not changed here.** If the founder wants them fixed, these are the ones worth a re-take: `s1-e1-06` ("my English goes funny", an idiom; "My English gets mixed up when I'm angry"), `s1-pro-03` (27 words), `s1-e1-vm-oops` (a 16-word sentence), and Mei's "Aiyah, nothing lah" in the E1 [GEN] example (two regional words with the "lah" of `s1-e1`'s close; drop the "lah"). The other week-1 findings are at Visitor, where the Visitor rows already replace them.

---

## Recording budget, Release 1.2

`yap_voice.py estimate pending`, run after this pass:

**190 lines, 11,600 characters, about 11,600 credits for one take** (Eleven v4 bills about one credit per character, voice tags included). With the whole season: 324 lines, 19,846 characters.

| Group | Lines | Of which Visitor | Characters |
|---|---|---|---|
| Week 2 · Help Wanted (new lines, re-takes, Visitor, real-week, practice, story) | 23 | 8 | 1,455 |
| Week 3 · Cheaper Beans (with Hank's three new takes and Linh's postcard) | 22 | 7 | 1,621 |
| Week 4 · The Plan (with Nell's postcard) | 20 | 6 | 1,350 |
| Week 5 · The Petition | 21 | 6 | 1,399 |
| Week 6 · The Town Meeting (with the six postcards and the voicemail) | 29 | 8 | 1,879 |
| Bunting Week (Pip's season story, Mei's postcard, Bea's voicemail) | 11 | 0 | 717 |
| Pip's minute (6 open and close, 30 set-ups, 28 slightly wrong) | 64 | all, at 0.7 but the 2 fast set-ups | 3,179 |
| **Total** | **190** | | **11,600** |

By voice: Pip 8,068 · Hank 722 · Mei 580 · Sol 548 · Bea 518 · Dex 382 · Nell 377 · Linh 218 · Mags 187. **Dex has no voice yet** (`audio/cast-voices.json`): his 6 lines wait for his designed voice. With a full retake of every line, Dex's voice design and a three-take audition: **about 25,000 credits**, as `every-week-loop.md` §3.1 planned. If the cycle is short, render Pip's minute and the stories first (days 2, 5, 6 and 7 run on them); until a line is rendered the call speaks it with the live voice. No new Vietnamese is spoken: Linh's 7 lines stay the only ones.

## Production notes

- **Recording budget:** roughly 12–18 [REC] lines per episode across 6–8 voices, plus recaps and voicemails. Hank's E3 opener has a take for Visitor, Newcomer, Neighbour, Regular and Local. Release 1.2's lines and credits: "Recording budget, Release 1.2" above.
- **[GEN] guardrails:** every generated slot has a guaranteed resolution (Mei always shows the letter, Hank always folds, every passenger signs). The learner can't "lose" the story; they can only take longer.
- **Target-error hooks:** each episode has natural moments for past tense (E1 recounting the letter, E2 "tell me about yourself"), plurals and articles (E3 beans, kilos, a discount), questions (E4, E5).
- **Names in recorded lines:** any [REC] line containing {name} is recorded without the name and the name is spliced in with the character's TTS voice, or the line falls back to [GEN] with the same wording.
- **Localisation:** [REC] lines stay in English for every market. Linh's lines are re-recorded per market by that market's Home Neighbour. Glosses and post-call explanations are localised.
- **Review:** native-speaker review of every [REC] line for each accent; a learner-testing pass on E1 with 5–8 Vietnamese professionals before recording the rest.
