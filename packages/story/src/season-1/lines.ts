import type { CharacterId, Id } from '@yapling/contracts';

import { glossed, viDesign, viDraft } from '../gloss';
import type { Glosses, GlossedText, LineKind, Meaning } from '../types';

/*
 * Season 1's per-line extras: glosses for the recorded lines shown on screen, the hand-written
 * meanings, and the written lines still waiting to be recorded.
 */

/** Glosses of recorded lines, by line id. Prologue and Episode 1 reuse the prototype's verbatim. */
export const S1_LINE_GLOSSES: Readonly<Record<Id, Glosses>> = {
  's1-pro-01': viDesign(
    'Đây rồi. Hang của tụi mình! Toàn thùng là thùng. Còn một thùng! Giúp mình dỡ đồ nhé?',
  ),
  's1-pro-02': viDesign('Mình đã biết ba điều về bạn rồi.'),
  's1-pro-03': viDesign('Chào! Mình là Linh, nhà bên cạnh. Khi ổn định rồi, ghé quán cà phê nhé.'),
  's1-e1-01': viDesign('Mẹo nhỏ: khi quên một từ, hãy mô tả nó.'),
  's1-e1-02': viDesign('Ồ! Chào hai bạn. Xin lỗi, mình hơi… Ngồi đi. Bánh mì kaya nhé?'),
  's1-e1-03': viDesign('Cô ấy trông buồn. Bạn hỏi cô ấy có chuyện gì không?'),
  's1-e1-04': viDesign('Gấp đôi! Mình không trả nổi gấp đôi. Mình cần một kế hoạch trước thứ Sáu.'),
  's1-e1-05': viDesign('"Rent" nghĩa là gì? Là một loại bánh mì à?'),
  's1-e1-06': viDesign(
    'Bạn gọi cho họ giúp mình được không? Tiếng Anh của mình lộn xộn khi mình bực.',
  ),
  's1-e1-07': viDesign('Được rồi. Vậy… mình làm gì đây?'),
  's1-e1-08': viDesign('Mình cũng có ý! Mình sẽ đi làm! Mình sẽ giúp trả tiền!'),
  's1-e1-09': viDesign('Bạn? Đi làm? Được rồi. Cảm ơn cả hai.'),
  's1-e1-10': viDesign(
    'Tin lớn! Hollowbrook đang tuyển người. Thứ Năm mình có buổi phỏng vấn. Bạn giúp mình luyện tập nhé?',
  ),
  's1-e1-11': viDesign(
    'Trong lúc bạn đi vắng: tiền thuê của Mei tăng gấp đôi, tụi mình gọi văn phòng, và mình quyết định đi làm.',
  ),
  // Postcards from later weeks (shown on screen).
  's1-e2-01': viDraft(
    'Chào! Mình là Sol ở Hollowbrook. Hẹn gặp bạn và Pip vào thứ Năm. Mẹo nhỏ: người phỏng vấn rất thích ví dụ!',
  ),
  's1-e5-01': viDraft('Xe buýt 45 chạy lúc đúng chín giờ. Mang theo câu chuyện hay nhất nhé.'),
};

/** Hand-written answers to "What does that mean?", by line id. */
export const S1_LINE_MEANINGS: Readonly<Record<Id, Meaning>> = {
  's1-e1-06': {
    simple: '"Goes funny" means it stops working well. Like your words get mixed up.',
    glosses: viDesign('"goes funny" = trở nên lộn xộn, không còn ổn'),
  },
};

/** A written line not recorded yet. Until it is, the call speaks `text` with TTS. */
export interface ScriptedLine {
  readonly id: Id;
  readonly character: CharacterId;
  /** The voice text with Eleven v4 tags, ready for `audio/season-1/lines.json`. */
  readonly text: string;
  readonly kind: LineKind;
  readonly glosses: Glosses;
  readonly segments: readonly GlossedText[];
}

const SEAGULL_SEGMENTS: readonly GlossedText[] = [
  glossed(
    'Okay, story time! Today I walked around town alone. I wanted bread, but I got lost.',
    viDraft(
      'Được rồi, đến giờ kể chuyện! Hôm nay mình đi dạo quanh thị trấn một mình. Mình muốn mua bánh mì, nhưng mình bị lạc.',
    ),
  ),
  glossed(
    "So I asked a seagull for directions. 'Excuse me, where is the bread shop?' The seagull looked at me. Then it took my map!",
    viDraft(
      'Thế là mình hỏi đường một con hải âu. "Xin lỗi, tiệm bánh mì ở đâu ạ?" Con hải âu nhìn mình. Rồi nó cướp luôn tấm bản đồ!',
    ),
  ),
  glossed(
    "No map, no bread. Then a crab from the harbour said, 'Can I help?' Can I help! What a good question. She showed me the way.",
    viDraft(
      'Không bản đồ, không bánh mì. Rồi một cô cua ở bến cảng hỏi: "Mình giúp được không?" Câu hỏi hay quá! Cô ấy chỉ đường cho mình.',
    ),
  ),
  glossed(
    'Tomorrow, I want to say it to someone too.',
    viDraft('Ngày mai, mình cũng muốn nói câu đó với ai đó.'),
  ),
];

/** The whole-line gloss of a segmented line: its segments' glosses joined. */
const joinGlosses = (segments: readonly GlossedText[]): Glosses => {
  const texts = segments.map((s) => s.glosses.vi?.text ?? '');
  const reviewed = segments.every((s) => s.glosses.vi?.reviewed === true);
  return { vi: { text: texts.join(' '), reviewed } };
};

export const S1_SCRIPTED_LINES: readonly ScriptedLine[] = [
  {
    // Pip's voice story for the week of the letter: about 40 s at Newcomer speed, seeded with
    // "Can I help?". Written in Pip's simple, correct learner English.
    id: 's1-e1-story-seagull',
    character: 'pip',
    text: "[excited] Okay, story time! Today I walked around town alone. I wanted bread, but I got lost. So I asked a seagull for directions. 'Excuse me, where is the bread shop?' The seagull looked at me. [surprised] Then it took my map! [laughs] No map, no bread. Then a crab from the harbour said, 'Can I help?' Can I help! What a good question. She showed me the way. [warmly] Tomorrow, I want to say it to someone too.",
    kind: 'story',
    glosses: joinGlosses(SEAGULL_SEGMENTS),
    segments: SEAGULL_SEGMENTS,
  },
  {
    // After the cliffhanger voicemail: Pip reuses the week's phrase slightly wrong, on purpose,
    // so the learner can fix it.
    id: 's1-e1-vm-oops',
    character: 'pip',
    text: '[proud] Oh! And today at the café, a customer came in, and I said: Can I helping you?',
    kind: 'voicemail',
    glosses: viDesign('Hôm nay ở quán có khách vào, mình nói: Can I helping you?'),
    segments: [],
  },
  {
    id: 's1-e1-vm-thanks',
    character: 'pip',
    text: "[excited] Can I help you? Can I help you! Thank you. It's growing a leaf!",
    kind: 'voicemail',
    glosses: viDesign('Cảm ơn! Nó mọc lá rồi!'),
    segments: [],
  },
];
