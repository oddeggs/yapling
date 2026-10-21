/*
 * What Yapling sells: one auto-renewing subscription group, Yapling Plus, monthly and yearly. Both
 * attach RevenueCat's `plus` entitlement. The ids match the server's (`apps/api/src/purchases`).
 * Plus sells live minutes and depth only, never care.
 */

/** The app's two builds (`extra.appVariant`): Yapling Dev and Yapling. */
export type AppVariant = 'dev' | 'prd';

/** RevenueCat's entitlement for Plus. */
export const PLUS_ENTITLEMENT = 'plus';

export type PlusPlan = 'yearly' | 'monthly';

/** The plans in the order the paywall shows them. */
export const PLUS_PLANS: readonly PlusPlan[] = ['yearly', 'monthly'];

export const PLUS_PRODUCTS = {
  yearly: 'yapling_plus_yearly',
  monthly: 'yapling_plus_monthly',
} as const satisfies Record<PlusPlan, string>;

/**
 * What the dev app's store ids add to a product id. Apple's product ids are unique per developer
 * account, so Yapling Dev sells each product under its own id (`yapling_plus_monthly.dev`); the
 * server reads it back as the logical id, in its dev environment only.
 */
export const DEV_STORE_SUFFIX = '.dev';

/** The id the variant's store sells a plan under. */
export function storeProductId(plan: PlusPlan, variant: AppVariant): string {
  const id = PLUS_PRODUCTS[plan];
  return variant === 'dev' ? `${id}${DEV_STORE_SUFFIX}` : id;
}

/** The plan a store product id stands for, in either variant; null for anything else. */
export function planOfStoreId(storeId: string): PlusPlan | null {
  const id = storeId.endsWith(DEV_STORE_SUFFIX)
    ? storeId.slice(0, -DEV_STORE_SUFFIX.length)
    : storeId;
  for (const plan of PLUS_PLANS) if (PLUS_PRODUCTS[plan] === id) return plan;
  return null;
}
