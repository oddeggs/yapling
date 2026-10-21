import type { Translation } from './catalogue-types';
import type { payoffEn } from './payoff.en';

export const payoffVi = {
  'payoff.afterCall.firstCall': 'Cuộc gọi đầu tiên',
  'payoff.afterCall.done': 'Xong rồi!',
  'payoff.afterCall.winsTitle': '2 ĐIỀU LÀM TỐT',
  'payoff.afterCall.fixTitle': '1 LỖI ĐÃ SỬA',
  'payoff.afterCall.sproutsTitle': 'TỪ GÓI HẠT THÀNH MẦM',
  'payoff.afterCall.ring': 'Vòng tuần · {done}/{total}',
  'payoff.afterCall.boxUnpacked': 'Một thùng trong hang đã được dỡ',
  'payoff.afterCall.cta': 'Về hang',
  'payoff.keepsake.title': 'Vòng tuần đã đầy!',
  'payoff.keepsake.week': 'TUẦN {week}',
  'payoff.keepsake.roommateSays': 'Mình tự vẽ đó. {witness} đã ký!',
  'payoff.keepsake.cta': 'Treo lên tường',
  'payoff.keepsake.hung': 'Đã treo trên tường hang',
  'payoff.keepsake.canNow': '{learner} can now…',
  'payoff.keepsake.witnessed': 'witnessed by {witness} · {date}',
} as const satisfies Translation<typeof payoffEn>;
