import { MINUTE_MS, instantOf, type LaterWeekKnockKind } from '@yapling/domain';
import { colours } from '@yapling/theme';
import { router } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { View } from 'react-native';

import { useWeek } from '../../data';
import type { TimeTravelAction } from '../../observability';
import { ChoiceChip } from '../../ui/chip';
import { useLocale } from '../../ui/locale';
import { StickerButton } from '../../ui/sticker-button';
import { Txt } from '../../ui/text';
import { weekKnockDays } from '../knocks/later-weeks';
import { weekKnockOf } from '../knocks/plan';
import { fireTestKnock } from '../knocks/scheduler';
import { SEASON_WEEKS } from '../../data/season';
import { jumpToInstant } from './debug-clock';
import { KnockPreview } from './knock-preview';
import { fillRing, jumpToWeek, type WeekLearner } from './week-jumps';
import { JUMP_DAYS, JUMP_WEEKS, storyDayOf } from './week-tools';
import type { TestLearner } from './test-learner';

function Heading({ children }: { readonly children: string }) {
  return (
    <Txt variant="noteStrong" colour={colours.textMuted}>
      {children}
    </Txt>
  );
}

function Row({ children }: { readonly children: ReactNode }) {
  return <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{children}</View>;
}

const clampWeek = (week: number): number =>
  Math.min(JUMP_WEEKS.at(-1) ?? 2, Math.max(JUMP_WEEKS[0] ?? 2, week));

/**
 * The test menu's later weeks: where the story is, a jump to any day of weeks 2 on with the weeks
 * before it played, a week's ring filled, and that week's knocks to preview, ring or fire.
 */
export function WeeksSection({
  learner,
  onUsed,
}: {
  readonly learner: TestLearner;
  /** Counts the action and marks the install a test session. */
  readonly onUsed: (action: TimeTravelAction, day?: number | null) => void;
}) {
  const { language, t } = useLocale();
  const current = useWeek();
  const [week, setWeek] = useState(() => clampWeek(current?.week ?? 2));
  const [day, setDay] = useState(() => current?.dayOfWeek ?? 1);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const days = weekKnockDays(SEASON_WEEKS, week);
  const [kind, setKind] = useState<LaterWeekKnockKind | null>(null);
  const shown = days.find((d) => d.kind === kind) ?? days[0] ?? null;

  const storyDayOne = learner.storyDayOne;
  const ready = learner.known && storyDayOne !== null;
  const who: WeekLearner | null =
    storyDayOne === null ? null : { storyDayOne, timezone: learner.timezone };
  const preview =
    shown === null || storyDayOne === null
      ? null
      : weekKnockOf(
          week,
          shown.kind,
          { ...learner, storyDayOne, atVisitor: learner.atVisitor === true },
          language,
        );

  const status = !learner.known
    ? t('devmenu.weeks.needsLearner')
    : storyDayOne === null
      ? t('devmenu.weeks.needsStory')
      : current === null
        ? t('devmenu.weeks.working')
        : t('devmenu.weeks.status', {
            week: current.week,
            day: current.dayOfWeek,
            done: current.ring.slots.filter((s) => s.status === 'done').length,
          });

  /** Runs a tool with a note while it works and after. */
  const run = (task: (learner: WeekLearner) => Promise<string>) => {
    if (who === null || !ready || busy) {
      setNote(learner.known ? t('devmenu.weeks.needsStory') : t('devmenu.weeks.needsLearner'));
      return;
    }
    setBusy(true);
    setNote(t('devmenu.weeks.working'));
    task(who)
      .then(
        (done) => setNote(done),
        (e: unknown) => setNote(t('devmenu.weeks.failed', { reason: String(e) })),
      )
      .finally(() => setBusy(false));
  };

  const jump = () =>
    run(async (l) => {
      onUsed('jump_day', storyDayOf(week, day));
      await jumpToWeek(week, day, l);
      return t('devmenu.weeks.done.jump', { week, day });
    });

  const fill = () =>
    run(async (l) => {
      // Counted with the jumps: the menu's actions have no kind of their own for a ring.
      onUsed('jump_day', null);
      await fillRing(week, l);
      return t('devmenu.weeks.done.fill', { week });
    });

  // As a tapped knock would: that day, then the place the knock opens.
  const openKnock = () => {
    if (preview === null) return;
    run(async (l) => {
      onUsed('knock', storyDayOf(week, preview.dayOfWeek));
      await jumpToWeek(week, preview.dayOfWeek, l);
      router.dismissAll();
      router.navigate(preview.data.url);
      return t('devmenu.weeks.done.jump', { week, day: preview.dayOfWeek });
    });
  };

  // A minute before the scheduled knock of that day, the weeks before it played.
  const ringSoon = () => {
    if (preview === null) return;
    run(async (l) => {
      onUsed('knock', storyDayOf(week, preview.dayOfWeek));
      await jumpToWeek(week, preview.dayOfWeek, l);
      jumpToInstant(instantOf(preview.date, preview.time, l.timezone) - MINUTE_MS);
      return t('devmenu.weeks.ringNote', { week });
    });
  };

  const fire = () => {
    if (preview === null) return;
    onUsed('knock', storyDayOf(week, preview.dayOfWeek));
    fireTestKnock(preview).then(
      () => setNote(t('devmenu.weeks.fireNote')),
      (e: unknown) => setNote(t('devmenu.weeks.failed', { reason: String(e) })),
    );
  };

  return (
    <View style={{ gap: 8 }}>
      <Heading>{t('devmenu.weeks.heading')}</Heading>
      <Txt variant="note" colour={colours.textBody}>
        {status}
      </Txt>
      <Row>
        {JUMP_WEEKS.map((w) => (
          <ChoiceChip
            key={w}
            label={t('devmenu.weeks.weekChip', { week: w })}
            selected={w === week}
            accessibilityLabel={t('devmenu.weeks.a11y.weekChip', { week: w })}
            onPress={() => {
              setWeek(w);
              setKind(null);
            }}
          />
        ))}
      </Row>
      <Row>
        {JUMP_DAYS.map((d) => (
          <ChoiceChip
            key={d}
            label={t('devmenu.weeks.dayChip', { day: d })}
            selected={d === day}
            accessibilityLabel={t('devmenu.weeks.a11y.dayChip', { day: d })}
            onPress={() => setDay(d)}
          />
        ))}
      </Row>
      <StickerButton
        label={t('devmenu.weeks.jump', { week, day })}
        tone="primary"
        disabled={busy || !ready}
        accessibilityHint={t('devmenu.weeks.jumpHint')}
        onPress={jump}
      />
      <StickerButton
        label={t('devmenu.weeks.fill', { week })}
        tone="secondary"
        disabled={busy || !ready}
        accessibilityHint={t('devmenu.weeks.fillHint')}
        onPress={fill}
      />

      <Heading>{t('devmenu.weeks.knocksHeading', { week })}</Heading>
      {days.length === 0 ? (
        <Txt variant="note" colour={colours.textMuted}>
          {t('devmenu.weeks.noKnocks')}
        </Txt>
      ) : (
        <Row>
          {days.map((d) => (
            <ChoiceChip
              key={d.kind}
              label={t('devmenu.weeks.knockChip', { day: d.dayOfWeek })}
              selected={d.kind === shown?.kind}
              accessibilityLabel={t('devmenu.weeks.a11y.knockChip', { day: d.dayOfWeek, week })}
              onPress={() => setKind(d.kind)}
            />
          ))}
        </Row>
      )}
      {preview === null ? null : (
        <>
          <View accessibilityHint={t('devmenu.weeks.previewHint')}>
            <KnockPreview
              day={preview.data.day}
              date={preview.date}
              time={preview.time}
              title={preview.title}
              body={preview.body}
              language={language}
              t={t}
              tag={t('devmenu.weeks.tag', { week, day: preview.dayOfWeek })}
              onPress={openKnock}
            />
          </View>
          <StickerButton
            label={t('devmenu.weeks.ringSoon', { week, day: preview.dayOfWeek })}
            tone="secondary"
            disabled={busy || !ready}
            accessibilityHint={t('devmenu.weeks.ringSoonHint')}
            onPress={ringSoon}
          />
          <StickerButton label={t('devmenu.weeks.fire')} tone="glass" onPress={fire} />
        </>
      )}
      {note === null ? null : (
        <Txt variant="note" colour={colours.textMuted}>
          {note}
        </Txt>
      )}
    </View>
  );
}
