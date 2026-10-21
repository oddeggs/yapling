import type { candoEn } from './cando.en';
import type { Translation } from './catalogue-types';

export const candoVi = {
  'cando.ask-whats-wrong': 'Hỏi ai đó có chuyện gì và ngỏ ý giúp',
  'cando.introduce-yourself-30s': 'Giới thiệu bản thân trong 30 giây',
  'cando.say-what-youre-good-at': 'Nói điều bạn giỏi',
  'cando.tell-me-about-yourself': 'Trả lời câu “Hãy kể về bản thân bạn”',
  'cando.say-no-politely': 'Từ chối một cách lịch sự',
  'cando.push-back-offer-alternative': 'Phản đối một lần và đưa ra cách khác',
  'cando.agree-disagree-kindly': 'Đồng ý và không đồng ý một cách nhẹ nhàng',
  'cando.keep-a-meeting-moving': 'Giữ nhịp cuộc họp và cho mọi người lượt nói',
  'cando.short-story-with-a-point': 'Kể một câu chuyện ngắn có ý rõ ràng',
  'cando.pitch-45s': 'Trình bày ý tưởng trong 45 giây',
  'cando.speak-to-a-group': 'Nói trước một nhóm người',
  'cando.make-a-case-take-a-question': 'Trình bày ngắn gọn quan điểm và trả lời một câu hỏi',
} as const satisfies Translation<typeof candoEn>;
