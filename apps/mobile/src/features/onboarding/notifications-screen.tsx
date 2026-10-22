import type { QuietHours } from '@yapling/contracts';
import type { PipSpecies } from '@yapling/art';
import { Critter } from '@yapling/art/native';
import { colours, layout, motion, translucent } from '@yapling/theme';
import { useState } from 'react';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';

import {
  BackButton,
  Chip,
  ChoiceChip,
  GlassSheet,
  StickerButton,
  ToggleRow,
  Txt,
  useKeyframes,
  useLocale,
} from '../../ui';
import { BlurredScene, useScale } from './art';

/*
 * Notifications, asked in context: "Want Pip to call when something happens in town?", the quiet
 * hours (on by default, 22:00–08:00, editable), "Allow notifications" and "Not now". Either way the
 * evening goes on.
 */

/** The quiet hours offered when the learner changes them. */
const STARTS = ['21:00', '22:00', '23:00'] as const;
const ENDS = ['07:00', '08:00', '09:00'] as const;

export interface NotificationsScreenProps {
  readonly species: PipSpecies;
  readonly roommateName: string;
  readonly quietOn: boolean;
  readonly quietHours: QuietHours;
  readonly onQuietOn: (on: boolean) => void;
  readonly onQuietHours: (hours: QuietHours) => void;
  readonly busy: boolean;
  readonly onAllow: () => void;
  readonly onLater: () => void;
  readonly onBack: () => void;
}

export function NotificationsScreen({
  species,
  roommateName,
  quietOn,
  quietHours,
  onQuietOn,
  onQuietHours,
  busy,
  onAllow,
  onLater,
  onBack,
}: NotificationsScreenProps) {
  const { t } = useLocale();
  const { u } = useScale();
  const hero = useKeyframes(motion.screens.infoHero);
  const [editing, setEditing] = useState(false);
  const range = t('common.timeRange', { from: quietHours.start, to: quietHours.end });
  return (
    <>
      <View style={{ flex: 1, backgroundColor: colours.surfaceSunken }}>
        <BlurredScene fn="s_burrow2" blur={10} wash={translucent.paperWash} />
        <BackButton
          onPress={onBack}
          accessibilityLabel={t('common.a11y.back')}
          style={{ position: 'absolute', top: layout.topBar, left: layout.marginScreen }}
        />
        <Animated.View style={[{ position: 'absolute', top: 96, left: u(120) }, hero]}>
          <Critter character="pip" species={species} mood="excited" size={150} />
        </Animated.View>
        <GlassSheet kind="info" top={300} entrance={motion.screens.infoSheet}>
          <Txt variant="kicker" colour={colours.textMuted}>
            {t('onboarding.notifications.kicker')}
          </Txt>
          <Txt variant="sheetTitle" accessibilityRole="header">
            {t('onboarding.notifications.title', { name: roommateName })}
          </Txt>
          <Txt variant="body" colour={colours.textBody}>
            {t('onboarding.notifications.body')}
          </Txt>
          <ToggleRow
            title={t('onboarding.notifications.quietHours')}
            subtitle={range}
            on={quietOn}
            onChange={onQuietOn}
          />
          {quietOn && !editing ? (
            <View style={{ alignItems: 'flex-end' }}>
              <Chip label={t('onboarding.notifications.change')} onPress={() => setEditing(true)} />
            </View>
          ) : null}
          {quietOn && editing ? (
            <View style={{ gap: 8 }}>
              <TimeChoices
                label={t('onboarding.notifications.from')}
                options={STARTS}
                chosen={quietHours.start}
                onChoose={(start) => onQuietHours({ ...quietHours, start })}
              />
              <TimeChoices
                label={t('onboarding.notifications.until')}
                options={ENDS}
                chosen={quietHours.end}
                onChoose={(end) => onQuietHours({ ...quietHours, end })}
              />
            </View>
          ) : null}
          <View style={{ marginTop: 'auto', gap: 8 }}>
            <StickerButton
              label={t('onboarding.notifications.allow')}
              onPress={onAllow}
              disabled={busy}
            />
            <StickerButton
              label={t('onboarding.notifications.later')}
              tone="glass"
              onPress={onLater}
              disabled={busy}
            />
          </View>
        </GlassSheet>
      </View>
    </>
  );
}

function TimeChoices({
  label,
  options,
  chosen,
  onChoose,
}: {
  label: string;
  options: readonly string[];
  chosen: string;
  onChoose: (time: string) => void;
}) {
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={label}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
    >
      <Txt variant="noteStrong" colour={colours.textMuted} style={{ width: 44 }}>
        {label}
      </Txt>
      {options.map((o) => (
        <ChoiceChip key={o} label={o} selected={o === chosen} onPress={() => onChoose(o)} />
      ))}
    </View>
  );
}
