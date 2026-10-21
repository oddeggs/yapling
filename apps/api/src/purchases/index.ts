import { registerDeletionStep } from '../account';
import { deleteStatements } from './entitlements';

export { purchaseRoutes } from './routes';
export { planOf, readEntitlement, type PlusEntitlement } from './entitlements';
export { PLUS_ENTITLEMENT, PLUS_PRODUCTS, type PlusProduct } from './products';

let registered = false;

/** Adds the Plus mirror to account deletion, once per isolate. Runs when this module loads. */
export function registerPurchases(): void {
  if (registered) return;
  registered = true;
  registerDeletionStep('purchases', deleteStatements);
}

registerPurchases();
