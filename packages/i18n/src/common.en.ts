import type { EnCatalogue } from './catalogue-types';

/** Copy shared across features: buttons, the AI tag, dates. */
export const commonEn = {
  'common.continue': 'Continue',
  'common.done': 'Done',
  /** Read for the round back button (‹). */
  'common.a11y.back': 'Back',
  /** Read for a close button (✕). */
  'common.a11y.close': 'Close',
  /** The tag beside every character's name. Characters always show it. */
  'common.aiTag': 'AI',

  /** A date on a notification or a card: "Monday 21 September". */
  'common.date.long': '{weekday} {day} {month}',
  /** A run of days in one month: "Sep 21 – 27". */
  'common.date.range': '{month} {from} – {to}',
  /** A time range: quiet hours. */
  'common.timeRange': '{from} – {to}',
  'common.weekday.mon': 'Monday',
  'common.weekday.tue': 'Tuesday',
  'common.weekday.wed': 'Wednesday',
  'common.weekday.thu': 'Thursday',
  'common.weekday.fri': 'Friday',
  'common.weekday.sat': 'Saturday',
  'common.weekday.sun': 'Sunday',
  /** A weekday where space is short: a call slot's day. */
  'common.weekdayShort.mon': 'Mon',
  'common.weekdayShort.tue': 'Tue',
  'common.weekdayShort.wed': 'Wed',
  'common.weekdayShort.thu': 'Thu',
  'common.weekdayShort.fri': 'Fri',
  'common.weekdayShort.sat': 'Sat',
  'common.weekdayShort.sun': 'Sun',
  /** A month in a long date. */
  'common.month.1': 'January',
  'common.month.2': 'February',
  'common.month.3': 'March',
  'common.month.4': 'April',
  'common.month.5': 'May',
  'common.month.6': 'June',
  'common.month.7': 'July',
  'common.month.8': 'August',
  'common.month.9': 'September',
  'common.month.10': 'October',
  'common.month.11': 'November',
  'common.month.12': 'December',
  /** A month in a date range. */
  'common.monthShort.1': 'Jan',
  'common.monthShort.2': 'Feb',
  'common.monthShort.3': 'Mar',
  'common.monthShort.4': 'Apr',
  'common.monthShort.5': 'May',
  'common.monthShort.6': 'Jun',
  'common.monthShort.7': 'Jul',
  'common.monthShort.8': 'Aug',
  'common.monthShort.9': 'Sep',
  'common.monthShort.10': 'Oct',
  'common.monthShort.11': 'Nov',
  'common.monthShort.12': 'Dec',
} as const satisfies EnCatalogue;
