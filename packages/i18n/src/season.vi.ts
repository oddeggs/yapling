import type { Translation } from './catalogue-types';
import type { seasonEn } from './season.en';

export const seasonVi = {
  'season.top': 'MÙA {season} · TẬP {episode}/{episodes}',
  'season.comingSoon': 'Mùa {season} · sắp ra mắt →',
  'season.next': 'TẬP {episode} · {place}',
  'season.place.hollowbrookOffice': 'VĂN PHÒNG HOLLOWBROOK',
  'season.nextWhen': '{title} · {day}',
} as const satisfies Translation<typeof seasonEn>;
