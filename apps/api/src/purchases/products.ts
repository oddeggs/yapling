import type { EnvironmentName } from '../env';

/*
 * What Yapling sells: one auto-renewing subscription group, Yapling Plus, monthly and yearly (the
 * yearly with an introductory first-year price). Both products attach RevenueCat's `plus`
 * entitlement. Plus sells live minutes and depth only, never care.
 *
 * Apple's product ids are unique per developer account, so the dev app (Yapling Dev) sells each
 * product under its own id: the product id with `.dev` after it. Past this boundary every product
 * is its logical id. Only the dev environment accepts a dev id: production refuses it, so a
 * purchase in the dev app never grants Plus there.
 */

/** RevenueCat's entitlement id for Plus. */
export const PLUS_ENTITLEMENT = 'plus';

export const PLUS_PRODUCTS = ['yapling_plus_monthly', 'yapling_plus_yearly'] as const;
export type PlusProduct = (typeof PLUS_PRODUCTS)[number];

/** What the dev app's store ids add to a product id. */
export const DEV_STORE_SUFFIX = '.dev';

/**
 * The product a store id stands for in this environment, or null when the environment refuses it
 * (a dev id in production). Ids without the suffix pass unchanged.
 */
export function logicalProduct(storeId: string, environment: EnvironmentName): string | null {
  if (!storeId.endsWith(DEV_STORE_SUFFIX)) return storeId;
  if (environment !== 'dev') return null;
  const product = storeId.slice(0, -DEV_STORE_SUFFIX.length);
  return product === '' ? null : product;
}

export function isPlusProduct(product: string | null): product is PlusProduct {
  return product !== null && (PLUS_PRODUCTS as readonly string[]).includes(product);
}

/**
 * Whether an event is about Plus: its product is a Plus product, or (a product we don't know, or
 * none) it names the `plus` entitlement.
 */
export function isAboutPlus(
  product: string | null,
  entitlements: readonly string[] | null | undefined,
): boolean {
  return isPlusProduct(product) || (entitlements ?? []).includes(PLUS_ENTITLEMENT);
}
