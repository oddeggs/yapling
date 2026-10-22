import type { NotificationRequest } from 'expo-notifications';
import { colours, layout } from '@yapling/theme';
import { MINUTE_MS, WEEK_ONE_PLAN, instantOf, localDateOf, localTimeOf } from '@yapling/domain';
import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { analytics, track, type TimeTravelAction } from '../../observability';
import { ChoiceChip } from '../../ui/chip';
import { GlassSheet } from '../../ui/glass-sheet';
import { useLanguageOverride, useLocale } from '../../ui/locale';
import { StickerButton } from '../../ui/sticker-button';
import { Txt } from '../../ui/text';
import { ToggleRow } from '../../ui/toggle';
import { useKnockInputs } from '../knocks/knocks-provider';
import { hasKnockPermission, requestKnockPermission } from '../knocks/permission';
import { knockHref, knockOfDay } from '../knocks/plan';
import { cancelKnocks, fireTestKnock, scheduledKnocks } from '../knocks/scheduler';
import {
  jumpToDay,
  jumpToInstant,
  now,
  reloadDebugClock,
  resetDebugClock,
  setCameBackAfterAway,
  useDebugClock,
  backToRealTime,
} from './debug-clock';
import { CostPage } from './cost-page';
import { useResetLocalData } from './dev-menu-host';
import { devStorage } from './dev-storage';
import { KnockPreview } from './knock-preview';
import { dayOf, testLearnerOf } from './test-learner';

const DAYS = WEEK_ONE_PLAN.map((d) => d.day);

/** A test-menu action: this install is a test session from now on, and the action is counted. */
const used = (action: TimeTravelAction, day: number | null = null) => {
  analytics().markTestSession();
  track('time_travel_used', { action, day });
};

/*
 * The test menu: the facilitator's panel for learner sessions, in the test builds only. Its labels
 * are for the facilitator and stay in English; the previews follow the app's language.
 */

function Section({ title, children }: { readonly title: string; readonly children: ReactNode }) {
  return (
    <View style={{ gap: 8 }}>
      <Txt variant="noteStrong" colour={colours.textMuted}>
        {title}
      </Txt>
      {children}
    </View>
  );
}

function Row({ children }: { readonly children: ReactNode }) {
  return <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{children}</View>;
}

/** When a scheduled knock rings, on the phone's clock (the scheduler puts it in the payload). */
const ringsAt = (request: NotificationRequest): number | null => {
  const at = (request.content.data as Record<string, unknown> | null)?.['fireAt'];
  return typeof at === 'number' ? at : null;
};

export function DevMenu() {
  const insets = useSafeAreaInsets();
  const { language, t } = useLocale();
  const setLanguage = useLanguageOverride();
  const clock = useDebugClock();
  const resetLocalData = useResetLocalData();
  const learner = testLearnerOf(useKnockInputs(), Date.now());
  const appNow = now();
  const day = dayOf(learner, appNow);
  const [previewDay, setPreviewDay] = useState(() => Math.min(Math.max(day, 2), 8));
  const [permitted, setPermitted] = useState<boolean | null>(null);
  const [scheduled, setScheduled] = useState<readonly NotificationRequest[]>([]);
  const [note, setNote] = useState<string | null>(null);
  const [page, setPage] = useState<'menu' | 'cost'>('menu');
  const opened = useRef(false);
  useEffect(() => {
    if (opened.current) return;
    opened.current = true;
    used('opened');
  }, []);

  const refresh = useCallback(() => {
    hasKnockPermission().then(setPermitted, () => setPermitted(false));
    scheduledKnocks().then(setScheduled, () => setScheduled([]));
  }, []);
  // The provider reschedules when the clock moves; read the schedule once it has.
  useEffect(() => {
    refresh();
    const later = setTimeout(refresh, 600);
    return () => clearTimeout(later);
  }, [refresh, clock, language]);

  const preview = knockOfDay(previewDay, learner, language, clock.cameBackAfterAway);
  const today = knockOfDay(day, learner, language, clock.cameBackAfterAway);

  const jump = (to: number) => {
    used('jump_day', to);
    jumpToDay(to, learner.installedOn, learner.timezone);
    setPreviewDay(Math.max(to, 2));
  };

  const fire = () => {
    if (today === null) return;
    used('knock', day);
    fireTestKnock(today).then(
      () => setNote(`Day ${day}'s knock rings in 5 s. Lock the phone or leave the app.`),
      (e: unknown) => setNote(`Not scheduled: ${String(e)}`),
    );
  };

  const ringSoon = () => {
    if (preview === null) return;
    used('knock', previewDay);
    // The scheduled knock itself rings, a minute from now, as it would on its morning.
    jumpToInstant(instantOf(preview.date, preview.time, learner.timezone) - MINUTE_MS);
    setNote(
      `Day ${previewDay}'s scheduled knock rings in a minute. Lock the phone or leave the app.`,
    );
  };

  const reset = async () => {
    used('reset');
    await cancelKnocks();
    resetDebugClock();
    devStorage.clear();
    reloadDebugClock();
    await resetLocalData?.();
    router.dismissAll();
    router.replace('/');
  };

  const sheet = (children: ReactNode) => (
    <GlassSheet kind="info" top={insets.top + 8} style={{ paddingHorizontal: 0, paddingBottom: 0 }}>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 18,
          paddingBottom: insets.bottom + 24,
          gap: 18,
        }}
      >
        {children}
      </ScrollView>
    </GlassSheet>
  );

  if (page === 'cost') return sheet(<CostPage onBack={() => setPage('menu')} />);

  return sheet(
    <>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Txt variant="sheetTitle">Test menu</Txt>
        <StickerButton label="Close" tone="glass" size="small" onPress={() => router.back()} />
      </View>
      <Txt variant="note" colour={colours.textMuted}>
        {`Day ${day} · ${localDateOf(appNow, learner.timezone)} ${localTimeOf(appNow, learner.timezone)}` +
          (clock.offsetMs === 0 ? ' · real clock' : ' · debug clock') +
          ` · installed ${learner.installedOn}`}
      </Txt>

      <Section title="JUMP TO DAY">
        <Row>
          {DAYS.map((d) => (
            <ChoiceChip key={d} label={`${d}`} selected={d === day} onPress={() => jump(d)} />
          ))}
          <ChoiceChip
            label="Real clock"
            selected={clock.offsetMs === 0}
            onPress={() => {
              used('real_clock');
              backToRealTime();
            }}
          />
        </Row>
      </Section>

      <ToggleRow
        title="Came back after 3 days"
        subtitle="The welcome back, and day 8's knock"
        on={clock.cameBackAfterAway}
        onChange={(on) => {
          used('came_back_after_away');
          setCameBackAfterAway(on);
        }}
      />

      <Section title="LANGUAGE">
        <Row>
          <ChoiceChip
            label="Tiếng Việt"
            selected={language === 'vi'}
            onPress={() => setLanguage('vi')}
          />
          <ChoiceChip
            label="English"
            selected={language === 'en'}
            onPress={() => setLanguage('en')}
          />
        </Row>
      </Section>

      <Section title="KNOCKS">
        <Row>
          {DAYS.filter((d) => d > 1).map((d) => (
            <ChoiceChip
              key={d}
              label={`Day ${d}`}
              selected={d === previewDay}
              onPress={() => setPreviewDay(d)}
            />
          ))}
        </Row>
        {preview === null ? null : (
          <KnockPreview
            day={previewDay}
            date={preview.date}
            time={preview.time}
            title={preview.title}
            body={preview.body}
            language={language}
            t={t}
            onPress={() => {
              // As on the lock screens between days: tapping the knock opens the app on its day.
              used('jump_day', previewDay);
              jumpToDay(previewDay, learner.installedOn, learner.timezone);
              router.dismissAll();
              router.navigate(knockHref(previewDay));
            }}
          />
        )}
        <StickerButton
          label={`Day ${previewDay}, a minute before its knock`}
          tone="primary"
          onPress={ringSoon}
        />
        <StickerButton
          label={today === null ? 'No knock on day 1' : `Fire day ${day}'s knock in 5 s`}
          tone="secondary"
          disabled={today === null}
          onPress={fire}
        />
        {permitted === false ? (
          <StickerButton
            label="Ask for notifications"
            tone="glass"
            onPress={() => {
              requestKnockPermission().then(
                (granted) => {
                  setPermitted(granted);
                  setTimeout(refresh, 600);
                },
                () => setPermitted(false),
              );
            }}
          />
        ) : null}
        {note === null ? null : (
          <Txt variant="note" colour={colours.textMuted}>
            {note}
          </Txt>
        )}
        <Txt variant="note" colour={colours.textMuted}>
          {permitted === null
            ? 'Checking the permission…'
            : `${permitted ? 'Notifications allowed' : 'Notifications not allowed'} · ${scheduled.length} knock${scheduled.length === 1 ? '' : 's'} scheduled`}
        </Txt>
        {scheduled.map((request) => {
          const at = ringsAt(request);
          return (
            <Txt key={request.identifier} variant="note" colour={colours.textBody}>
              {`${request.identifier} · ${
                at === null
                  ? '?'
                  : `${localDateOf(at + clock.offsetMs, learner.timezone)} ${localTimeOf(at + clock.offsetMs, learner.timezone)}`
              } · ${request.content.title ?? ''}: ${request.content.body ?? ''}`}
            </Txt>
          );
        })}
      </Section>

      <Section title="COSTS">
        <StickerButton
          label={t('devmenu.cost.open')}
          tone="secondary"
          onPress={() => {
            used('cost_page');
            setPage('cost');
          }}
        />
      </Section>

      <Section title="RESET">
        <Txt variant="note" colour={colours.textMuted}>
          {resetLocalData === null
            ? 'Clears the test menu, the debug clock and the knocks.'
            : 'Clears everything on this phone: the learner, the debug clock and the knocks.'}
        </Txt>
        <StickerButton label="Reset" tone="dark" onPress={() => void reset()} />
      </Section>
      <View style={{ height: layout.marginScreen }} />
    </>,
  );
}
