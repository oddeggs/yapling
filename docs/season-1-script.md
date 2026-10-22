# Yapling — Season 1 script: "The Café Might Close"

*v0.2 · 2026-10-22 · Settling in (Visitors) added before Episode 1 · 6 episodes, 1 per week · matches design round 5 · cast notes in `cast-bible.md`*

## How to read this script

- **[REC]** = a fixed line, written and voice-recorded (consistent acting, zero AI cost).
- **[GEN]** = a slot the live-call AI fills, with its intent. The AI uses the character's persona prompt (`cast-bible.md`), the learner's stage, their due phrases and their two target errors.
- **Lines are written at Newcomer level.** Each episode has a **Stage scaling** note for higher stages; the AI adapts speed, length and hints per the stage table in the cast bible. Visitors (A0–A1) first play **Settling in**, six short chapters after the prologue, and get easier versions of week 1's hard turns (both in the Settling-in section below).
- **[REC-VI]** = a recorded line Linh speaks in Vietnamese (Settling in only).
- **Each week** = 1 Episode call (this script) + 1 Real-week call + 1 Practice call, plus free "between calls" content (Pip's story, a postcard, the cliffhanger voicemail).
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

*\*Arjun appears as a voice at the meeting; he moves in to Market Lane at Neighbour stage.*

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

**Later episodes.** Episodes 2–6 get a Visitor row in Release 1.2 (see `every-week-loop.md` §2.2 and `journey-and-story.md` §2.4). Until then a Visitor who stays past week 1 plays their Newcomer turns with the Visitor's speech settings.

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

## Episode 2 — Help Wanted

**Logline.** Pip has its first job interview, with Sol at Hollowbrook. You rehearse it with Pip, then swap: Sol interviews you.
**Learning focus.** Talking about strengths with an example; answering "Tell me about yourself"; clarifying questions.
**Real-week call.** Bring your homework: paste your CV or a job post; Dex runs a short interview from it.
**Practice call.** Teach the yapling: explain three job words Pip saw on the poster (*deadline, team, shift*).

### Between calls
- **Pip's story** [GEN]: Pip tried on three outfits for the interview; the tie was "too much tie".
- **Postcard from Sol** [REC]: "Hi! Sol from Hollowbrook. See you and Pip on Thursday. Quick tip: interviewers love examples!"

### Episode call — Hollowbrook office

1. **Rehearsal first (in the burrow).** Pip [REC]: "Can you be Sol? Ask me something hard."
   - Learner asks Pip interview questions. Pip answers *one stage below the learner*, with a mistake that matches the learner's own target error, giving the learner the chance to correct Pip.
   - [GEN] Pip thanks the learner and uses their correction later in the real interview.
2. **The interview.** Sol [REC]: "Hi, Pip! Thanks for coming. Let's start easy: tell me about yourself."
   - Pip answers using the learner's suggested phrases (callback to step 1). The learner listens. *(Listening.)*
3. **The swap.** Sol [REC]: "And you came with Pip! Do you mind if I ask you the same question? Good practice for both of us."
   - Learner answers "Tell me about yourself". *(Work can-do.)*
   - [GEN] Sol asks one follow-up: "What are you good at? Can you give me an example?" *(Target chunks: I'm good at… / For example,…)*
4. **Clarify.** Sol [REC]: "Last thing. The job starts on the fourteenth, part-time, mornings."
   - Learner confirms details for Pip. *(Target chunk: Just to confirm…)*
5. **Close.** Sol [REC]: "Thanks, both. Pip, we'll be in touch soon."

**Stage scaling.** Regular+: Sol asks about a weakness and a time you solved a problem; Local+: Sol asks a hypothetical ("What would you do if…?") and interrupts to dig deeper.

**Cliffhanger voicemail** [REC, Pip]: "I GOT THE JOB! *(happy noises)* Oh, and Mei says a big, loud man wants to talk to her about the price of coffee beans. She looked worried."
**Recap if missed** [REC, Pip]: "While you were away, I had my interview. Sol asked about me, then about you! And I got the job. Mostly thanks to you."

---

## Episode 3 — Cheaper Beans

**Logline.** Hank, a fast-talking regular who buys beans for his shipping crew, demands a discount. You help Mei hold her price without losing him.
**Learning focus.** Saying no politely, offering alternatives, keeping up with fast speech. (This is the "same scene, two stages" episode in the design.)
**Real-week call.** A real request or "no" you need to say this week, rehearsed with Dex.
**Practice call.** Pass it on: explain why the café matters to you in 90/60/45 seconds.

### Between calls
- **Mystery delta:** a silhouette at the café window in the burrow's "Since you were away" card: "A stranger measured the café door."
- **Pip's story** [GEN]: Pip's first morning at Hollowbrook; Sol taught it what a "quick sync" is. Seeded with *Just to confirm…*

### Episode call — Lantern Café counter

1. **Hank arrives.** Hank [REC, Newcomer take]: "Hi. I want cheaper beans, please. Can you do ten percent?"
   Hank [REC, Local take]: "Look, I buy fifty kilos a month, the place across the harbour does it for less, so unless you can match—"
2. **Mei panics.** Mei [REC, whisper]: "If I say yes, I can't pay the rent. If I say no, he goes. Help!"
3. **Say no, kindly.** Learner says no politely. *(Target chunk: I'm sorry, we can't do that.)*
   - [GEN] Hank pushes once: "Come on. Ten percent. Deal?"
4. **Offer an alternative.** Pip [REC, whisper]: "Maybe… something else? Not money?"
   - Learner offers an alternative (free pastry, a loyalty card, faster delivery). *(Target chunk: How about…?)*
   - [GEN] Hank objects once; learner acknowledges and holds. *(Target chunk: That's a fair point, but…)*
5. **Hank folds.** Hank [REC]: "Huh. Ok. I like you. Fine. Deal." *(Target chunk: Deal.)*
6. **The twist.** Hank [REC]: "But between us, this town's gotta show it actually wants this place. Saw the landlord's guy measuring the door. Just saying."

**Stage scaling.** See `journey-and-story.md` §2.4: Newcomer gets one simple request and phrase hints after a pause; Local gets interruptions and a mid-sentence change of mind; Voice must de-escalate and keep the relationship.

**Cliffhanger voicemail** [REC, Mei]: "{name}, sit down. Someone wants to buy the café building, and you'll never guess who… *(beep)*" *(Reveal in E4: the property office wants to sell it to a chain.)*
**Recap if missed** [REC, Pip]: "While you were away, a raccoon called Hank tried to get cheaper beans. We said no, nicely, and he said 'deal'! Then he said something worrying about the landlord."

---

## Episode 4 — The Plan

**Logline.** The town gathers at Nell's inn to save the café. You chair the chat so everyone gets a turn and the town leaves with one plan.
**Learning focus.** Asking for opinions, agreeing and adding, disagreeing gently, summarising. Work: keeping a meeting moving.
**Real-week call.** Speaking up in one of your real meetings: rehearse one point you want to make.
**Practice call.** Teach the yapling: Pip doesn't understand "petition"; explain it, then "signature".

### Between calls
- **Neighbour move-in:** Nell's inn appears on the map; Nell leaves a hello voicemail (listening checkpoint: "What time is the meeting?").
- **Pip's story** [GEN]: Pip made a poster for the meeting; it spelled "café" with three f's.

### Episode call — Lantern Inn, the back room

1. **Open.** Nell [REC]: "Right, everyone's here. Tea's on. Who wants to run this?" *(Everyone looks at you.)*
   Pip [REC]: "You! You're good at this."
2. **Go round.** Learner opens the meeting and asks people for ideas. *(Target chunks: What do you think? / Let's hear from…)*
   - [GEN] Ideas from the cast, one each, short: Bea: "A bake sale on the bus!" · Arjun (voice): "A market day!" · Mei: "I just want to keep my café…" · Nell: "We need something the landlord can't ignore."
3. **Build and disagree.** Learner reacts to two ideas: one agreement-plus, one gentle disagreement. *(Target chunk: Good idea, and…)*
   - [GEN] One character talks too long; the learner gently moves on. *(Work can-do.)*
4. **Linh's idea.** Linh [REC]: "In my old town, people signed a petition. A hundred names, and the office had to listen."
5. **Summarise.** Learner sums up the plan. *(Target chunk: So, to sum up…)*
   - [GEN] Nell checks the summary and assigns: "Pip, you're on signatures. Bus 45 goes everywhere."
6. **Close.** Mei [REC]: "Thank you. Really. *(quiet)* Okay. Let's save my café."

**Stage scaling.** Regular+: two characters disagree with each other and the learner mediates; Local+: the meeting has a time limit and someone interrupts.

**Cliffhanger voicemail** [REC, Nell]: "We need a hundred signatures by Friday. Pip's very excited. Pip's also never spoken to strangers. Good luck, love."
**Recap if missed** [REC, Pip]: "While you were away, the whole town met at Nell's inn, and you ran the meeting! The plan: a petition. A hundred names. I'm in charge. Help."

---

## Episode 5 — The Petition

**Logline.** Pip rides Bus 45 collecting signatures. At each stop you have 45 seconds to convince a passenger. "Pass it on" becomes the story.
**Learning focus.** Short persuasive pitch; telling a story with a point; adapting the same message to different listeners.
**Real-week call.** Your own 60-second self-pitch (for work, a client, or an interview).
**Practice call.** Pass it on: the café pitch at 90/60/45 seconds, building up for the bus.

### Between calls
- **Bea's postcard** [REC]: "Bus 45 leaves at nine sharp. Bring your best story, love."
- **Pip's story** [GEN]: Pip practised its pitch on a lamp post. The lamp post did not sign.

### Episode call — Bus 45

1. **Board.** Bea [REC]: "Morning! Petition, is it? Go on then, love. You've got till the next stop."
2. **Stop 1 — a sleepy commuter** (90 s, at Newcomer; times shrink by stage). Learner pitches. *(Target chunks: Here's the thing / It matters because…)*
   - [GEN] Commuter asks one simple question, then signs.
3. **Stop 2 — a busy parent** (60 s). Learner gives a shorter pitch to someone in a hurry.
   - [GEN] Parent: "Quickly, what's in it for me?" Learner adapts.
4. **Stop 3 — a tourist from the harbour** (45 s). Learner explains *why the café matters* to someone who's never been there.
   - [GEN] Tourist signs and asks for directions to the café; learner gives them.
5. **Count.** Pip [REC]: "Ninety-seven… ninety-eight… ninety-nine. We need ONE more."
   Bea [REC]: "Well, I haven't signed yet, have I? Cheers, love. Lovely story, that."
6. **Close.** Pip [REC]: "One hundred! You were amazing. Each time, shorter and better!" *(Fluency mirror: Flow and Pace shown on the post-call card, from stop 1 to stop 3.)*

**Stage scaling.** Times: Newcomer 90/60/45 s · Neighbour 75/50/40 · Regular 60/45/30 · Local adds an objection at every stop · Voice adds a sceptical passenger who argues back.

**Cliffhanger voicemail** [REC, Mei]: "A hundred names! The office says the town can vote on Saturday. In the square. In front of everyone. Will you speak for the café?"
**Recap if missed** [REC, Pip]: "While you were away, we rode Bus 45 and got one hundred signatures. Bea signed last! Now there's a vote, and Mei wants you to speak."

---

## Episode 6 — The Town Meeting

**Logline.** The whole town gathers in the square. You speak for the café, answer one question, and the town votes. Mei stays.
**Learning focus.** A short structured speech; answering a question from the floor; thanking a group.
**Real-week call.** "How did it go?" on a real event from the season (an interview, a meeting, a pitch), or a final rehearsal for one coming up.
**Practice call.** Accent warm-up: short messages from every neighbour, at their natural speed for your stage.

### Between calls
- **Town delta:** bunting going up in the square on the town map; every neighbour's "good luck" postcard arrives through the week (accent listening).
- **Pip's story** [GEN]: Pip couldn't sleep; it practised your speech to the moon.

### Episode call — Town Square

1. **The crowd.** Ambient crowd [REC]. The property office's representative (Mags, a polite heron; first appearance) [REC]: "The office proposes selling 12 Harbour Lane. Does anyone wish to speak?"
2. **Your speech.** Pip [REC, whisper]: "You can do it. First, second, thank you. Like we practised."
   - Learner gives a short structured speech (60 s at Newcomer). *(Target chunks: I'd like to say a few words / First,… Second,…)* Optional: the learner can rehearse it once in the burrow before going on.
3. **A question from the floor.** [GEN] One person in the crowd asks a friendly but real question (Hank: "Why should the office care about one café?"). *(Target chunk: That's a great question.)*
4. **The vote.** Crowd [REC]. The heron [REC]: "The town has voted. The café stays."
   Mei [REC, crying-laughing]: "Shiok lah! Thank you, everyone. *(to you)* Especially you."
5. **Thank the town.** Learner thanks the group. *(Target chunk: Thank you all.)*
6. **Celebration.** The square throws a party; your name on the banner; Hank orders "the full price, fifty kilos. Don't tell anyone."
7. **Season close.** Pip [REC]: "Look! In the harbour. A boat. Who's on it?" *(Season 2 tease.)*

**Stage scaling.** Neighbour: 75 s speech, two questions. Regular: 90 s, the heron raises an objection. Local+: a rival speaker argues for the sale and the learner responds.

**Season finale payoffs (all automatic):** time capsule (week 1 vs today), season keepsake for the burrow (a tiny Lantern Café sign), can-dos ticked, Season 2 unlock date.
**Recap if missed** [REC, Pip]: "While you were away… actually, no. I waited. The town meeting is today, and you're speaking. Ready?" *(The finale never happens without the learner.)*

---

## Production notes

- **Recording budget:** roughly 12–18 [REC] lines per episode across 6–8 voices, plus recaps and voicemails. Record Hank's E3 opener at every stage speed.
- **[GEN] guardrails:** every generated slot has a guaranteed resolution (Mei always shows the letter, Hank always folds, every passenger signs). The learner can't "lose" the story; they can only take longer.
- **Target-error hooks:** each episode has natural moments for past tense (E1 recounting the letter, E2 "tell me about yourself"), plurals and articles (E3 beans, kilos, a discount), questions (E4, E5).
- **Names in recorded lines:** any [REC] line containing {name} is recorded without the name and the name is spliced in with the character's TTS voice, or the line falls back to [GEN] with the same wording.
- **Localisation:** [REC] lines stay in English for every market. Linh's lines are re-recorded per market by that market's Home Neighbour. Glosses and post-call explanations are localised.
- **Review:** native-speaker review of every [REC] line for each accent; a learner-testing pass on E1 with 5–8 Vietnamese professionals before recording the rest.
