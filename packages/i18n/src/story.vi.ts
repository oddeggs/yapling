import type { Translation } from './catalogue-types';
import type { storyEn } from './story.en';

export const storyVi = {
  'story.place.voiceStory': 'Tin nhắn thoại · {duration}',
  'story.place.voicemail': 'Hộp thư thoại',
  'story.nothingToFail': 'Không tính phút gọi · không có gì để trượt',
  'story.voicemailFrom': 'Thư thoại từ {name}',
  'story.thanks': 'Cảm ơn {name}',
  'story.postmark': 'NATTERWICK',
  'story.gift.seagullFeather': 'Đồ mới trong hang: lông hải âu',
  'story.voicemail.opening': 'Đang mở thư thoại…',
  'story.voicemail.nowASprout': 'Đã nảy mầm',
  'story.voicemail.workedItOut': '{name} tự nhớ ra rồi',
  'story.voicemail.offline': 'Đường dây đang rè. Thư thoại của {name} vẫn chờ bạn ở đây.',
  'story.voicemail.tryAgain': 'Thử lại',
  'story.a11y.waveform': 'Đã nghe {elapsed} trên {duration}',
  'story.a11y.postcard': 'Bưu thiếp từ {name}: {text}',
} as const satisfies Translation<typeof storyEn>;
