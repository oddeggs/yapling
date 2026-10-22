import type { Id } from '@yapling/contracts';

import { viDraft } from '../gloss';
import type { Glosses } from '../types';

/*
 * On-screen extras for the Settling-in lines and the week-1 Visitor lines, from the script of
 * record (`docs/season-1-script.md`, "Settling in"). Keyed by line id, whether the line is
 * recorded yet or still pending. Glosses await the native review list, so they are drafts.
 */

/** Vietnamese glosses of the English lines. */
export const SETTLING_LINE_GLOSSES: Readonly<Record<Id, Glosses>> = {
  // Chapter 1 · Hello
  's1-set1-01': viDraft('Chào bạn! Mình là Linh.'),
  's1-set1-03': viDraft('Chào! Chào Linh!'),
  's1-set1-04': viDraft('Mình là Linh. Còn bạn?'),
  's1-set1-05': viDraft('{name}! Rất vui được gặp bạn.'),
  's1-set1-06': viDraft('Mình cũng rất vui được gặp bạn! Mình là Pip!'),
  's1-set1-07': viDraft('Tạm biệt! Mai gặp nhé.'),
  // Chapter 2 · Boxes
  's1-set2-01': viDraft('Nhiều thùng quá! Giúp mình với!'),
  's1-set2-03': viDraft('Đây là thùng của bạn à?'),
  's1-set2-04': viDraft('Sách hay quần áo?'),
  's1-set2-05': viDraft('Trà nhé? Cho bạn đó!'),
  's1-set2-06': viDraft('Quà cho bạn nè. Của bạn đây!'),
  's1-set2-07': viDraft('Không có gì!'),
  's1-set2-08': viDraft('Xong một thùng! Cảm ơn bạn!'),
  // Chapter 3 · Again, please
  's1-set3-02': viDraft('Xin lỗi? Nói lại giúp mình nhé.'),
  's1-set3-03': viDraft('Nói chậm giúp mình nhé.'),
  's1-set3-04': viDraft('Ồ, mình tìm thấy đồ ăn vặt, bản đồ và sổ tay rồi!'),
  's1-set3-05': viDraft('Đồ ăn vặt. Bản đồ. Sổ tay!'),
  's1-set3-06': viDraft('Thấy chưa? Lần nào cũng được.'),
  's1-set3-07': viDraft('Dùng mỗi ngày nhé. Tạm biệt!'),
  // Chapter 4 · Bus 45
  's1-set4-01': viDraft('Đây là trạm xe buýt.'),
  's1-set4-02': viDraft('Chào buổi sáng! Đây là xe buýt số 45.'),
  's1-set4-03': viDraft('Xe nào? Số 45 hay số 50?'),
  's1-set4-04': viDraft('Chín giờ xe chạy nhé.'),
  's1-set4-05': viDraft('Mấy giờ? Chín giờ hay mười giờ?'),
  's1-set4-06': viDraft('Mỗi vé hai đô nhé.'),
  's1-set4-07': viDraft('Mấy vé? Một hay hai?'),
  's1-set4-08': viDraft('Hai vé. Của bạn đây!'),
  's1-set4-09': viDraft('Tuyệt! Chúc một ngày vui vẻ!'),
  // Chapter 5 · Mei's café
  's1-set5-01': viDraft('Chào! Chào mừng đến quán của mình!'),
  's1-set5-02': viDraft('Mình là Mei. Trà hay cà phê?'),
  's1-set5-03': viDraft('Thêm bánh mì nướng kaya không? Ngon lắm đó!'),
  's1-set5-04': viDraft('Hỏi Mei đi: bao nhiêu tiền?'),
  's1-set5-05': viDraft('Ba đô nhé.'),
  's1-set5-06': viDraft('Cảm ơn nha. Ăn ngon nhé!'),
  's1-set5-07': viDraft('Thôi. Làm tiếp thôi.'),
  's1-set5-08': viDraft('Mei trông mệt quá.'),
  // Chapter 6 · About me
  's1-set6-01': viDraft('Mình đang viết một trang về bạn!'),
  's1-set6-02': viDraft('Mình đến từ Việt Nam. Còn bạn?'),
  's1-set6-03': viDraft('Mình làm ở thư viện. Còn bạn?'),
  's1-set6-04': viDraft('Mình thích đồ ăn vặt! Còn bạn?'),
  's1-set6-06': viDraft('Nhìn kìa! Có lá thư dưới cửa quán Mei!'),
  // Shared lines
  's1-set-linh-great': viDraft('Tuyệt!'),
  's1-set-linh-yes': viDraft('Đúng rồi!'),
  's1-set-pip-great': viDraft('Tuyệt!'),
  's1-set-pip-yes': viDraft('Đúng rồi!'),
  's1-set-mei-great': viDraft('Tuyệt!'),
  's1-set-bea-lovely': viDraft('Tuyệt quá!'),
  's1-set-linh-okay': viDraft('Được rồi!'),
  's1-set-linh-again': viDraft('Nói lại nhé?'),
  's1-set-mei-okay': viDraft('Được rồi!'),
  's1-set-bea-right': viDraft('Được rồi!'),
  's1-set-linh-slowly': viDraft('Được. Mình nói chậm nhé:'),
  's1-set-pip-slowly': viDraft('Ừ! Nói chậm nhé:'),
  's1-set-mei-slowly': viDraft('Được, được.'),
  's1-set-bea-slowly': viDraft('Tất nhiên rồi.'),
  's1-set-linh-skip': viDraft('Không sao đâu!'),
  // Week 1 for Visitors
  's1-e1-visitor-rent': viDraft('"Rent"… là bánh mì à? Hay là tiền?'),
  's1-e1-visitor-call': viDraft('Bạn gọi cho họ được không? Nhờ bạn nhé?'),
  's1-e1-visitor-postcard': viDraft('Nhớ nhé: Sorry? Again, please. Lúc nào cũng được!'),
};

/** What Linh's Vietnamese lines say, in English. */
export const SETTLING_LINE_ENGLISH: Readonly<Record<Id, string>> = {
  's1-set1-02':
    "Hi! I'm Linh, from next door. When I got off the ferry, I couldn't say a word either. Now I'll say it first, and you say it after me.",
  's1-set1-08': 'You just spoke English! See you tomorrow.',
  's1-set2-02': "I'll ask; you pick a card and read it out loud.",
  's1-set3-01':
    "Here are two lifesavers. If you didn't catch it, say: Sorry? Again, please. If people talk too fast, say: Slowly, please. In Natterwick, everyone's happy to say it again for you.",
  's1-set6-05': "Well done! You're ready. See you at Mei's café tomorrow.",
  's1-set-linh-together': "Let's say it together.",
  's1-set-linh-english': 'Try it in English; just read the card.',
};
