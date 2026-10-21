import type { Translation } from './catalogue-types';
import type { storyEn } from './story.en';

export const storyVi = {
  'story.place.voiceStory': 'Tin nhắn thoại · {duration}',
  'story.place.voicemail': 'Hộp thư thoại',
  'story.nothingToFail': 'Không tính phút gọi · không có gì để trượt',
  'story.voicemailFrom': 'Thư thoại từ {name}',
  'story.thanks': 'Cảm ơn {name}',
} as const satisfies Translation<typeof storyEn>;
