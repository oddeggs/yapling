import type { LocalDate } from '@yapling/contracts';
import type { Language, Translate } from '@yapling/i18n';
import { colours, palette, radii, translucent, type } from '@yapling/theme';
import { View } from 'react-native';

import { LockScreenCard } from '../../ui/lock-screen-card';
import { Txt } from '../../ui/text';

const WEEKDAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;
const MONTHS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'] as const;

/** "Thứ Tư, 23 tháng 9" / "Wednesday 23 September": the lock screen's date line. */
export const lockDate = (date: LocalDate, t: Translate): string => {
  const [y = 1970, m = 1, d = 1] = date.split('-').map(Number);
  const weekday = WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()] ?? 'mon';
  const month = MONTHS[m - 1] ?? '1';
  return t('common.date.long', {
    weekday: t(`common.weekday.${weekday}`),
    day: d,
    month: t(`common.month.${month}`),
  });
};

/** "08:12" as the lock screen's clock writes it: "8:12". */
const clockOf = (time: string): string => time.replace(/^0(\d)/, '$1');

/**
 * A day's knock as the lock screen shows it at the moment it rings (the d2–d8 lock renders): the
 * date, the clock, the day tag and the notification card. The test menu's preview; tapping the
 * card opens that day, as a tapped knock would.
 */
export function KnockPreview({
  day,
  date,
  time,
  title,
  body,
  language,
  t,
  onPress,
}: {
  readonly day: number;
  readonly date: LocalDate;
  readonly time: string;
  readonly title: string;
  readonly body: string;
  readonly language: Language;
  readonly t: Translate;
  readonly onPress?: () => void;
}) {
  // The test menu's own labels; the lock screen around a real knock is the system's.
  const dayTag = language === 'vi' ? `Ngày ${day}` : `Day ${day}`;
  const justNow = language === 'vi' ? 'bây giờ' : 'now';
  return (
    <View
      style={{
        backgroundColor: palette.lockNight,
        borderRadius: radii.panel,
        paddingTop: 18,
        paddingBottom: 14,
        paddingHorizontal: 10,
        alignItems: 'center',
        gap: 6,
      }}
    >
      <Txt variant="lockDate" colour={colours.textOnInk}>
        {lockDate(date, t)}
      </Txt>
      <Txt variant={{ ...type.lockTime, size: 64 }} colour={colours.textOnInk}>
        {clockOf(time)}
      </Txt>
      <View
        style={{
          backgroundColor: translucent.lockGlass,
          borderRadius: radii.note,
          paddingHorizontal: 10,
          paddingVertical: 3,
          marginBottom: 10,
        }}
      >
        <Txt variant="noteStrong" colour={colours.textOnInk}>
          {dayTag}
        </Txt>
      </View>
      <View style={{ alignSelf: 'stretch' }}>
        <LockScreenCard
          from={title}
          time={justNow}
          body={body}
          {...(onPress === undefined ? {} : { onPress })}
        />
      </View>
    </View>
  );
}
