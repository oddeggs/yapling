import type { Translation } from './catalogue-types';
import type { errorsEn } from './errors.en';

export const errorsVi = {
  'errors.offline.kicker': 'MẤT KẾT NỐI',
  'errors.offline.title': 'Đường dây của {name} đang rè. Thử gửi tin nhắn thoại nhé?',
  'errors.offline.body': 'Tin nhắn sẽ tự gửi khi có mạng trở lại.',
  'errors.offline.voiceNote': 'Ghi tin nhắn thoại',
  'errors.offline.retry': 'Thử gọi lại',
  'errors.mic.kicker': 'MICRO ĐANG TẮT',
  'errors.mic.title': '{name} chưa nghe được bạn',
  'errors.mic.body': 'Micro đang tắt cho Yapling. Bật trong Cài đặt để {name} nghe được bạn nhé.',
  'errors.mic.openSettings': 'Mở Cài đặt',
  'errors.mic.type': 'Nhắn chữ thay thế',
} as const satisfies Translation<typeof errorsEn>;
