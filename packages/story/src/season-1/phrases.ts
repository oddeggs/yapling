import { viDesign, viDraft } from '../gloss';
import type { TargetPhrase } from '../types';

/** Season 1's target phrases, four per episode, from the season overview. */
export const S1_PHRASES = [
  // Episode 1, glossed in the design's week view.
  { id: 'whats-wrong', en: "What's wrong?", glosses: viDesign('Có chuyện gì vậy?') },
  { id: 'i-need-a-plan', en: 'I need a plan', glosses: viDesign('Mình cần một kế hoạch') },
  { id: 'can-i-help', en: 'Can I help?', glosses: viDesign('Mình giúp được không?') },
  { id: 'i-think-you-should', en: 'I think you should…', glosses: viDesign('Mình nghĩ bạn nên…') },
  // Episode 2
  { id: 'im-good-at', en: "I'm good at…", glosses: viDraft('Mình giỏi…') },
  { id: 'for-example', en: 'For example,…', glosses: viDraft('Ví dụ,…') },
  { id: 'id-love-to', en: "I'd love to…", glosses: viDraft('Mình rất muốn…') },
  { id: 'just-to-confirm', en: 'Just to confirm…', glosses: viDraft('Cho mình xác nhận lại…') },
  // Episode 3
  {
    id: 'sorry-we-cant',
    en: "I'm sorry, we can't do that",
    glosses: viDraft('Xin lỗi, chúng tôi không làm vậy được'),
  },
  { id: 'how-about', en: 'How about…?', glosses: viDraft('Hay là…?') },
  {
    id: 'fair-point-but',
    en: "That's a fair point, but…",
    glosses: viDraft('Bạn nói cũng có lý, nhưng…'),
  },
  { id: 'deal', en: 'Deal', glosses: viDraft('Chốt!') },
  // Episode 4
  { id: 'what-do-you-think', en: 'What do you think?', glosses: viDraft('Bạn nghĩ sao?') },
  { id: 'good-idea-and', en: 'Good idea, and…', glosses: viDraft('Ý hay đó, và…') },
  { id: 'lets-hear-from', en: "Let's hear from…", glosses: viDraft('Mình nghe ý kiến của… nhé') },
  { id: 'to-sum-up', en: 'So, to sum up…', glosses: viDraft('Vậy, tóm lại…') },
  // Episode 5
  { id: 'heres-the-thing', en: "Here's the thing", glosses: viDraft('Chuyện là thế này') },
  {
    id: 'it-matters-because',
    en: 'It matters because…',
    glosses: viDraft('Điều này quan trọng vì…'),
  },
  { id: 'would-you-sign', en: 'Would you sign?', glosses: viDraft('Bạn ký giúp được không?') },
  {
    id: 'thanks-for-listening',
    en: 'Thanks for listening',
    glosses: viDraft('Cảm ơn bạn đã lắng nghe'),
  },
  // Episode 6
  {
    id: 'a-few-words',
    en: "I'd like to say a few words",
    glosses: viDraft('Tôi xin phép nói vài lời'),
  },
  { id: 'first-second', en: 'First,… Second,…', glosses: viDraft('Thứ nhất,… Thứ hai,…') },
  { id: 'great-question', en: "That's a great question", glosses: viDraft('Câu hỏi hay quá') },
  { id: 'thank-you-all', en: 'Thank you all', glosses: viDraft('Cảm ơn tất cả mọi người') },
] as const satisfies readonly TargetPhrase[];

export type S1PhraseId = (typeof S1_PHRASES)[number]['id'];
