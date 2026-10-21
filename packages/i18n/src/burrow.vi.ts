import type { burrowEn } from './burrow.en';
import type { Translation } from './catalogue-types';

export const burrowVi = {
  'burrow.place': 'Hang của bạn',
  'burrow.peek.episode': 'Mùa {season} · Tập {episode}',
  'burrow.peek.ready': 'Sẵn sàng khi bạn muốn',
  'burrow.peek.whereYouLeftIt': 'Đúng chỗ bạn đã dừng',
  'burrow.newObject': 'Đồ mới trong hang: {object}',
  'burrow.object.seagullFeather': 'lông hải âu',
  'burrow.stage.seed': 'Gói hạt',
  'burrow.stage.sprout': 'Mầm',
  'burrow.stage.leaf': 'Lá',
  'burrow.stage.bloom': 'Hoa',
} as const satisfies Translation<typeof burrowEn>;
