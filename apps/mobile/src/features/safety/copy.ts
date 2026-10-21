import type { Language } from '@yapling/i18n';

import { featureCopy } from '../plus/pending-copy';

/*
 * Safety copy `@yapling/i18n`'s `safety` catalogue doesn't have yet (see `plus/pending-copy.ts`).
 * Moves to `safety.en.ts` / `safety.vi.ts` as is.
 */

export const safetyPendingEn = {
  /** The emergency row where no number is listed for the learner's country yet. */
  'safety.emergencyLocal': 'If you are in danger now, call your local emergency number.',
  /** The call button's label: the number itself, ready to dial. */
  'safety.call': 'Call {number}',
} as const;

export const safetyPendingVi = {
  'safety.emergencyLocal': 'Nếu bạn đang gặp nguy hiểm, hãy gọi số khẩn cấp ở nơi bạn sống.',
  'safety.call': 'Gọi {number}',
} as const satisfies Record<keyof typeof safetyPendingEn, string>;

export type SafetyPendingKey = keyof typeof safetyPendingEn;

export const safetyCopy = (language: Language) =>
  featureCopy<SafetyPendingKey>(language, { en: safetyPendingEn, vi: safetyPendingVi });
export type SafetyCopy = ReturnType<typeof safetyCopy>;
