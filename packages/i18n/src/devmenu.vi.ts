import type { Translation } from './catalogue-types';
import type { devmenuEn } from './devmenu.en';

export const devmenuVi = {
  'devmenu.cost.open': 'Chi phí cuộc gọi',
  'devmenu.cost.title': 'Chi phí cuộc gọi',
  'devmenu.cost.back': 'Quay lại',
  'devmenu.cost.refresh': 'Tải lại',
  'devmenu.cost.loading': 'Đang tải các cuộc gọi gần đây…',
  'devmenu.cost.failed': 'Không tải được chi phí ({reason}).',
  'devmenu.cost.empty': 'Người học này chưa có cuộc gọi trực tiếp nào.',
  'devmenu.cost.server': 'Từ {server}',
  'devmenu.cost.totalsHeading': { other: '{count} CUỘC GỌI GẦN ĐÂY' },
  'devmenu.cost.total': '${usd} trong {minutes} phút · ${perMinute} mỗi phút',
  'devmenu.cost.talk': 'Người học đã nói {minutes} phút',
  'devmenu.cost.latency': 'Trả lời P50 {p50} ms · P90 {p90} ms qua {turns} lượt',
  'devmenu.cost.phone': 'Trên điện thoại P50 {p50} ms · P90 {p90} ms',
  'devmenu.cost.callsHeading': 'CUỘC GỌI',
  'devmenu.cost.call': '{when} · {kind} · {duration} · {reason}',
  'devmenu.cost.callCost':
    '${usd}: nhận giọng ${stt} · giọng nói ${tts} · mô hình ${llm} · tóm tắt ${summary}',
  'devmenu.cost.callLatency':
    'P50 {p50} ms · P90 {p90} ms · {turns} lượt · người học {learner} giây',
  'devmenu.cost.none': '–',
} as const satisfies Translation<typeof devmenuEn>;
