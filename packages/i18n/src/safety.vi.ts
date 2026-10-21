import type { Translation } from './catalogue-types';
import type { safetyEn } from './safety.en';

export const safetyVi = {
  'safety.kicker': 'Câu chuyện đang tạm dừng',
  'safety.title': 'Có vẻ mọi thứ đang rất khó khăn với bạn.',
  'safety.body':
    '{name} là AI và không thể giúp việc này, nhưng một người thật thì có thể. Bạn không cần giải thích gì cả.',
  'safety.emergency': 'Cấp cứu',
  'safety.emergencySub': 'Nếu bạn đang gặp nguy hiểm · {country}',
  'safety.country.vn': 'Việt Nam',
  'safety.a11y.call': 'Gọi {number}',
  'safety.supportLine': 'Tìm đường dây hỗ trợ',
  'safety.supportLineSub': 'Miễn phí, bảo mật, gần bạn',
  'safety.trusted': 'Nhắn cho người bạn tin tưởng',
  'safety.trustedSub': 'Mở danh bạ',
  'safety.later': 'Quay lại Natterwick sau',
  'safety.emergencyLocal': 'Nếu bạn đang gặp nguy hiểm, hãy gọi số khẩn cấp ở nơi bạn sống.',
  'safety.call': 'Gọi {number}',
} as const satisfies Translation<typeof safetyEn>;
