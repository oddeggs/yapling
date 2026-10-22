import { FREE_WEEKLY_SECONDS, PLUS_MONTHLY_SECONDS } from '@yapling/domain';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Linking } from 'react-native';

import { useTrackOnce } from '../../observability';
import { useLocale, useToast } from '../../ui';
import { LINKS } from './links';
import {
  initialOffers,
  paywallView,
  purchaseMessage,
  restoreMessage,
  type PaywallState,
} from './paywall-model';
import { PaywallScreen } from './paywall-screen';
import type { PlusPlan } from './products';
import { devFallbackAllowed, plusStore } from './setup';

export interface PaywallContainerProps {
  /** The roommate's name from the profile. */
  readonly roommateName: string;
  /** The signed-in learner (the session's user id); null until there is a session. */
  readonly userId: string | null;
  /** Leaves the paywall (back to the burrow). */
  readonly onClose?: () => void;
  /**
   * After the store took a payment or restored one: the app asks the server for the minutes again
   * (the plan there changes once RevenueCat's webhook lands).
   */
  readonly onPlanMayHaveChanged?: () => void;
}

/** The paywall wired to the store: offers, purchase, restore, and the links. */
export function PaywallContainer({
  roommateName,
  userId,
  onClose,
  onPlanMayHaveChanged,
}: PaywallContainerProps) {
  const router = useRouter();
  const toast = useToast();
  const { t } = useLocale();
  const copy = t;
  const store = plusStore();
  useTrackOnce('paywall_viewed', { store_available: store.available });
  const [state, setState] = useState<PaywallState>(() => ({
    offers: initialOffers(store.available, devFallbackAllowed()),
    selected: 'yearly',
    busy: null,
    signedIn: false,
  }));

  // RevenueCat logs in as the learner first, so prices, purchases and restores are theirs.
  useEffect(() => {
    let live = true;
    void (async () => {
      if (userId !== null) await store.identify(userId);
      if (live) setState((s) => ({ ...s, signedIn: userId !== null }));
      if (!store.available) return;
      const offers = await store.offers();
      if (!live) return;
      setState((s) => ({
        ...s,
        offers: offers === null ? { kind: 'unavailable' } : { kind: 'ready', offers },
      }));
    })();
    return () => {
      live = false;
    };
  }, [store, userId]);

  const close = useCallback(() => {
    if (onClose) onClose();
    else if (router.canGoBack()) router.back();
    else router.replace('/');
  }, [onClose, router]);

  const view = paywallView(
    state,
    {
      roommateName,
      freeMinutesPerWeek: Math.round(FREE_WEEKLY_SECONDS / 60),
      plusMinutesPerMonth: Math.round(PLUS_MONTHLY_SECONDS / 60),
    },
    copy,
  );

  const upgrade = async () => {
    setState((s) => ({ ...s, busy: 'purchase' }));
    const outcome = await store.purchase(state.selected);
    setState((s) => ({ ...s, busy: null }));
    const { key, close: done } = purchaseMessage(outcome);
    if (outcome === 'purchased' || outcome === 'pending') onPlanMayHaveChanged?.();
    if (key) toast({ text: copy(key), haptic: outcome === 'purchased' ? 'success' : 'tap' });
    if (done) close();
  };

  const restore = async () => {
    setState((s) => ({ ...s, busy: 'restore' }));
    const outcome = await store.restore();
    setState((s) => ({ ...s, busy: null }));
    const { key, close: done } = restoreMessage(outcome);
    if (outcome === 'restored') onPlanMayHaveChanged?.();
    toast({ text: copy(key) });
    if (done) close();
  };

  return (
    <PaywallScreen
      view={view}
      backLabel={t('common.a11y.back')}
      onSelect={(plan: PlusPlan) => setState((s) => ({ ...s, selected: plan }))}
      onUpgrade={() => void upgrade()}
      onNotNow={close}
      onRestore={() => void restore()}
      onTerms={() => void Linking.openURL(LINKS.terms)}
      onPrivacy={() => void Linking.openURL(LINKS.privacy)}
      onStudents={() => void Linking.openURL(LINKS.support)}
    />
  );
}
