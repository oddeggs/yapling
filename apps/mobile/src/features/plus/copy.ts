import { featureCopy } from './pending-copy';
import type { Language } from '@yapling/i18n';

/*
 * Paywall copy `@yapling/i18n`'s `plus` catalogue doesn't have yet (see `pending-copy.ts`). Moves to
 * `plus.en.ts` / `plus.vi.ts` as is.
 */

export const plusPendingEn = {
  /** The yearly card when App Store Connect offers no paid first-year price. */
  'plus.plan.yearly': 'Yearly',
  /** Over the plan cards in a development build with no RevenueCat key: the design's prices. */
  'plus.devOnly': 'Dev only: sample prices, no App Store. Purchases are off.',
  /** The store couldn't load the products (offline, or the products aren't set up). */
  'plus.storeUnavailable': 'The App Store isn’t answering right now. Try again in a little while.',
  /** A price that hasn't loaded yet. */
  'plus.priceLoading': '…',
  /** After a purchase the server will confirm. Nothing about care, only minutes and depth. */
  'plus.welcome': 'Plus is on. More live minutes start now.',
  /** Ask to Buy, or a payment that clears later. */
  'plus.pending': 'Waiting for the App Store to confirm your payment.',
  'plus.failed': 'That didn’t go through. You haven’t been charged.',
  'plus.restored': 'Plus is back on this phone.',
  'plus.nothingToRestore': 'No Plus purchase to restore on this Apple ID.',
  'plus.unavailable': 'Purchases aren’t available in this build.',
  /** Read for the plan cards. */
  'plus.a11y.plan': '{plan}, {price}. {detail}',
} as const;

export const plusPendingVi = {
  'plus.plan.yearly': 'Hằng năm',
  'plus.devOnly': 'Chỉ bản dev: giá mẫu, không có App Store. Đã tắt mua.',
  'plus.storeUnavailable': 'App Store chưa phản hồi. Bạn thử lại sau một lúc nhé.',
  'plus.priceLoading': '…',
  'plus.welcome': 'Đã bật Plus. Thêm phút gọi bắt đầu từ bây giờ.',
  'plus.pending': 'Đang chờ App Store xác nhận thanh toán.',
  'plus.failed': 'Giao dịch chưa thành công. Bạn chưa bị trừ tiền.',
  'plus.restored': 'Plus đã được khôi phục trên điện thoại này.',
  'plus.nothingToRestore': 'Không có giao dịch Plus nào để khôi phục với Apple ID này.',
  'plus.unavailable': 'Bản này không hỗ trợ mua hàng.',
  'plus.a11y.plan': '{plan}, {price}. {detail}',
} as const satisfies Record<keyof typeof plusPendingEn, string>;

export type PlusPendingKey = keyof typeof plusPendingEn;

export const plusCopy = (language: Language) =>
  featureCopy<PlusPendingKey>(language, { en: plusPendingEn, vi: plusPendingVi });
export type PlusCopy = ReturnType<typeof plusCopy>;
