# Vietnamese copy review

Every Vietnamese string in `packages/i18n/src/*.vi.ts`, grouped by screen, with its English source, for a native Vietnamese reviewer before the learner test and the store launch. Learning content (character lines, glosses in `@yapling/story`) is out of scope here.

476 strings in 15 catalogues; 87 flagged.

## How to review

- Read each row's Vietnamese against the English and the screen it sits on (`design/renders/`, or the app). The Notes column says why a row is flagged; add your suggestion beside it (or as a comment), and the copy owner applies it in the `.vi.ts` file.
- **Flags** mark rows to look at first: **Machine-like** (reads translated), **Length** (may not fit the layout), **Register** (pronoun or tone), **Term** (the same thing named two ways), **Meaning** (the Vietnamese says something else), **English on purpose?** (left in English; confirm), **New** (added in the last pass), **Review with care** (crisis copy). Rows marked † are longer than 1.4× their English and over 20 characters: check them on screen.
- `{name}`, `{count}` and the like are filled in by the app; keep them. Plural rows show each form.

## The register the app uses

- **The app speaks to the learner as "bạn"** and about itself and the cast as **"mình"** / **"tụi mình"**: warm, peer to peer, neither formal ("quý khách", "anh/chị") nor childish. The learners are Vietnamese professionals in their twenties and thirties; "bạn" fits every age and gender.
- **The learner's own buttons speak as "Mình"** ("Mình hiểu rồi", "Mình đã đủ 18 tuổi", "Xoá dữ liệu của mình").
- **Soft requests end with "nhé"** ("Thử lại sau một chút nhé"); no commands without it, no "vui lòng".
- **Characters are called by name**, not "nó" or "bạn ấy"; "nó" is only for things (the feather, a fix).
- **Open question for the reviewer:** "tụi mình" reads southern; "chúng mình" is the neutral choice. It appears in the Plus kicker and the memory page.

## Terms to settle

| Thing | Used now | Suggestion |
|---|---|---|
| Voicemail | "thư thoại", "hộp thư thoại", "tin nhắn thoại" | "thư thoại" for Pip's voicemail; keep "tin nhắn thoại" for a voice note (later release) |
| Pip's voice story | "Tin nhắn thoại" | "Chuyện kể" (it isn't a message) |
| Flow (seconds without stopping) | "Trôi chảy", "LƯU LOÁT" | one of them everywhere |
| Life track | "ĐỜI SỐNG", "CUỘC SỐNG" | one of them everywhere |
| A fix | "lỗi" | something lighter, the product never scolds |
| Round (Pass it on) vs turn | both "Lượt" | decide; "Vòng" is taken by the weekly ring |
| Not now | "Để sau", "Không phải bây giờ" | "Để sau" |

## Onboarding: splash, age and name, the AI explainer, roommate pick, placement call, residency card, notifications, Linh at the door

`packages/i18n/src/onboarding.vi.ts` · 65 strings

| Key | English | Tiếng Việt | Flag | Notes |
|---|---|---|---|---|
| `onboarding.splash.tag` | Next stop: Natterwick | Chuyến phà tới Natterwick |  |  |
| `onboarding.splash.title` | Your first language | Ngôn ngữ đầu tiên của bạn | Machine-like | "Ngôn ngữ đầu tiên" is a literal "first language"; it also reads as the app language. Consider "Ngôn ngữ của bạn" or "Bạn nói tiếng gì?" |
| `onboarding.splash.sub` | The app uses this language. Lessons stay in English. | Ứng dụng dùng ngôn ngữ này. Bài học vẫn bằng tiếng Anh. |  |  |
| `onboarding.firstLanguage.vi` | Tiếng Việt | Tiếng Việt |  |  |
| `onboarding.firstLanguage.id` | Bahasa Indonesia | Bahasa Indonesia |  |  |
| `onboarding.firstLanguage.th` | ไทย | ไทย |  |  |
| `onboarding.firstLanguage.pt` | Português | Português |  |  |
| `onboarding.firstLanguage.es` | Español | Español |  |  |
| `onboarding.firstLanguage.ja` | 日本語 | 日本語 |  |  |
| `onboarding.firstLanguage.ko` | 한국어 | 한국어 |  |  |
| `onboarding.firstLanguage.tr` | Türkçe | Türkçe |  |  |
| `onboarding.firstLanguage.other` | Other… | Khác… |  |  |
| `onboarding.age.nameLabel` | YOUR NAME | TÊN CỦA BẠN |  |  |
| `onboarding.age.namePlaceholder` | What should {name} call you? | {name} nên gọi bạn là gì? |  |  |
| `onboarding.age.confirm` | I’m 18 or older | Mình đã đủ 18 tuổi | Register | The learner speaks as "Mình" in their own buttons (see the register note); keep it consistent |
| `onboarding.age.why` | Yapling is made for grown-up learners. | Yapling dành cho người học đã trưởng thành. |  |  |
| `onboarding.age.cta` | Step off the ferry | Bước xuống phà |  |  |
| `onboarding.age.offline` | No connection yet. Check your internet and try again. | Chưa kết nối được. Kiểm tra mạng rồi thử lại nhé. |  |  |
| `onboarding.age.failed` | Natterwick isn’t answering. Try again in a moment. | Natterwick chưa trả lời. Thử lại sau một chút nhé. |  |  |
| `onboarding.ai.kicker` | BEFORE WE START | TRƯỚC KHI BẮT ĐẦU |  |  |
| `onboarding.ai.title` | {name} and the neighbours are AI | {name} và hàng xóm là AI |  |  |
| `onboarding.ai.characters` | They are characters made to help you practise English. They can get things wrong. | Họ là nhân vật được tạo ra để giúp bạn luyện nói tiếng Anh. Đôi khi họ có thể nói sai. |  |  |
| `onboarding.ai.voice` | Your voice is only used to reply to you and track progress. Delete it any time. | Giọng nói của bạn chỉ dùng để trả lời bạn và theo dõi tiến bộ. Bạn có thể xoá bất cứ lúc nào. |  |  |
| `onboarding.ai.notProfessionals` | They are not doctors, therapists or lawyers. When it matters, they point you to real people. | Họ không phải bác sĩ, nhà trị liệu hay luật sư. Khi cần, họ sẽ chỉ bạn đến người thật. |  |  |
| `onboarding.ai.cta` | Got it | Mình hiểu rồi |  |  |
| `onboarding.pick.title` | Who’s your roommate? | Ai sẽ là bạn cùng phòng? |  |  |
| `onboarding.pick.redPanda` | Red panda | Gấu trúc đỏ |  |  |
| `onboarding.pick.capybara` | Capybara | Chuột lang nước |  |  |
| `onboarding.pick.cat` | Cat | Mèo |  |  |
| `onboarding.pick.nameLabel` | NAME | ĐẶT TÊN |  |  |
| `onboarding.pick.cta` | Move in | Dọn vào |  |  |
| `onboarding.pick.saveFailed` | Couldn’t move in yet. Check your connection and try again. | Chưa dọn vào được. Kiểm tra kết nối rồi thử lại nhé. |  |  |
| `onboarding.unpack.place` | Your burrow · Day {day} | Hang của bạn · Ngày {day} |  |  |
| `onboarding.unpack.done` | See my residency card | Xem thẻ cư trú |  |  |
| `onboarding.unpack.chip` | First chat · about a minute | Trò chuyện đầu tiên · khoảng một phút |  |  |
| `onboarding.mic.title` | So {name} can hear you | Để {name} nghe được bạn |  |  |
| `onboarding.mic.body` | Your voice is only used to reply to you and to track your progress. | Giọng nói của bạn chỉ dùng để trả lời bạn và theo dõi tiến bộ. |  |  |
| `onboarding.mic.allow` | Allow microphone | Cho phép micro |  |  |
| `onboarding.card.top` | NATTERWICK RESIDENCY | THẺ CƯ TRÚ NATTERWICK |  |  |
| `onboarding.card.stage` | Stage {stage} of {stages} | Chặng {stage}/{stages} |  |  |
| `onboarding.card.welcome` | Welcome to Natterwick! | Chào mừng đến Natterwick! |  |  |
| `onboarding.card.strengthsTitle` | YOU ALREADY DO THESE WELL | BẠN ĐÃ LÀM TỐT |  |  |
| `onboarding.card.strength.keepGoing` | You keep going when you’re stuck | Bạn vẫn nói tiếp khi bí từ |  |  |
| `onboarding.card.strength.askBack` | You ask questions back | Bạn biết hỏi lại |  |  |
| `onboarding.card.strength.clearAboutWork` | You talk clearly about your work | Bạn nói rõ ràng về công việc |  |  |
| `onboarding.card.strength.goodAtUnpacking` | You’re very good at unpacking | Bạn dọn đồ rất giỏi |  |  |
| `onboarding.card.writing` | {name} is writing it down… | {name} đang ghi lại… |  |  |
| `onboarding.card.stampTown` | NW | NW |  |  |
| `onboarding.card.aimsTitle` | AIM FOR THESE FIRST | MỤC TIÊU ĐẦU TIÊN |  |  |
| `onboarding.card.adjust` | Not quite right? | Chưa phù hợp? |  |  |
| `onboarding.card.tooEasy` | Too easy | Dễ quá |  |  |
| `onboarding.card.tooHard` | Too hard | Khó quá |  |  |
| `onboarding.card.adjustedFaster` | Adjusted: the town will talk a little faster | Đã chỉnh: Natterwick sẽ nói nhanh hơn một chút | Term | Subject differs from its pair ("Natterwick" vs "mọi người" in the slower line); pick one |
| `onboarding.card.adjustedSlower` | Adjusted: slower speech and more hints | Đã chỉnh: mọi người sẽ nói chậm hơn và gợi ý nhiều hơn† | Term | See the faster line |
| `onboarding.notifications.kicker` | NOTIFICATIONS | THÔNG BÁO |  |  |
| `onboarding.notifications.title` | Want {name} to call when something happens in town? | Bạn muốn {name} gọi khi có chuyện trong thị trấn? | Meaning | "khi có chuyện" can read as "when something is wrong"; consider "khi thị trấn có gì mới" |
| `onboarding.notifications.body` | At most once a day. Never in quiet hours. | Tối đa một lần mỗi ngày. Không bao giờ trong giờ yên tĩnh.† |  |  |
| `onboarding.notifications.quietHours` | Quiet hours | Giờ yên tĩnh |  |  |
| `onboarding.notifications.change` | Change | Đổi giờ |  |  |
| `onboarding.notifications.from` | From | Từ |  |  |
| `onboarding.notifications.until` | Until | Đến |  |  |
| `onboarding.notifications.allow` | Allow notifications | Cho phép thông báo |  |  |
| `onboarding.notifications.later` | Not now | Để sau |  |  |
| `onboarding.door.place` | At the door | Ở cửa nhà |  |  |
| `onboarding.door.done` | Good night | Chúc ngủ ngon |  |  |

## The burrow (home), day by day

`packages/i18n/src/burrow.vi.ts` · 45 strings

| Key | English | Tiếng Việt | Flag | Notes |
|---|---|---|---|---|
| `burrow.place` | Your burrow | Hang của bạn |  |  |
| `burrow.peek.episode` | Season {season} · Episode {episode} | Mùa {season} · Tập {episode} |  |  |
| `burrow.peek.ready` | Ready when you are | Sẵn sàng khi bạn muốn | Machine-like | Literal "Ready when you are"; consider "Khi nào sẵn sàng thì mình đi nhé" |
| `burrow.peek.whereYouLeftIt` | Exactly where you left it | Đúng chỗ bạn đã dừng |  |  |
| `burrow.newObject` | New in the burrow: {object} | Đồ mới trong hang: {object} |  |  |
| `burrow.object.seagullFeather` | a seagull feather | lông hải âu |  |  |
| `burrow.stage.seed` | Seed | Gói hạt |  |  |
| `burrow.stage.sprout` | Sprout | Mầm |  |  |
| `burrow.stage.leaf` | Leaf | Lá |  |  |
| `burrow.stage.bloom` | Bloom | Hoa |  |  |
| `burrow.delta.sinceAway` | SINCE YOU WERE AWAY | TRONG LÚC BẠN ĐI VẮNG |  |  |
| `burrow.delta.today` | TODAY | HÔM NAY |  |  |
| `burrow.delta.day` | DAY {day} | NGÀY {day} |  |  |
| `burrow.delta.firstWords` | Your first words will fill these shelves. | Những từ đầu tiên của bạn sẽ lấp đầy các kệ này. |  |  |
| `burrow.delta.letter` | A letter under the café door | Một lá thư dưới cửa quán cà phê |  |  |
| `burrow.delta.letterSub` | Someone pushed it in last night | Có ai đó nhét vào tối qua |  |  |
| `burrow.delta.boxUnpacked` | A box got unpacked | Một thùng đã được dỡ | Machine-like | Passive "đã được dỡ" sounds translated; consider "Đã dỡ xong một thùng đồ" |
| `burrow.delta.boxUnpackedSub` | Your first call made room on the shelves | Cuộc gọi đầu tiên đã dọn chỗ trên kệ |  |  |
| `burrow.delta.story` | {name} got lost today | {name} bị lạc hôm nay |  |  |
| `burrow.delta.storySub` | It has a story for you, and Linh sent a postcard | Có một câu chuyện cho bạn, và Linh gửi bưu thiếp |  |  |
| `burrow.delta.feather` | {name} brought home a seagull feather | {name} mang về một chiếc lông hải âu |  |  |
| `burrow.delta.featherSub` | It’s on the shelf now | Giờ nó nằm trên kệ rồi |  |  |
| `burrow.delta.favour` | {name} has a favour to ask | {name} muốn nhờ bạn một việc |  |  |
| `burrow.delta.favourSub` | How do people introduce themselves at work? | Ở chỗ làm, người ta giới thiệu bản thân thế nào? |  |  |
| `burrow.delta.bus` | Bus 45 leaves at nine | Xe buýt 45 chạy lúc chín giờ |  |  |
| `burrow.delta.busSub` | Bea wants to hear about your day | Bea muốn nghe về một ngày của bạn |  |  |
| `burrow.delta.keepsake` | A keepsake on the wall | Một kỷ niệm trên tường | Meaning | "kỷ niệm" is a memory; the object on the wall is a "kỷ vật" |
| `burrow.delta.keepsakeSub` | {name} drew it. Linh signed it. | {name} tự vẽ. Linh đã ký. |  |  |
| `burrow.delta.voicemail` | {name} left you a voicemail | {name} để lại thư thoại cho bạn |  |  |
| `burrow.delta.voicemailSub` | Big news from Hollowbrook | Tin lớn từ Hollowbrook |  |  |
| `burrow.delta.firstWeek` | Your first week is done | Tuần đầu tiên đã xong |  |  |
| `burrow.delta.firstWeekSub` | One small thing to tell you | Có một điều nhỏ muốn nói với bạn |  |  |
| `burrow.delta.nextEpisode` | Episode {episode} is ready | Tập {episode} đã sẵn sàng |  |  |
| `burrow.delta.nextEpisodeSub` | Sol from Hollowbrook says hi | Sol ở Hollowbrook gửi lời chào |  |  |
| `burrow.delta.a11y.open` | Open | Mở |  |  |
| `burrow.action.story` | Hear {name}’s story | Nghe chuyện của {name} |  |  |
| `burrow.action.practice` | Go to the Bus 45 stop | Ra bến xe buýt 45 |  |  |
| `burrow.action.voicemail` | Play the voicemail | Nghe thư thoại |  |  |
| `burrow.action.firstWeek` | See what it is | Xem đó là gì |  |  |
| `burrow.action.week` | See this week | Xem tuần này |  |  |
| `burrow.ring` | {done} of {total} calls | {done}/{total} cuộc gọi |  |  |
| `burrow.a11y.me` | You and {name} | Bạn và {name} |  |  |
| `burrow.a11y.keepsake` | Keepsake on the wall: {canDo} | Kỷ niệm trên tường: {canDo} | Meaning | Same as the keepsake card: "kỷ vật" |
| `burrow.a11y.object` | {phrase}: {stage} | {phrase}: {stage} |  |  |
| `burrow.back.done` | Back to the burrow | Về hang |  |  |

## The week view

`packages/i18n/src/week.vi.ts` · 16 strings

| Key | English | Tiếng Việt | Flag | Notes |
|---|---|---|---|---|
| `week.title` | This week | Tuần này |  |  |
| `week.ring` | {done}/{total} | {done}/{total} |  |  |
| `week.ringToast` | Weekly ring: {done} of {total} | Vòng tuần: {done}/{total} |  |  |
| `week.slot.episode` | Episode | Tập truyện |  |  |
| `week.slot.realWeek` | Real week | Tuần thật | Machine-like | "Tuần thật" is literal and unclear; consider "Đời thật" or "Chuyện thật trong tuần" |
| `week.slot.practice` | Practice | Luyện tập |  |  |
| `week.slot.teach` | Teach {name} to introduce itself | Dạy {name} giới thiệu bản thân |  |  |
| `week.slot.episodeTitle` | S{season} · E{episode} · {title} | S{season} · E{episode} · {title} |  |  |
| `week.slot.passItOn` | Pass it on · Bus 45 | Pass it on · Bus 45 | English on purpose? | The activity name stays English; confirm it should |
| `week.slot.today` | Today | Hôm nay |  |  |
| `week.slot.a11y.done` | Done | Đã xong |  |  |
| `week.slot.a11y.open` | Ready | Sẵn sàng |  |  |
| `week.slot.a11y.upcoming` | Coming up | Sắp tới |  |  |
| `week.phrasesTitle` | THIS WEEK’S PHRASES | CỤM TỪ TUẦN NÀY |  |  |
| `week.seedNote` | Seed packets: heard, not said yet. Say them to sprout. | Gói hạt: bạn mới nghe thấy. Nói ra để chúng nảy mầm. |  |  |
| `week.cta` | Go to the café with {name} | Đến quán cà phê với {name} |  |  |

## Live calls: the call frame, captions, hints, the call bar, the fluency mirror

`packages/i18n/src/call.vi.ts` · 42 strings

| Key | English | Tiếng Việt | Flag | Notes |
|---|---|---|---|---|
| `call.place.cafe` | Lantern Café · behind the counter | Quán Lantern · sau quầy |  |  |
| `call.place.fromBurrow` | calling from the burrow | đang gọi từ hang |  |  |
| `call.place.busStop` | Bus 45 stop | Bến xe buýt 45 |  |  |
| `call.place.onCall` | on a call | đang gọi |  |  |
| `call.calling` | Calling {who} | Đang gọi {who} |  |  |
| `call.callee.harbourLaneOffice` | Harbour Lane Office | Văn phòng Harbour Lane |  |  |
| `call.tapForMeaning` | Tap for Vietnamese | Chạm để xem nghĩa |  |  |
| `call.whatDoesThatMean` | What does that mean? | What does that mean? | English on purpose? | English on purpose: the question the learner learns to ask |
| `call.translating` | Translating… | Đang dịch… | New | New: the gloss row while a tapped line is translated |
| `call.translateFailed` | Couldn't translate it. Tap to try again | Chưa dịch được. Chạm để thử lại nhé | New | New: a tapped line whose translation didn't come |
| `call.noTranslation` | No translation for this line | Câu này chưa có bản dịch | New | New: a tapped line with nothing to give |
| `call.page` | {index}/{count} | {index}/{count} | New | New: the line's place in its turn, on the bubble |
| `call.a11y.page` | Line {index} of {count} | Câu {index} trên {count} | New | New: VoiceOver for that place |
| `call.a11y.earlierLine` | Earlier line | Câu trước | New | New: VoiceOver for the back arrow on the bubble |
| `call.a11y.laterLine` | Next line | Câu sau | New | New: VoiceOver for the on arrow on the bubble |
| `call.history.title` | What was said | Những gì đã nói | New | New: the title of the call's line list (shown in capitals) |
| `call.history.a11y.open` | What was said. Read the call again | Những gì đã nói. Xem lại cuộc gọi | New | New: VoiceOver for the button that opens it |
| `call.history.replay` | Play again | Nghe lại | New | New: VoiceOver for a listed line's play button |
| `call.whisper` | {name} whispers | {name} thì thầm |  |  |
| `call.showTranslation` | Show translation | Xem bản dịch |  |  |
| `call.hideTranslation` | Hide translation | Ẩn bản dịch |  |  |
| `call.you` | YOU | BẠN |  |  |
| `call.youHeard` | YOU · heard | BẠN · nghe được | Meaning | "BẠN · nghe được" reads as "you can hear"; it means "what Pip heard you say". Consider "BẠN · Pip nghe được" or "BẠN · đã nghe" |
| `call.hint` | HINT | GỢI Ý |  |  |
| `call.seconds` | {count}s | {count}s |  |  |
| `call.holdOn` | Hold on | Chờ chút |  |  |
| `call.ready` | Ready | Tiếp tục |  |  |
| `call.mic.paused` | Paused · take your time | Tạm dừng · cứ từ từ |  |  |
| `call.mic.listening` | Listening… let go when done | Đang nghe… thả ra khi xong |  |  |
| `call.mic.yourTurn` | Your turn · hold to talk | Lượt của bạn · giữ để nói |  |  |
| `call.mic.talking` | {who} is talking | {who} đang nói |  |  |
| `call.mic.sceneComplete` | Scene complete | Hết cảnh |  |  |
| `call.a11y.mic` | Hold to talk | Giữ để nói |  |  |
| `call.a11y.thinking` | {name} is thinking | {name} đang nghĩ | New | New: VoiceOver for the thinking bubble |
| `call.a11y.seconds` | {count} seconds | {count} giây | New | New: VoiceOver for timers and rounds |
| `call.a11y.letter` | The letter. Tap to read it again | Lá thư. Chạm để đọc lại | New | New: VoiceOver for the tucked letter in the call |
| `call.done.wrapUp` | Wrap up | Kết thúc cuộc gọi |  |  |
| `call.done.hopOff` | Hop off | Xuống xe |  |  |
| `call.done.seasonMap` | See the season map | Xem bản đồ mùa |  |  |
| `call.didntCatch` | Sorry, I didn't catch that. Say it another way? | Sorry, I didn't catch that. Say it another way? | English on purpose? | English on purpose: the character says it. New |
| `call.reconnecting` | Reconnecting… | Đang nối lại… | New | New: the pill while the line drops and reconnects |
| `call.interrupted` | Paused while you take that call | Tạm dừng trong lúc bạn nghe máy | New | New: the pill while a phone call or Siri has the audio |
| `call.fixedIt` | You fixed it yourself | Bạn tự sửa được rồi |  |  |
| `call.nowALeaf` | Now a leaf | Đã thành lá |  |  |
| `call.seedDropped` | Dropped into the burrow as a seed packet | Đã thêm vào hang thành gói hạt | Machine-like | Awkward; consider "Đã thả vào hang thành một gói hạt" |
| `call.wordAdded` | Added “{word}” to the burrow | Đã thêm “{word}” vào hang |  |  |
| `call.mirror.title` | Fluency mirror | Gương nói | Term | "Gương nói" for "Fluency mirror"; check against "trôi chảy"/"lưu loát" below |
| `call.mirror.round` | Round {round} | Lượt {round} | Term | "Lượt" is also the learner's turn ("Lượt của bạn"); a round could be "Vòng", but "Vòng tuần" is the weekly ring. Decide |
| `call.mirror.flow` | Flow {seconds}s | Trôi chảy {seconds} giây† | Term | Flow is "trôi chảy" here but "LƯU LOÁT" on the after-call receipt; pick one |
| `call.mirror.pace` | {wpm} wpm | {wpm} từ/phút |  |  |
| `call.mirror.pauses` | Pauses {pauses}/min | ngắt {pauses} lần/phút | Term | Starts lower-case ("ngắt"), unlike its neighbours |
| `call.mirror.smoother` | Round three is visibly smoother! | Lượt thứ ba trôi chảy hơn hẳn! |  |  |
| `call.mirror.flowMeans` | Flow = seconds without stopping. | Trôi chảy = số giây nói liền không dừng. |  |  |

## Call error sheets (no connection, microphone off)

`packages/i18n/src/errors.vi.ts` · 10 strings

| Key | English | Tiếng Việt | Flag | Notes |
|---|---|---|---|---|
| `errors.offline.kicker` | NO CONNECTION | MẤT KẾT NỐI |  |  |
| `errors.offline.title` | {name}’s line is crackly. Try a voice note? | Đường dây của {name} đang rè. Thử gửi tin nhắn thoại nhé? | Meaning | Asks "Try a voice note?", but voice notes are a later release and the sheet shows only "Thử gọi lại". Both languages need a title without the voice note for now |
| `errors.offline.body` | It sends when you’re back online. | Tin nhắn sẽ tự gửi khi có mạng trở lại. | Meaning | Not shown until voice notes exist |
| `errors.offline.voiceNote` | Record a voice note | Ghi tin nhắn thoại | Meaning | Not shown until voice notes exist |
| `errors.offline.retry` | Try the call again | Thử gọi lại |  |  |
| `errors.mic.kicker` | MICROPHONE OFF | MICRO ĐANG TẮT |  |  |
| `errors.mic.title` | {name} can’t hear you yet | {name} chưa nghe được bạn |  |  |
| `errors.mic.body` | The microphone is off for Yapling. Turn it on in Settings so {name} can hear you. | Micro đang tắt cho Yapling. Bật trong Cài đặt để {name} nghe được bạn nhé. |  |  |
| `errors.mic.openSettings` | Open Settings | Mở Cài đặt |  |  |
| `errors.mic.type` | Type instead | Nhắn chữ thay thế | Machine-like | Not shown in this release; when it is, "Nhắn chữ thay thế" is awkward: "Nhắn tin thay vì nói" |

## Voice story, postcard and voicemail

`packages/i18n/src/story.vi.ts` · 14 strings

| Key | English | Tiếng Việt | Flag | Notes |
|---|---|---|---|---|
| `story.place.voiceStory` | Voice story · {duration} | Tin nhắn thoại · {duration} | Term | A voice story is not a voice message: "Tin nhắn thoại" is the term for a voice note. Consider "Chuyện kể · {duration}" |
| `story.place.voicemail` | Voicemail | Hộp thư thoại | Term | "Hộp thư thoại" (the inbox) here, "thư thoại" elsewhere; fine for the place line, but see the voicemail terms |
| `story.nothingToFail` | No live minutes used · nothing to fail | Không tính phút gọi · không có gì để trượt | Register | "trượt" is failing an exam; the line is meant as relief. Consider "không có gì phải lo" |
| `story.voicemailFrom` | Voicemail from {name} | Thư thoại từ {name} |  |  |
| `story.thanks` | Thanks, {name} | Cảm ơn {name} |  |  |
| `story.postmark` | NATTERWICK | NATTERWICK |  |  |
| `story.gift.seagullFeather` | New in the burrow: a seagull feather | Đồ mới trong hang: lông hải âu |  |  |
| `story.voicemail.opening` | Opening the voicemail… | Đang mở thư thoại… |  |  |
| `story.voicemail.nowASprout` | Now a sprout | Đã nảy mầm |  |  |
| `story.voicemail.workedItOut` | {name} worked it out | {name} tự nhớ ra rồi |  |  |
| `story.voicemail.offline` | The line is crackly. {name}'s voicemail will wait for you here. | Đường dây đang rè. Thư thoại của {name} vẫn chờ bạn ở đây. |  |  |
| `story.voicemail.tryAgain` | Try again | Thử lại |  |  |
| `story.a11y.waveform` | Played {elapsed} of {duration} | Đã nghe {elapsed} trên {duration} |  |  |
| `story.a11y.postcard` | Postcard from {name}: {text} | Bưu thiếp từ {name}: {text} |  |  |

## After the call, phrase growth, fix graduation, the keepsake

`packages/i18n/src/payoff.vi.ts` · 63 strings

| Key | English | Tiếng Việt | Flag | Notes |
|---|---|---|---|---|
| `payoff.afterCall.firstCall` | Your first call | Cuộc gọi đầu tiên |  |  |
| `payoff.afterCall.kind.placement` | Getting to know you | Làm quen |  |  |
| `payoff.afterCall.kind.episode` | Episode | Tập truyện |  |  |
| `payoff.afterCall.kind.real_week` | Real week | Tuần thật |  |  |
| `payoff.afterCall.kind.practice` | Practice | Luyện tập |  |  |
| `payoff.afterCall.kind.voicemail_reply` | Voicemail reply | Trả lời tin nhắn thoại† | Term | Uses "tin nhắn thoại"; the voicemail is "thư thoại" everywhere else |
| `payoff.afterCall.done` | Done! | Xong rồi! |  |  |
| `payoff.afterCall.writing` | {name} is writing it down… | {name} đang ghi lại… |  |  |
| `payoff.afterCall.writingSub` | Your wins and phrases will be here in a moment. | Điều bạn làm tốt và các cụm từ sẽ hiện ở đây trong giây lát. |  |  |
| `payoff.afterCall.quiet` | {name} enjoyed the chat | {name} rất vui được trò chuyện |  |  |
| `payoff.afterCall.quietSub` | Every call counts, the short ones too. | Cuộc gọi nào cũng đáng, kể cả cuộc gọi ngắn. |  |  |
| `payoff.afterCall.winsTitle` | TWO WINS | 2 ĐIỀU LÀM TỐT |  |  |
| `payoff.afterCall.winTitle` | ONE WIN | 1 ĐIỀU LÀM TỐT |  |  |
| `payoff.afterCall.fixTitle` | ONE FIX | 1 LỖI ĐÃ SỬA | Register | "LỖI" (error) is heavier than "fix"; the product never scolds. Consider "1 ĐIỀU NÊN CHỈNH" |
| `payoff.afterCall.a11yFix` | One fix: you said “{from}”. Better: “{to}”. | Một lỗi đã sửa: bạn nói “{from}”. Cách hay hơn: “{to}”. | Register | Same tone note as the fix title |
| `payoff.afterCall.seedsTitle` | NEW SEED PACKETS | GÓI HẠT MỚI |  |  |
| `payoff.afterCall.sproutsTitle` | SEED TO SPROUT | TỪ GÓI HẠT THÀNH MẦM |  |  |
| `payoff.afterCall.leavesTitle` | SPROUT TO LEAF | TỪ MẦM THÀNH LÁ |  |  |
| `payoff.afterCall.bloomsTitle` | IN BLOOM | ĐÃ NỞ HOA |  |  |
| `payoff.afterCall.ring` | Weekly ring · {done} of {total} | Vòng tuần · {done}/{total} |  |  |
| `payoff.afterCall.boxUnpacked` | A box in the burrow got unpacked | Một thùng trong hang đã được dỡ | Machine-like | Passive "đã được dỡ"; see the burrow line |
| `payoff.afterCall.newThings` | one: Something new in the burrow / other: {count} new things in the burrow | other: {count} thứ mới trong hang |  |  |
| `payoff.afterCall.cta` | Back to the burrow | Về hang |  |  |
| `payoff.receipt.flow` | FLOW (no stopping) | LƯU LOÁT (nói liền) | Term | "LƯU LOÁT" here, "Trôi chảy" in the call and the Me sheet; pick one |
| `payoff.receipt.upFrom` | up from | tăng từ |  |  |
| `payoff.receipt.pace` | PACE | TỐC ĐỘ |  |  |
| `payoff.receipt.pauses` | PAUSES | NGẮT QUÃNG |  |  |
| `payoff.receipt.seconds` | {value}s | {value}s |  |  |
| `payoff.receipt.wordsPerMinute` | {value} wds/min | {value} từ/phút |  |  |
| `payoff.receipt.perMinute` | {value} / min | {value} / phút |  |  |
| `payoff.bloom.label` | BLOOM · YOUR OWN | NỞ HOA · CỦA RIÊNG BẠN |  |  |
| `payoff.bloom.sub` | You used it on your own, weeks later. Now it’s in bloom. | Bạn tự dùng nó sau nhiều tuần. Giờ nó đã nở hoa. |  |  |
| `payoff.graduation.title` | {name} stopped asking about your {target}. It’s yours now. | {name} không hỏi về {target} của bạn nữa. Giờ nó là của bạn rồi. | Meaning | "{target} của bạn" with targets like "-ed" or "“a” và “the”" reads oddly ("về -ed của bạn"); consider "{name} không còn nhắc bạn về {target} nữa" |
| `payoff.graduation.sub` | You fixed it yourself {count} times, on {days} different days. | Bạn đã tự sửa {count} lần, trong {days} ngày khác nhau. |  |  |
| `payoff.graduation.nextTag` | NEXT | TIẾP THEO |  |  |
| `payoff.graduation.next` | {name} might start asking about {target}. Gently, and not every time. | {name} có thể bắt đầu hỏi về {target}. Nhẹ nhàng thôi, và không phải lúc nào cũng hỏi. |  |  |
| `payoff.graduation.cta` | Nice | Tuyệt |  |  |
| `payoff.target.past_ed` | -ed | -ed |  |  |
| `payoff.target.final_s` | -s | -s |  |  |
| `payoff.target.articles` | “a” and “the” | “a” và “the” |  |  |
| `payoff.target.final_consonants` | final sounds | âm cuối |  |  |
| `payoff.target.prepositions` | little words like “to” and “at” | giới từ như “to” và “at” |  |  |
| `payoff.target.be_verb` | “am”, “is” and “are” | “am”, “is” và “are” |  |  |
| `payoff.target.word_order` | question order | trật tự câu hỏi |  |  |
| `payoff.badge.past_ed` | -ed | -ed |  |  |
| `payoff.badge.final_s` | -s | -s |  |  |
| `payoff.badge.articles` | a/the | a/the |  |  |
| `payoff.badge.final_consonants` | -t -k | -t -k |  |  |
| `payoff.badge.prepositions` | to/at | to/at |  |  |
| `payoff.badge.be_verb` | is | is |  |  |
| `payoff.badge.word_order` | wh? | wh? |  |  |
| `payoff.keepsake.title` | Your ring is full! | Vòng tuần đã đầy! |  |  |
| `payoff.keepsake.week` | WEEK {week} | TUẦN {week} |  |  |
| `payoff.keepsake.roommateSays` | I drew it myself. {witness} signed it! | Mình tự vẽ đó. {witness} đã ký! |  |  |
| `payoff.keepsake.canDoTicked` | New can-do ticked | Thêm một điều bạn làm được† |  |  |
| `payoff.keepsake.track.life` | LIFE | ĐỜI SỐNG | Term | "ĐỜI SỐNG" here, "CUỘC SỐNG" on the Me sheet; pick one |
| `payoff.keepsake.track.work` | WORK | CÔNG VIỆC |  |  |
| `payoff.keepsake.trackCount` | {done} of {total} | {done}/{total} |  |  |
| `payoff.keepsake.cta` | Hang it on the wall | Treo lên tường |  |  |
| `payoff.keepsake.hung` | Hung on the burrow wall | Đã treo trên tường hang |  |  |
| `payoff.keepsake.canNow` | {learner} can now… | {learner} can now… | English on purpose? | The keepsake itself is written in English (a learning artefact); confirm |
| `payoff.keepsake.witnessed` | witnessed by {witness} · {date} | witnessed by {witness} · {date} | English on purpose? | As above |
| `payoff.keepsake.weekCanDo` | fill a whole week with calls | fill a whole week with calls | English on purpose? | As above |

## Can-dos (residency card aims, keepsakes, the Me sheet)

`packages/i18n/src/cando.vi.ts` · 24 strings

| Key | English | Tiếng Việt | Flag | Notes |
|---|---|---|---|---|
| `cando.ask-whats-wrong` | Ask someone what’s wrong and offer help | Hỏi ai đó có chuyện gì và ngỏ ý giúp |  |  |
| `cando.introduce-yourself-30s` | Introduce yourself in 30 seconds | Giới thiệu bản thân trong 30 giây |  |  |
| `cando.say-what-youre-good-at` | Say what you’re good at | Nói điều bạn giỏi |  |  |
| `cando.tell-me-about-yourself` | Answer “Tell me about yourself” | Trả lời câu “Hãy kể về bản thân bạn” |  |  |
| `cando.say-no-politely` | Say no politely | Từ chối một cách lịch sự† |  |  |
| `cando.push-back-offer-alternative` | Push back once and offer an alternative | Phản đối một lần và đưa ra cách khác | Meaning | "Phản đối" is strong (to oppose); "push back once" is gentler: "Không đồng ý một lần và đề xuất cách khác" |
| `cando.agree-disagree-kindly` | Agree and disagree kindly | Đồng ý và không đồng ý một cách nhẹ nhàng† |  |  |
| `cando.keep-a-meeting-moving` | Keep a meeting moving and give everyone a turn | Giữ nhịp cuộc họp và cho mọi người lượt nói |  |  |
| `cando.short-story-with-a-point` | Tell a short story with a point | Kể một câu chuyện ngắn có ý rõ ràng |  |  |
| `cando.pitch-45s` | Give a 45-second pitch | Trình bày ý tưởng trong 45 giây† |  |  |
| `cando.speak-to-a-group` | Speak in front of a group | Nói trước một nhóm người |  |  |
| `cando.make-a-case-take-a-question` | Make a short case and answer a question | Trình bày ngắn gọn quan điểm và trả lời một câu hỏi |  |  |
| `cando.ask-whats-wrong.certificate` | Asked someone what was wrong and offered help | Đã hỏi ai đó có chuyện gì và ngỏ ý giúp |  |  |
| `cando.introduce-yourself-30s.certificate` | Introduced myself in 30 seconds | Đã giới thiệu bản thân trong 30 giây |  |  |
| `cando.say-what-youre-good-at.certificate` | Said what I’m good at | Đã nói điều mình giỏi |  |  |
| `cando.tell-me-about-yourself.certificate` | Answered “Tell me about yourself” | Đã trả lời câu “Hãy kể về bản thân bạn” |  |  |
| `cando.say-no-politely.certificate` | Said no politely | Đã từ chối một cách lịch sự† |  |  |
| `cando.push-back-offer-alternative.certificate` | Pushed back once and offered an alternative | Đã phản đối một lần và đưa ra cách khác | Meaning | As above |
| `cando.agree-disagree-kindly.certificate` | Agreed and disagreed kindly | Đã đồng ý và không đồng ý một cách nhẹ nhàng† |  |  |
| `cando.keep-a-meeting-moving.certificate` | Kept a meeting moving and gave everyone a turn | Đã giữ nhịp cuộc họp và cho mọi người lượt nói |  |  |
| `cando.short-story-with-a-point.certificate` | Told a short story with a point | Đã kể một câu chuyện ngắn có ý rõ ràng |  |  |
| `cando.pitch-45s.certificate` | Gave a 45-second pitch | Đã trình bày ý tưởng trong 45 giây† |  |  |
| `cando.speak-to-a-group.certificate` | Spoke in front of a group | Đã nói trước một nhóm người |  |  |
| `cando.make-a-case-take-a-question.certificate` | Made a short case and answered a question | Đã trình bày ngắn gọn quan điểm và trả lời một câu hỏi |  |  |

## The season map

`packages/i18n/src/season.vi.ts` · 20 strings

| Key | English | Tiếng Việt | Flag | Notes |
|---|---|---|---|---|
| `season.top` | SEASON {season} · EPISODE {episode} OF {episodes} | MÙA {season} · TẬP {episode}/{episodes} |  |  |
| `season.comingSoon` | Season {season} · coming soon → | Mùa {season} · sắp ra mắt → |  |  |
| `season.next` | EPISODE {episode} · {place} | TẬP {episode} · {place} |  |  |
| `season.place.burrow` | THE BURROW | HANG CỦA BẠN |  |  |
| `season.place.lanternCafe` | LANTERN CAFÉ | QUÁN LANTERN |  |  |
| `season.place.hollowbrookOffice` | HOLLOWBROOK OFFICE | VĂN PHÒNG HOLLOWBROOK |  |  |
| `season.place.lanternInn` | LANTERN INN | NHÀ TRỌ LANTERN |  |  |
| `season.place.bus45` | BUS 45 | XE BUÝT 45 |  |  |
| `season.place.townSquare` | TOWN SQUARE | QUẢNG TRƯỜNG |  |  |
| `season.nextWhen` | {title} · {day} | {title} · {day} |  |  |
| `season.pin.burrow` | Burrow | Burrow | English on purpose? | Map pins stay English while the place names above are Vietnamese; confirm |
| `season.pin.lanternCafe` | Café | Café | English on purpose? | As above |
| `season.pin.hollowbrookOffice` | Office | Office | English on purpose? | As above |
| `season.pin.lanternInn` | Inn | Inn | English on purpose? | As above |
| `season.pin.bus45` | Bus 45 | Bus 45 |  |  |
| `season.pin.townSquare` | Square | Square | English on purpose? | As above |
| `season.a11y.pin` | Episode {episode}, {title}: {state} | Tập {episode}, {title}: {state} |  |  |
| `season.a11y.done` | done | đã xong |  |  |
| `season.a11y.current` | next up | tập tiếp theo |  |  |
| `season.a11y.upcoming` | coming later | sắp tới |  |  |

## Lock-screen knocks (local notifications)

`packages/i18n/src/knocks.vi.ts` · 9 strings

| Key | English | Tiếng Việt | Flag | Notes |
|---|---|---|---|---|
| `knocks.from.yapling` | Yapling | Yapling |  |  |
| `knocks.day2` | Something’s going on at the café. Come with me? | Something’s going on at the café. Come with me? | English on purpose? | Character lines stay English (learning content); the system lines (day 3, 6, 7) are Vietnamese. Confirm the mix on the lock screen |
| `knocks.day3` | {name} got lost today. It has a story for you. | Hôm nay {name} bị lạc. {name} có một câu chuyện muốn kể bạn nghe.† |  |  |
| `knocks.day4` | Can you teach me how to introduce myself at work? | Can you teach me how to introduce myself at work? | English on purpose? | As day 2 |
| `knocks.day5` | Bus 45 leaves at nine sharp. Bring your best story, love. | Bus 45 leaves at nine sharp. Bring your best story, love. | English on purpose? | As day 2 |
| `knocks.day6` | {name} left you a voicemail. | {name} để lại cho bạn một thư thoại. |  |  |
| `knocks.day7` | Your first week is done. One small thing to tell you. | Tuần đầu tiên của bạn đã xong. Có một điều nhỏ muốn nói với bạn. |  |  |
| `knocks.day8` | How was your week? | How was your week? | English on purpose? | As day 2 |
| `knocks.day8_back` | You’re back? I kept your seat warm. | You’re back? I kept your seat warm. | English on purpose? | As day 2 |

## Yapling Plus paywall

`packages/i18n/src/plus.vi.ts` · 39 strings

| Key | English | Tiếng Việt | Flag | Notes |
|---|---|---|---|---|
| `plus.kicker` | YOUR FIRST WEEK WAS ON US | TUẦN ĐẦU TIÊN LÀ QUÀ CỦA TỤI MÌNH | Length | Long for a one-line kicker; check the paywall at 375 pt width. Uses "tụi mình" (see the register note) |
| `plus.title` | Yapling Plus | Yapling Plus |  |  |
| `plus.body` | From today, Free has about {minutes} live minutes a week, plus every story, postcard and voicemail. | Từ hôm nay, bản Miễn phí có khoảng {minutes} phút gọi mỗi tuần, cùng mọi câu chuyện, bưu thiếp và thư thoại. |  |  |
| `plus.table.free` | Free | Miễn phí |  |  |
| `plus.table.plus` | Plus | Plus |  |  |
| `plus.table.liveMinutes` | Live call minutes | Phút gọi trực tiếp |  |  |
| `plus.table.freeMinutes` | ~{minutes}/week | ~{minutes}/tuần |  |  |
| `plus.table.plusMinutes` | ~{minutes}/month* | ~{minutes}/tháng* |  |  |
| `plus.table.stories` | Stories, postcards, voicemails | Truyện, bưu thiếp, thư thoại |  |  |
| `plus.table.homework` | Bring your homework | Mang bài tập của bạn | Machine-like | Literal; it is a feature name (bring a real task and rehearse it with Dex). Consider "Luyện việc thật của bạn" |
| `plus.table.feedback` | Deep feedback & drills | Phản hồi sâu & luyện phát âm | Meaning | "luyện phát âm" is pronunciation practice; "drills" is broader: "Phản hồi sâu & bài luyện" |
| `plus.table.camera` | Camera calls | Gọi có camera |  |  |
| `plus.plan.firstYear` | First year | Năm đầu |  |  |
| `plus.plan.thenYearly` | then {price}/year | sau đó {price}/năm |  |  |
| `plus.plan.intro` | Intro | Ưu đãi |  |  |
| `plus.plan.monthly` | Monthly | Hằng tháng |  |  |
| `plus.plan.cancelAnyTime` | Cancel any time | Huỷ bất cứ lúc nào |  |  |
| `plus.students` | Students: special price with a school email. | Sinh viên: giá ưu đãi với email trường học. |  |  |
| `plus.studentsLink` | Contact support | Liên hệ hỗ trợ |  |  |
| `plus.fairUse` | *Fair use. | *Sử dụng hợp lý. |  |  |
| `plus.stayEitherWay` | {name}, the burrow and the story stay either way. | {name}, hang và câu chuyện vẫn ở đây dù bạn chọn gì. |  |  |
| `plus.cta` | Get Plus | Nâng cấp lên Plus |  |  |
| `plus.ctaTrial` | one: Try {count} day free / other: Try {count} days free | other: Dùng thử miễn phí {count} ngày |  |  |
| `plus.notNow` | Not now | Không phải bây giờ | Term | Literal "Không phải bây giờ"; onboarding says "Để sau" for the same button |
| `plus.restore` | Restore purchases | Khôi phục giao dịch | Term | Apple's Vietnamese uses "Khôi phục mục mua"; consider matching the App Store |
| `plus.terms` | Terms | Điều khoản |  |  |
| `plus.privacy` | Privacy | Quyền riêng tư |  |  |
| `plus.autoRenew` | Renews automatically unless cancelled at least 24 hours before the end of the current period. Manage or cancel in your Apple ID settings. | Gói tự động gia hạn trừ khi bạn huỷ ít nhất 24 giờ trước khi kỳ hiện tại kết thúc. Quản lý hoặc huỷ trong cài đặt Apple ID. |  |  |
| `plus.plan.yearly` | Yearly | Hằng năm |  |  |
| `plus.devOnly` | Dev only: sample prices, no App Store. Purchases are off. | Chỉ bản dev: giá mẫu, không có App Store. Đã tắt mua. |  |  |
| `plus.storeUnavailable` | The App Store isn’t answering right now. Try again in a little while. | App Store chưa phản hồi. Bạn thử lại sau một lúc nhé. |  |  |
| `plus.priceLoading` | … | … |  |  |
| `plus.welcome` | Plus is on. More live minutes start now. | Đã bật Plus. Thêm phút gọi bắt đầu từ bây giờ. |  |  |
| `plus.pending` | Waiting for the App Store to confirm your payment. | Đang chờ App Store xác nhận thanh toán. |  |  |
| `plus.failed` | That didn’t go through. You haven’t been charged. | Giao dịch chưa thành công. Bạn chưa bị trừ tiền. |  |  |
| `plus.restored` | Plus is back on this phone. | Plus đã được khôi phục trên điện thoại này.† |  |  |
| `plus.nothingToRestore` | No Plus purchase to restore on this Apple ID. | Không có giao dịch Plus nào để khôi phục với Apple ID này. |  |  |
| `plus.unavailable` | Purchases aren’t available in this build. | Bản này không hỗ trợ mua hàng. |  |  |
| `plus.a11y.plan` | {plan}, {price}. {detail} | {plan}, {price}. {detail} |  |  |

## The Me sheet, memory page, delete data

`packages/i18n/src/me.vi.ts` · 41 strings

| Key | English | Tiếng Việt | Flag | Notes |
|---|---|---|---|---|
| `me.stage.newcomer` | Newcomer | Người mới |  |  |
| `me.stage.neighbour` | Neighbour | Hàng xóm |  |  |
| `me.stage.regular` | Regular | Khách quen |  |  |
| `me.stage.local` | Local | Người địa phương |  |  |
| `me.stage.voiceOfNatterwick` | Voice of Natterwick | Tiếng nói Natterwick |  |  |
| `me.canDoTitle` | Things you can now do | Những điều bạn đã làm được |  |  |
| `me.group.life` | LIFE | CUỘC SỐNG | Term | See the keepsake track ("ĐỜI SỐNG") |
| `me.group.work` | WORK | CÔNG VIỆC |  |  |
| `me.fixesTitle` | Fixes you now own | Lỗi bạn đã làm chủ | Machine-like | "Lỗi bạn đã làm chủ" is literal; consider "Lỗi bạn đã tự sửa được" |
| `me.progress` | Your progress | Tiến bộ của bạn |  |  |
| `me.timeCapsule` | Time capsule | Hộp thời gian |  |  |
| `me.progressStats` | Flow {flow}s · Pace {pace} wpm · Pauses {pauses}/min | Trôi chảy {flow} giây · {pace} từ/phút · ngắt {pauses} lần/phút | Term | "Trôi chảy"; see the flow term |
| `me.liveMinutes` | Live minutes this week | Phút gọi tuần này |  |  |
| `me.minutesLeft` | {left} of {total} left | còn {left}/{total} |  |  |
| `me.moreWithPlus` | Get more with Plus | Thêm phút với Plus |  |  |
| `me.memory` | What {name} remembers | {name} nhớ gì về bạn |  |  |
| `me.memoryNotes` | one: {count} note / other: {count} notes | other: {count} ghi chú |  |  |
| `me.notifications` | Notifications and quiet hours | Thông báo và giờ yên tĩnh |  |  |
| `me.help` | Help and safety | Trợ giúp và an toàn |  |  |
| `me.a11y.stageOf` | Stage {n} of {total} | Chặng {n}/{total} |  |  |
| `me.progressEmpty` | Numbers arrive after your first call | Số liệu có sau cuộc gọi đầu tiên |  |  |
| `me.liveMinutesMonth` | Live minutes this month | Phút gọi tháng này |  |  |
| `me.quietOff` | Off | Tắt |  |  |
| `me.aiExplainer` | {name} and the neighbours are AI | {name} và hàng xóm là AI |  |  |
| `me.deleteData` | Delete my data | Xoá dữ liệu của mình |  |  |
| `me.delete.title` | Delete all your data? | Xoá toàn bộ dữ liệu? |  |  |
| `me.delete.body` | Your account, your recordings, what {name} remembers and your progress are deleted within 24 hours. This can’t be undone. | Tài khoản, bản ghi âm, những gì {name} nhớ và tiến bộ của bạn sẽ được xoá trong vòng 24 giờ. Không thể hoàn tác. |  |  |
| `me.delete.confirm` | Delete everything | Xoá tất cả |  |  |
| `me.delete.cancel` | Keep my data | Giữ dữ liệu |  |  |
| `me.delete.failed` | Couldn’t delete just now. Try again in a moment. | Chưa xoá được. Bạn thử lại sau một lúc nhé. |  |  |
| `me.memory.body` | Things {name} picked up from your calls. Change or delete anything. | Những điều {name} nhớ từ các cuộc gọi. Bạn có thể sửa hoặc xoá bất cứ điều gì. |  |  |
| `me.memory.about_you` | About you | Về bạn |  |  |
| `me.memory.coming_up` | Coming up | Sắp tới |  |  |
| `me.memory.about_us` | About us | Về tụi mình | Register | "tụi mình" is warm but southern; northern readers say "chúng mình". Used also in the Plus kicker |
| `me.memory.empty` | {name} hasn’t noted anything yet. | {name} chưa ghi nhớ điều gì. |  |  |
| `me.memory.edit` | Edit | Sửa |  |  |
| `me.memory.save` | Save | Lưu |  |  |
| `me.memory.cancel` | Cancel | Huỷ |  |  |
| `me.memory.delete` | Delete | Xoá |  |  |
| `me.memory.a11y.delete` | Delete “{text}” | Xoá “{text}” |  |  |
| `me.memory.failed` | That didn’t save. Try again. | Chưa lưu được. Bạn thử lại nhé. |  |  |

## Safety sheet (crisis)

`packages/i18n/src/safety.vi.ts` · 14 strings

| Key | English | Tiếng Việt | Flag | Notes |
|---|---|---|---|---|
| `safety.kicker` | The story is paused | Câu chuyện đang tạm dừng |  |  |
| `safety.title` | It sounds like things are really hard right now. | Có vẻ mọi thứ đang rất khó khăn với bạn. | Review with care | Crisis copy: needs a native reviewer with care, not just fluency |
| `safety.body` | {name} is an AI and can’t help with this, but a person can. You don’t have to explain anything. | {name} là AI và không thể giúp việc này, nhưng một người thật thì có thể. Bạn không cần giải thích gì cả. | Review with care | As above |
| `safety.emergency` | Emergency | Cấp cứu |  |  |
| `safety.emergencySub` | If you are in danger now · {country} | Nếu bạn đang gặp nguy hiểm · {country} | Review with care | As above |
| `safety.country.vn` | Vietnam | Việt Nam |  |  |
| `safety.a11y.call` | Call {number} | Gọi {number} |  |  |
| `safety.supportLine` | Find a support line | Tìm đường dây hỗ trợ |  |  |
| `safety.supportLineSub` | Free and confidential, near you | Miễn phí, bảo mật, gần bạn |  |  |
| `safety.trusted` | Message someone you trust | Nhắn cho người bạn tin tưởng |  |  |
| `safety.trustedSub` | Opens your contacts | Mở danh bạ |  |  |
| `safety.later` | Back to Natterwick later | Quay lại Natterwick sau |  |  |
| `safety.emergencyLocal` | If you are in danger now, call your local emergency number. | Nếu bạn đang gặp nguy hiểm, hãy gọi số khẩn cấp ở nơi bạn sống. | Review with care | As above |
| `safety.call` | Call {number} | Gọi {number} |  |  |

## Shared: buttons, dates, weekdays, months

`packages/i18n/src/common.vi.ts` · 46 strings

| Key | English | Tiếng Việt | Flag | Notes |
|---|---|---|---|---|
| `common.continue` | Continue | Tiếp tục |  |  |
| `common.done` | Done | Xong |  |  |
| `common.a11y.back` | Back | Quay lại |  |  |
| `common.a11y.close` | Close | Đóng |  |  |
| `common.aiTag` | AI | AI |  |  |
| `common.date.long` | {weekday} {day} {month} | {weekday}, {day} {month} |  |  |
| `common.date.range` | {month} {from} – {to} | {from} – {to} {month} |  |  |
| `common.timeRange` | {from} – {to} | {from} – {to} |  |  |
| `common.weekday.mon` | Monday | Thứ Hai |  |  |
| `common.weekday.tue` | Tuesday | Thứ Ba |  |  |
| `common.weekday.wed` | Wednesday | Thứ Tư |  |  |
| `common.weekday.thu` | Thursday | Thứ Năm |  |  |
| `common.weekday.fri` | Friday | Thứ Sáu |  |  |
| `common.weekday.sat` | Saturday | Thứ Bảy |  |  |
| `common.weekday.sun` | Sunday | Chủ Nhật |  |  |
| `common.weekdayShort.mon` | Mon | Thứ Hai | Length | The short weekdays are the full names ("Thứ Hai"); where space is tight Vietnamese uses "T2"…"CN". Same for every short weekday |
| `common.weekdayShort.tue` | Tue | Thứ Ba |  |  |
| `common.weekdayShort.wed` | Wed | Thứ Tư |  |  |
| `common.weekdayShort.thu` | Thu | Thứ Năm |  |  |
| `common.weekdayShort.fri` | Fri | Thứ Sáu |  |  |
| `common.weekdayShort.sat` | Sat | Thứ Bảy |  |  |
| `common.weekdayShort.sun` | Sun | Chủ Nhật |  |  |
| `common.month.1` | January | tháng 1 |  |  |
| `common.month.2` | February | tháng 2 |  |  |
| `common.month.3` | March | tháng 3 |  |  |
| `common.month.4` | April | tháng 4 |  |  |
| `common.month.5` | May | tháng 5 |  |  |
| `common.month.6` | June | tháng 6 |  |  |
| `common.month.7` | July | tháng 7 |  |  |
| `common.month.8` | August | tháng 8 |  |  |
| `common.month.9` | September | tháng 9 |  |  |
| `common.month.10` | October | tháng 10 |  |  |
| `common.month.11` | November | tháng 11 |  |  |
| `common.month.12` | December | tháng 12 |  |  |
| `common.monthShort.1` | Jan | tháng 1 | Length | Short months equal the long ones ("tháng 1"); fine unless a tight label needs "Th1". Same for every short month |
| `common.monthShort.2` | Feb | tháng 2 |  |  |
| `common.monthShort.3` | Mar | tháng 3 |  |  |
| `common.monthShort.4` | Apr | tháng 4 |  |  |
| `common.monthShort.5` | May | tháng 5 |  |  |
| `common.monthShort.6` | Jun | tháng 6 |  |  |
| `common.monthShort.7` | Jul | tháng 7 |  |  |
| `common.monthShort.8` | Aug | tháng 8 |  |  |
| `common.monthShort.9` | Sep | tháng 9 |  |  |
| `common.monthShort.10` | Oct | tháng 10 |  |  |
| `common.monthShort.11` | Nov | tháng 11 |  |  |
| `common.monthShort.12` | Dec | tháng 12 |  |  |

## Test menu (development builds only)

Seen only in development builds by the team: no review needed; listed for completeness.

`packages/i18n/src/devmenu.vi.ts` · 18 strings

| Key | English | Tiếng Việt | Flag | Notes |
|---|---|---|---|---|
| `devmenu.cost.open` | Call costs | Chi phí cuộc gọi |  |  |
| `devmenu.cost.title` | Call costs | Chi phí cuộc gọi |  |  |
| `devmenu.cost.back` | Back | Quay lại |  |  |
| `devmenu.cost.refresh` | Refresh | Tải lại |  |  |
| `devmenu.cost.loading` | Loading the last calls… | Đang tải các cuộc gọi gần đây… |  |  |
| `devmenu.cost.failed` | Couldn’t load the costs ({reason}). | Không tải được chi phí ({reason}). |  |  |
| `devmenu.cost.empty` | No live calls on this learner yet. | Người học này chưa có cuộc gọi trực tiếp nào. |  |  |
| `devmenu.cost.server` | From {server} | Từ {server} |  |  |
| `devmenu.cost.totalsHeading` | one: THE LAST CALL / other: THE LAST {count} CALLS | other: {count} CUỘC GỌI GẦN ĐÂY |  |  |
| `devmenu.cost.total` | ${usd} in {minutes} min · ${perMinute} a minute | ${usd} trong {minutes} phút · ${perMinute} mỗi phút |  |  |
| `devmenu.cost.talk` | The learner talked {minutes} min | Người học đã nói {minutes} phút |  |  |
| `devmenu.cost.latency` | Reply P50 {p50} ms · P90 {p90} ms over {turns} turns | Trả lời P50 {p50} ms · P90 {p90} ms qua {turns} lượt |  |  |
| `devmenu.cost.phone` | On the phone P50 {p50} ms · P90 {p90} ms | Trên điện thoại P50 {p50} ms · P90 {p90} ms |  |  |
| `devmenu.cost.callsHeading` | CALLS | CUỘC GỌI |  |  |
| `devmenu.cost.call` | {when} · {kind} · {duration} · {reason} | {when} · {kind} · {duration} · {reason} |  |  |
| `devmenu.cost.callCost` | ${usd}: speech-to-text ${stt} · voice ${tts} · model ${llm} · summary ${summary} | ${usd}: nhận giọng ${stt} · giọng nói ${tts} · mô hình ${llm} · tóm tắt ${summary} |  |  |
| `devmenu.cost.callLatency` | P50 {p50} ms · P90 {p90} ms · {turns} turns · learner {learner} s | P50 {p50} ms · P90 {p90} ms · {turns} lượt · người học {learner} giây |  |  |
| `devmenu.cost.none` | – | – |  |  |

