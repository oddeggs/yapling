import type { Translation } from './catalogue-types';
import type { knocksEn } from './knocks.en';

export const knocksVi = {
  'knocks.from.yapling': 'Yapling',
  'knocks.day2': 'Something’s going on at the café. Come with me?',
  'knocks.day3': 'Hôm nay {name} bị lạc. {name} có một câu chuyện muốn kể bạn nghe.',
  'knocks.day4': 'Can you teach me how to introduce myself at work?',
  'knocks.day5': 'Bus 45 leaves at nine sharp. Bring your best story, love.',
  'knocks.day6': '{name} để lại cho bạn một thư thoại.',
  'knocks.day7': 'Tuần đầu tiên của bạn đã xong. Có một điều nhỏ muốn nói với bạn.',
  'knocks.day8': 'How was your week?',
  'knocks.day8_back': 'You’re back? I kept your seat warm.',
} as const satisfies Translation<typeof knocksEn>;
