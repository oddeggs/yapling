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
  'devmenu.settling.heading': 'LÀM QUEN',
  'devmenu.settling.status.none': 'Chưa có người học: phần mở đầu chưa tạo người học.',
  'devmenu.settling.status.notVisitor': 'Không phải Khách mới đến: truyện tính từ ngày cài.',
  'devmenu.settling.status.settling':
    'Đang làm quen · xong {done}/6 chương · tiếp theo chương {next}',
  'devmenu.settling.status.letter': 'Đã làm quen xong · lá thư đến ngày {date} (tuần 1, ngày 1)',
  'devmenu.settling.startVisitor': 'Bắt đầu là Khách mới đến',
  'devmenu.settling.startVisitorHint':
    'Xoá người học trên máy này, tạo người học mới ở chặng Khách mới đến và mở hang với chương 1',
  'devmenu.settling.jumpHeading': 'CHUYỂN TỚI CHƯƠNG',
  'devmenu.settling.a11y.jumpChapter': 'Chuyển tới chương {chapter}',
  'devmenu.settling.jumpHint':
    'Các chương trước coi như đã xong, mỗi ngày một chương; đồng hồ chuyển tới ngày của chương',
  'devmenu.settling.letterDay': 'Chuyển tới ngày lá thư',
  'devmenu.settling.letterDayHint':
    'Xong cả sáu chương, đồng hồ chuyển tới ngày lá thư đến, tức ngày 1 của tuần 1',
  'devmenu.settling.needsVisitor':
    'Hãy bắt đầu là Khách mới đến trước: các nút chuyển chỉ dùng cho Khách mới đến.',
  'devmenu.settling.working': 'Đang làm…',
  'devmenu.settling.failed': 'Không được: {reason}',
  'devmenu.settling.done.visitor': 'Đã có Khách mới đến. Chương 1 là chương tiếp theo, ngày 1.',
  'devmenu.settling.done.chapter': 'Chương {chapter} là chương tiếp theo, ngày {chapter}.',
  'devmenu.settling.done.letter': 'Lá thư đến hôm nay, ngày làm quen thứ 6.',
  'devmenu.settling.knocksHeading': 'THÔNG BÁO KHI LÀM QUEN',
  'devmenu.settling.knockChip': 'Chương {chapter}',
  'devmenu.settling.a11y.knockChip': 'Xem trước thông báo của chương {chapter}',
  'devmenu.settling.previewHint': 'Mở cuộc gọi của chương {chapter}, như khi chạm vào thông báo',
  'devmenu.settling.ringSoon': 'Chương {chapter}, một phút trước thông báo',
  'devmenu.settling.ringSoonHint':
    'Chuyển tới chương {chapter} và đưa đồng hồ tới một phút trước thông báo buổi sáng',
  'devmenu.settling.ringNote':
    'Thông báo đã hẹn của chương {chapter} sẽ reo sau một phút. Khoá máy hoặc thoát ứng dụng.',
  'devmenu.settling.fire': 'Gửi thông báo chương {chapter} sau 5 giây',
  'devmenu.settling.fireNote':
    'Thông báo chương {chapter} sẽ reo sau 5 giây. Khoá máy hoặc thoát ứng dụng.',
  'devmenu.settling.tag': 'Chương {chapter}',
  'devmenu.settling.day': 'Ngày làm quen {day}',
  'devmenu.settling.noWeekKnock': 'Chưa có thông báo tuần 1 khi đang làm quen',
} as const satisfies Translation<typeof devmenuEn>;
