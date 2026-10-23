import type { Translation } from './catalogue-types';
import type { weekEn } from './week.en';

export const weekVi = {
  'week.title': 'Tuần này',
  'week.ring': '{done}/{total}',
  'week.ringToast': 'Vòng tuần: {done}/{total}',
  'week.slot.episode': 'Tập truyện',
  'week.slot.realWeek': 'Tuần thật',
  'week.slot.practice': 'Luyện tập',
  'week.slot.teach': 'Dạy {name} giới thiệu bản thân',
  'week.slot.episodeTitle': 'S{season} · E{episode} · {title}',
  'week.slot.passItOn': 'Pass it on · Bus 45',
  'week.slot.today': 'Hôm nay',
  'week.slot.a11y.done': 'Đã xong',
  'week.slot.a11y.open': 'Sẵn sàng',
  'week.slot.a11y.upcoming': 'Sắp tới',
  'week.phrasesTitle': 'CỤM TỪ TUẦN NÀY',
  'week.next': 'Cuộc gọi tiếp theo mở vào {when}: {title}',
  'week.seedNote': 'Gói hạt: bạn mới nghe thấy. Nói ra để chúng nảy mầm.',
  'week.cta': 'Đến quán cà phê với {name}',
  'week.waiting.tag': 'Tuần {week} · đang đợi bạn',
  'week.waiting.when': 'Sẵn sàng',
  'week.waiting.a11y': 'Đang đợi bạn từ tuần {week}: {title}. Chạm để bắt đầu.',
  'week.slot.again': 'Chơi lại',
  'week.slot.a11y.again': 'Đã xong. Chạm để chơi lại',
  'week.slot.replay': 'Chơi lại',
} as const satisfies Translation<typeof weekEn>;
