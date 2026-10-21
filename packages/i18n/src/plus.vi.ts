import type { Translation } from './catalogue-types';
import type { plusEn } from './plus.en';

export const plusVi = {
  'plus.kicker': 'TUẦN ĐẦU TIÊN LÀ QUÀ CỦA TỤI MÌNH',
  'plus.title': 'Yapling Plus',
  'plus.body':
    'Từ hôm nay, bản Miễn phí có khoảng {minutes} phút gọi mỗi tuần, cùng mọi câu chuyện, bưu thiếp và thư thoại.',
  'plus.table.free': 'Miễn phí',
  'plus.table.plus': 'Plus',
  'plus.table.liveMinutes': 'Phút gọi trực tiếp',
  'plus.table.freeMinutes': '~{minutes}/tuần',
  'plus.table.plusMinutes': '~{minutes}/tháng*',
  'plus.table.stories': 'Truyện, bưu thiếp, thư thoại',
  'plus.table.homework': 'Mang bài tập của bạn',
  'plus.table.feedback': 'Phản hồi sâu & luyện phát âm',
  'plus.table.camera': 'Gọi có camera',
  'plus.plan.firstYear': 'Năm đầu',
  'plus.plan.thenYearly': 'sau đó {price}/năm',
  'plus.plan.intro': 'Ưu đãi',
  'plus.plan.monthly': 'Hằng tháng',
  'plus.plan.cancelAnyTime': 'Huỷ bất cứ lúc nào',
  'plus.students': 'Sinh viên: giá ưu đãi với email trường học.',
  'plus.studentsLink': 'Liên hệ hỗ trợ',
  'plus.fairUse': '*Sử dụng hợp lý.',
  'plus.stayEitherWay': '{name}, hang và câu chuyện vẫn ở đây dù bạn chọn gì.',
  'plus.cta': 'Nâng cấp lên Plus',
  'plus.ctaTrial': { other: 'Dùng thử miễn phí {count} ngày' },
  'plus.notNow': 'Không phải bây giờ',
  'plus.restore': 'Khôi phục giao dịch',
  'plus.terms': 'Điều khoản',
  'plus.privacy': 'Quyền riêng tư',
  'plus.autoRenew':
    'Gói tự động gia hạn trừ khi bạn huỷ ít nhất 24 giờ trước khi kỳ hiện tại kết thúc. Quản lý hoặc huỷ trong cài đặt Apple ID.',
} as const satisfies Translation<typeof plusEn>;
