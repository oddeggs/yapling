import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { openVariants, pipAsleep, PLACE_IDS, PLACES, residentIn } from './places';
import { localTime, openPlaces, weatherAt } from './town';

describe('places', () => {
  it('names the same places, in the same variants, as the paintings', () => {
    const src = readFileSync(join(import.meta.dirname, '../paint/places.js'), 'utf8');
    const painted = [
      ...src.matchAll(
        /\{ id: '(\w+)', name: '[^']+', who: '\w+', hours: '[^']*', variants: \[([^\]]+)\]/g,
      ),
    ];
    expect(painted.map((m) => m[1]).sort()).toEqual([...PLACE_IDS].sort());
    for (const m of painted) {
      const labels = PLACES[m[1] as keyof typeof PLACES].variants.map((x) => x.label);
      expect(m[2]).toContain(`'${labels[0]}'`);
    }
  });

  it('keeps residents to their hours', () => {
    expect(residentIn('cafe', 0, 6.5)).toBe(false);
    expect(residentIn('cafe', 0, 7.5)).toBe(true);
    expect(residentIn('cafe', 2, 12)).toBe(false);
    expect(residentIn('noodles', 0, 12)).toBe(false);
    expect(residentIn('noodles', 1, 23)).toBe(true);
    expect(residentIn('laundry', 0, 1)).toBe(true);
    expect(residentIn('laundry', 0, 15)).toBe(false);
    expect(openVariants('field', 3)).toEqual([0, 1]);
    expect(pipAsleep('room', 0, 23.5)).toBe(true);
    expect(pipAsleep('room', 1, 23.5)).toBe(false);
  });

  it('always has somewhere open', () => {
    for (let h = 0; h < 24; h += 0.5) expect(openPlaces(h).length).toBeGreaterThan(5);
  });
});

describe('town clock', () => {
  it('reads the learner’s own clock', () => {
    const t = localTime(new Date('2026-10-24T14:30:00Z'), 'Asia/Ho_Chi_Minh');
    expect(t).toEqual({ year: 2026, month: 10, day: 24, hour: 21.5 });
  });

  it('gives everyone the same weather for the same half-day, and snow only in winter', () => {
    const a = weatherAt({ year: 2026, month: 10, day: 24, hour: 9 });
    expect(weatherAt({ year: 2026, month: 10, day: 24, hour: 11.9 })).toBe(a);
    for (let d = 1; d <= 28; d++)
      expect(weatherAt({ year: 2026, month: 7, day: d, hour: 15 })).not.toBe('snow');
  });
});
