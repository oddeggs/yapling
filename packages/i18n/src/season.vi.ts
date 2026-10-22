import type { Translation } from './catalogue-types';
import type { seasonEn } from './season.en';

export const seasonVi = {
  'season.top': 'MÙA {season} · TẬP {episode}/{episodes}',
  'season.comingSoon': 'Mùa {season} · sắp ra mắt →',
  'season.next': 'TẬP {episode} · {place}',
  'season.place.burrow': 'HANG CỦA BẠN',
  'season.place.lanternCafe': 'QUÁN LANTERN',
  'season.place.hollowbrookOffice': 'VĂN PHÒNG HOLLOWBROOK',
  'season.place.lanternInn': 'NHÀ TRỌ LANTERN',
  'season.place.bus45': 'XE BUÝT 45',
  'season.place.townSquare': 'QUẢNG TRƯỜNG',
  'season.nextWhen': '{title} · {day}',
  'season.pin.burrow': 'Burrow',
  'season.pin.lanternCafe': 'Café',
  'season.pin.hollowbrookOffice': 'Office',
  'season.pin.lanternInn': 'Inn',
  'season.pin.bus45': 'Bus 45',
  'season.pin.townSquare': 'Square',
  'season.a11y.pin': 'Tập {episode}, {title}: {state}',
  'season.a11y.done': 'đã xong',
  'season.a11y.current': 'tập tiếp theo',
  'season.a11y.upcoming': 'sắp tới',
} as const satisfies Translation<typeof seasonEn>;
