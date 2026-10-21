import type { CharacterId, LocalDate } from '@yapling/contracts';
import { translator, type StringKey } from '@yapling/i18n';
import { CAST } from '@yapling/story';

/*
 * Small pieces of copy the payoff builders share: who a character is called, the date in the
 * roommate's English handwriting, and numbers as the receipt prints them.
 */

const en = translator('en');

/** A character's name as the learner knows them: the roommate by the name the learner gave it. */
export function characterName(id: CharacterId, roommateName: string): string {
  return id === 'pip' ? roommateName : CAST[id].name;
}

/** "Sep 25": the day in English, as the roommate writes it on a keepsake. */
export function handDate(date: LocalDate): string {
  const [, month, day] = date.split('-');
  const key = `common.monthShort.${Number(month)}` as StringKey;
  return `${en(key as 'common.monthShort.1')} ${Number(day)}`;
}

/** A whole number, or one decimal for small values ("3", "2.5"). */
export function receiptNumber(value: number): string {
  if (value >= 10) return String(Math.round(value));
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}
