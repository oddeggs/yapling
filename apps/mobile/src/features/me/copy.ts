import type { Language } from '@yapling/i18n';

import { featureCopy } from '../plus/pending-copy';

/*
 * Me sheet copy `@yapling/i18n`'s `me` catalogue doesn't have yet (see `plus/pending-copy.ts`).
 * Moves to `me.en.ts` / `me.vi.ts` as is. `{name}` is the roommate's name.
 */

export const mePendingEn = {
  /** Read for the stage dots: "Stage 1 of 5". */
  'me.a11y.stageOf': 'Stage {n} of {total}',
  /** The progress row before the first call has numbers. */
  'me.progressEmpty': 'Numbers arrive after your first call',
  /** The minutes row on Plus, whose allowance is monthly. */
  'me.liveMinutesMonth': 'Live minutes this month',
  /** The quiet-hours row when there are none. */
  'me.quietOff': 'Off',
  /** The row that opens the "is an AI" explainer. */
  'me.aiExplainer': '{name} and the neighbours are AI',
  'me.deleteData': 'Delete my data',
  'me.delete.title': 'Delete all your data?',
  'me.delete.body':
    'Your account, your recordings, what {name} remembers and your progress are deleted within 24 hours. This can’t be undone.',
  'me.delete.confirm': 'Delete everything',
  'me.delete.cancel': 'Keep my data',
  'me.delete.failed': 'Couldn’t delete just now. Try again in a moment.',
  /** The memory page: what the roommate remembers, editable. */
  'me.memory.body': 'Things {name} picked up from your calls. Change or delete anything.',
  'me.memory.about_you': 'About you',
  'me.memory.coming_up': 'Coming up',
  'me.memory.about_us': 'About us',
  'me.memory.empty': '{name} hasn’t noted anything yet.',
  'me.memory.edit': 'Edit',
  'me.memory.save': 'Save',
  'me.memory.cancel': 'Cancel',
  'me.memory.delete': 'Delete',
  /** Read for the delete button beside a note. */
  'me.memory.a11y.delete': 'Delete “{text}”',
  'me.memory.failed': 'That didn’t save. Try again.',
} as const;

export const mePendingVi = {
  'me.a11y.stageOf': 'Chặng {n}/{total}',
  'me.progressEmpty': 'Số liệu có sau cuộc gọi đầu tiên',
  'me.liveMinutesMonth': 'Phút gọi tháng này',
  'me.quietOff': 'Tắt',
  'me.aiExplainer': '{name} và hàng xóm là AI',
  'me.deleteData': 'Xoá dữ liệu của mình',
  'me.delete.title': 'Xoá toàn bộ dữ liệu?',
  'me.delete.body':
    'Tài khoản, bản ghi âm, những gì {name} nhớ và tiến bộ của bạn sẽ được xoá trong vòng 24 giờ. Không thể hoàn tác.',
  'me.delete.confirm': 'Xoá tất cả',
  'me.delete.cancel': 'Giữ dữ liệu',
  'me.delete.failed': 'Chưa xoá được. Bạn thử lại sau một lúc nhé.',
  'me.memory.body':
    'Những điều {name} nhớ từ các cuộc gọi. Bạn có thể sửa hoặc xoá bất cứ điều gì.',
  'me.memory.about_you': 'Về bạn',
  'me.memory.coming_up': 'Sắp tới',
  'me.memory.about_us': 'Về tụi mình',
  'me.memory.empty': '{name} chưa ghi nhớ điều gì.',
  'me.memory.edit': 'Sửa',
  'me.memory.save': 'Lưu',
  'me.memory.cancel': 'Huỷ',
  'me.memory.delete': 'Xoá',
  'me.memory.a11y.delete': 'Xoá “{text}”',
  'me.memory.failed': 'Chưa lưu được. Bạn thử lại nhé.',
} as const satisfies Record<keyof typeof mePendingEn, string>;

export type MePendingKey = keyof typeof mePendingEn;

export const meCopy = (language: Language) =>
  featureCopy<MePendingKey>(language, { en: mePendingEn, vi: mePendingVi });
export type MeCopy = ReturnType<typeof meCopy>;
