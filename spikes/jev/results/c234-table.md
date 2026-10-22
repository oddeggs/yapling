
**Candidate 2: English attempt, Vietnamese or noise** (59 cases × 3 runs)

| Method | Accuracy | Same in all 3 runs | Wrong |
|---|---|---|---|
| Code: real-words check (lane version) | 83.1% | deterministic | stt-vi02 "Có chuyện gì vậy chị?" [vietnamese] → english (stt:vi02 (vi: Có chuyện gì vậy chị?)); stt-vi06 "Dạ, cảm ơn." [vietnamese] → english (stt:vi06 (vi: Dạ, cảm ơn.)); w01 "Toi khong biet." [vietnamese] → english (written); w03 "Dạ." [vietnamese] → english (written); w11 "Ugh, the" [noise] → english (written); w12 "Ơ kìa." [vietnamese] → english (written); w16 "Cam on." [vietnamese] → english (written); w20 "Ừm, không." [vietnamese] → english (written); w22 "Day la cai gi?" [vietnamese] → english (written); w24 "Uh huh uh" [noise] → english (written) |
| Code: real words + Vietnamese marks | 91.5% | deterministic | w01 "Toi khong biet." [vietnamese] → english (written); w11 "Ugh, the" [noise] → english (written); w16 "Cam on." [vietnamese] → english (written); w22 "Day la cai gi?" [vietnamese] → english (written); w24 "Uh huh uh" [noise] → english (written) |
| Jev, argmax | 94.9% | 59/59 | stt-vi14 "Oh." [vietnamese] → english,english,english (stt:vi14 (vi: Ừ.)); w11 "Ugh, the" [noise] → english,english,english (written); w16 "Cam on." [vietnamese] → english,english,english (written) |
| Haiku 5.5, same question | 96.6% | 59/59 | stt-vi14 "Oh." [vietnamese] → english,english,english (stt:vi14 (vi: Ừ.)); w11 "Ugh, the" [noise] → english,english,english (written) |
| Code, then Jev on what code calls English | 96.6% | 59/59 | w11 "Ugh, the" [noise] → english,english,english (written); w16 "Cam on." [vietnamese] → english,english,english (written) |

**Candidate 3: "again" / "slowly"** (40 cases × 3 runs)

| Method | Accuracy | Same in all 3 runs | Wrong |
|---|---|---|---|
| Code: the doc's word list (sorry, again, pardon, repeat / slow, slowly) | 62.5% | deterministic | a05 "What did you say?" [repeat] → neither; a09 "One more time please." [repeat] → neither; a10 "Nói lại được không?" [repeat] → neither; a15 "Excuse me?" [repeat] → neither; a17 "Too fast." [slower] → neither; a18 "Can you speak slower?" [slower] → neither; a20 "Chậm thôi." [slower] → neither; a21 "You speak very fast, I don't understand." [slower] → neither; a23 "Bạn nói nhanh quá." [slower] → neither; a28 "Sorry, I'm late." [neither] → repeat; a29 "I'm sorry to hear that." [neither] → repeat; a30 "I go to the gym again and again." [neither] → repeat; a31 "I work slowly." [neither] → slower; a34 "Sorry, I think you should go to the office." [neither] → repeat; a38 "Again? Oh no, the rent again!" [neither] → repeat |
| Code: a fuller phrase list (written for this set) | 85.0% | deterministic | a01 "Sorry?" [repeat] → neither; a08 "Sorry, I don't hear." [repeat] → neither; a15 "Excuse me?" [repeat] → neither; a30 "I go to the gym again and again." [neither] → repeat; a31 "I work slowly." [neither] → slower; a38 "Again? Oh no, the rent again!" [neither] → repeat |
| Jev, argmax | 100.0% | 40/40 |  |
| Haiku 5.5, same question | 100.0% | 40/40 |  |

**Candidate 4: card match fallback, all cases** (45 cases × 3 runs)

| Method | Accuracy | Same in all 3 runs | Wrong |
|---|---|---|---|
| Code: word match | 46.7% | deterministic | k01 "T please." [a] → neither; k02 "The client." [a] → neither; k04 "Copy, please." [b] → neither; k07 "Tee, plea." [a] → neither; k09 "Nai to mit you." [a] → neither; k11 "Bai!" [a] → neither; k12 "Buy." [a] → neither; k13 "Tank you." [a] → neither; k14 "Sank you!" [a] → neither; k16 "Forty fife." [a] → neither; k17 "For tea five." [a] → neither; k24 "How mud?" [a] → neither; k26 "Hear you go." [a] → neither; k27 "Hia yu go." [a] → neither; k29 "Close." [b] → neither; k31 "Yet, pees." [a] → neither; k35 "Agen, plis." [a] → neither; k36 "I am study." [a] → neither; k37 "I work in off is." [b] → a; k39 "I lie coffee." [a] → neither; k40 "I love music." [b] → neither; k42 "Hai!" [a] → neither; k44 "Too please." [a] → neither; k45 "Won, please." [b] → neither |
| Jev, argmax | 85.9% | 42/45 | k02 "The client." [a] → neither,neither,neither; k04 "Copy, please." [b] → a,a; k05 "Trà." [neither] → a,a,a; k18 "Fifteen." [b] → a,a; k22 "Eleven." [neither] → b,b,b; k30 "Shoes." [neither] → b,b,b; k33 "Dạ không." [neither] → b,b,b |
| Jev, a card only at p ≥ 0.6 | 88.9% | 45/45 | k02 "The client." [a] → neither,neither,neither; k04 "Copy, please." [b] → neither,neither,neither; k05 "Trà." [neither] → a,a,a; k22 "Eleven." [neither] → b,b,b; k33 "Dạ không." [neither] → b,b,b |
| Jev, a card only at p ≥ 0.75 | 89.6% | 43/45 | k02 "The client." [a] → neither,neither,neither; k04 "Copy, please." [b] → neither,neither,neither; k05 "Trà." [neither] → a,a,a; k17 "For tea five." [a] → neither; k31 "Yet, pees." [a] → neither; k33 "Dạ không." [neither] → b,b,b |
| Haiku 5.5, same question | 86.7% | 44/45 | k02 "The client." [a] → neither,neither,neither; k05 "Trà." [neither] → a,a,a; k18 "Fifteen." [b] → a,a,a; k29 "Close." [b] → neither,neither,neither; k30 "Shoes." [neither] → b,b,b; k33 "Dạ không." [neither] → b,b,b |
| Word match, then Jev ≥ 0.6 on a miss | 86.7% | 45/45 | k02 "The client." [a] → neither,neither,neither; k04 "Copy, please." [b] → neither,neither,neither; k05 "Trà." [neither] → a,a,a; k22 "Eleven." [neither] → b,b,b; k33 "Dạ không." [neither] → b,b,b; k37 "I work in off is." [b] → a,a,a |

**Candidate 4: only the turns word match missed (where the fallback runs)** (40 cases × 3 runs)

| Method | Accuracy | Same in all 3 runs | Wrong |
|---|---|---|---|
| Jev, argmax | 84.2% | 37/40 | k02 "The client." [a] → neither,neither,neither; k04 "Copy, please." [b] → a,a; k05 "Trà." [neither] → a,a,a; k18 "Fifteen." [b] → a,a; k22 "Eleven." [neither] → b,b,b; k30 "Shoes." [neither] → b,b,b; k33 "Dạ không." [neither] → b,b,b |
| Jev, a card only at p ≥ 0.6 | 87.5% | 40/40 | k02 "The client." [a] → neither,neither,neither; k04 "Copy, please." [b] → neither,neither,neither; k05 "Trà." [neither] → a,a,a; k22 "Eleven." [neither] → b,b,b; k33 "Dạ không." [neither] → b,b,b |
| Jev, a card only at p ≥ 0.75 | 88.3% | 38/40 | k02 "The client." [a] → neither,neither,neither; k04 "Copy, please." [b] → neither,neither,neither; k05 "Trà." [neither] → a,a,a; k17 "For tea five." [a] → neither; k31 "Yet, pees." [a] → neither; k33 "Dạ không." [neither] → b,b,b |
| Haiku 5.5, same question | 85.0% | 40/40 | k02 "The client." [a] → neither,neither,neither; k05 "Trà." [neither] → a,a,a; k18 "Fifteen." [b] → a,a,a; k29 "Close." [b] → neither,neither,neither; k30 "Shoes." [neither] → b,b,b; k33 "Dạ không." [neither] → b,b,b |
