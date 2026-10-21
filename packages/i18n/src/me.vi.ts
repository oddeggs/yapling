import type { Translation } from './catalogue-types';
import type { meEn } from './me.en';

export const meVi = {
  'me.stage.newcomer': 'Người mới',
  'me.stage.neighbour': 'Hàng xóm',
  'me.stage.regular': 'Khách quen',
  'me.stage.local': 'Người địa phương',
  'me.stage.voiceOfNatterwick': 'Tiếng nói Natterwick',
  'me.canDoTitle': 'Những điều bạn đã làm được',
  'me.group.life': 'CUỘC SỐNG',
  'me.group.work': 'CÔNG VIỆC',
  'me.fixesTitle': 'Lỗi bạn đã làm chủ',
  'me.progress': 'Tiến bộ của bạn',
  'me.timeCapsule': 'Hộp thời gian',
  'me.progressStats': 'Trôi chảy {flow} giây · {pace} từ/phút · ngắt {pauses} lần/phút',
  'me.liveMinutes': 'Phút gọi tuần này',
  'me.minutesLeft': 'còn {left}/{total}',
  'me.moreWithPlus': 'Thêm phút với Plus',
  'me.memory': '{name} nhớ gì về bạn',
  'me.memoryNotes': { other: '{count} ghi chú' },
  'me.notifications': 'Thông báo và giờ yên tĩnh',
  'me.help': 'Trợ giúp và an toàn',
} as const satisfies Translation<typeof meEn>;
