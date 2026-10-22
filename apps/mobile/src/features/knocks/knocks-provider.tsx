import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { AppState } from 'react-native';

import { now, useDebugClock } from '../devmenu/debug-clock';
import { useLocale } from '../../ui/locale';
import type { KnockInputs } from './inputs';
import { onKnockPermissionChange } from './permission';
import {
  NOT_AWAY,
  knockDataOf,
  knockTarget,
  planKnockRequests,
  returnStateOf,
  type ReturnState,
} from './plan';
import { syncKnocks } from './scheduler';

interface Knocks {
  readonly inputs: KnockInputs | null;
  readonly returnState: ReturnState;
}

const KnocksContext = createContext<Knocks>({ inputs: null, returnState: NOT_AWAY });

/**
 * A knock that lands while the app is open shows nowhere but the notification list: the learner
 * is already here. Test knocks from the test menu, and anything that is not a knock, show.
 */
const handleInApp = (): void =>
  Notifications.setNotificationHandler({
    handleNotification: (notification) => {
      const knock = knockDataOf(notification.request.content.data);
      const show = knock === null || knock.test === true;
      return Promise.resolve({
        shouldShowBanner: show,
        shouldShowList: true,
        shouldPlaySound: show,
        shouldSetBadge: false,
      });
    },
  });

/**
 * Opens the place a tapped knock points at, whether it woke the app or found it running: the
 * burrow on its day, or a Settling-in chapter's call while that chapter is still the next one.
 */
function useKnockTaps(inputs: KnockInputs | null) {
  const latest = useRef(inputs);
  latest.current = inputs;
  useEffect(() => {
    const open = (response: Notifications.NotificationResponse | null) => {
      if (response === null) return;
      const knock = knockDataOf(response.notification.request.content.data);
      if (knock === null) return;
      Notifications.clearLastNotificationResponse();
      router.navigate(knockTarget(knock, latest.current));
    };
    open(Notifications.getLastNotificationResponse());
    const subscription = Notifications.addNotificationResponseReceivedListener(open);
    return () => subscription.remove();
  }, []);
}

/** A counter that moves each time the app comes to the foreground (an open). */
function useOpens(): number {
  const [opens, setOpens] = useState(0);
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') setOpens((n) => n + 1);
    });
    return () => subscription.remove();
  }, []);
  return opens;
}

/** A counter that moves when the notification permission may have changed. */
function usePermissionAsks(): number {
  const [asks, setAsks] = useState(0);
  useEffect(() => onKnockPermissionChange(() => setAsks((n) => n + 1)), []);
  return asks;
}

/**
 * The knocks: on every open (and whenever the learner's answers, the language or the debug clock
 * change) the knocks (Settling in's next one, or the weeks' from the story's start) are planned
 * and the phone's schedule is replaced with them; a tapped knock opens its place; the welcome for
 * this open is worked out for the burrow. Sits inside the router and the locale; `inputs` is null
 * until there is a profile.
 */
export function KnocksProvider({
  inputs,
  children,
}: {
  readonly inputs: KnockInputs | null;
  readonly children: ReactNode;
}) {
  const { language } = useLocale();
  const clock = useDebugClock();
  const opens = useOpens();
  const asks = usePermissionAsks();
  useEffect(handleInApp, []);
  useKnockTaps(inputs);

  // Keyed by value: a new inputs object with the same answers does not reschedule.
  const key = inputs === null ? null : JSON.stringify(inputs);
  useEffect(() => {
    if (inputs === null) return;
    const knocks = planKnockRequests(inputs, language, { now: now(), ...clock });
    syncKnocks(knocks).catch((error: unknown) => {
      if (__DEV__) console.warn('Knocks were not scheduled', error);
    });
    // `key` stands for `inputs`; `opens` and `asks` are the triggers.
  }, [key, language, clock, opens, asks]);

  const returnState = useMemo(
    () =>
      inputs === null
        ? NOT_AWAY
        : returnStateOf({
            lastOpenedAt: inputs.lastOpenedAt,
            now: now(),
            timezone: inputs.timezone,
            completedEpisodes: inputs.completedEpisodes,
            cameBackAfterAway: clock.cameBackAfterAway,
            awayDays: clock.awayDays,
          }),
    [key, clock, opens],
  );

  const value = useMemo(() => ({ inputs, returnState }), [inputs, returnState]);
  return <KnocksContext.Provider value={value}>{children}</KnocksContext.Provider>;
}

/**
 * How the burrow greets this open: `away` after three or more days without opening (Pip is glad,
 * tells `recapKey`, nothing is lost), with the days away. Never a reason for guilt.
 */
export function useReturnState(): ReturnState {
  return useContext(KnocksContext).returnState;
}

/** The learner's inputs the knocks run on, for the test menu; null before there is a profile. */
export function useKnockInputs(): KnockInputs | null {
  return useContext(KnocksContext).inputs;
}
