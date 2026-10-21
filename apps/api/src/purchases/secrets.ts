import type { Bindings } from '../env';

/**
 * RevenueCat's webhook secret: the whole `Authorization` header RevenueCat sends, set in its
 * dashboard and as the Worker secret `REVENUECAT_WEBHOOK_AUTH`; undefined until it is set (an
 * empty value counts as unset).
 */
export function webhookAuthOf(env: Bindings): string | undefined {
  const value = env.REVENUECAT_WEBHOOK_AUTH;
  return value === undefined || value === '' ? undefined : value;
}

/** Compares two secrets in time that doesn't depend on where they differ. */
export function sameText(a: string, b: string): boolean {
  const x = new TextEncoder().encode(a);
  const y = new TextEncoder().encode(b);
  let diff = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
  return diff === 0;
}
