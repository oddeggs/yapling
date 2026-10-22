import { describe, expect, it, jest } from '@jest/globals';
import { ProfileInput, SettlingProgress } from '@yapling/contracts';

import { letterDayOf, nextSettlingChapter } from '../../src/features/knocks/settling';
import {
  chaptersBefore,
  letterDayJump,
  seedOf,
  visitorProfileInput,
} from '../../src/features/devmenu/settling-tools';

jest.mock('expo-notifications', () => ({}));
jest.mock('expo-sqlite/kv-store', () => ({ Storage: {} }));
jest.mock('../../src/data', () => ({ appData: () => null, getSessionToken: () => null }));
jest.mock('../../src/data/config', () => ({ apiBase: () => 'https://example.test/api' }));
jest.mock('../../src/data/http', () => ({ createHttp: () => null }));
jest.mock('../../src/features/burrow/settling-store', () => ({ devSeedSettling: () => null }));

const installedOn = '2026-10-20';

describe('the test menu’s Settling-in jumps', () => {
  it('leaves chapter N next on settling day N, one chapter a day before it', () => {
    const chapters = chaptersBefore(installedOn, 3);
    expect(chapters).toEqual([
      { chapter: 1, doneOn: '2026-10-20', callRecordId: null },
      { chapter: 2, doneOn: '2026-10-21', callRecordId: null },
    ]);
    expect(nextSettlingChapter(chapters)).toBe(3);
    expect(chaptersBefore(installedOn, 1)).toEqual([]);
    expect(SettlingProgress.safeParse(chaptersBefore(installedOn, 6)).success).toBe(true);
  });

  it('puts the letter on Chapter 6’s day, settling day 6', () => {
    const { chapters, letterOn } = letterDayJump(installedOn);
    expect(chapters.map((c) => c.chapter)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(letterOn).toBe('2026-10-25');
    expect(letterDayOf({ chapters, storyStartedOn: null })).toBe(letterOn);
    expect(SettlingProgress.safeParse(chapters).success).toBe(true);
  });

  it('makes a Visitor’s profile the server takes, with onboarding’s answers or stand-ins', () => {
    const chosen = {
      displayName: '',
      firstLanguage: 'vi',
      species: 'capybara',
      roommateName: '',
      quietOn: true,
      quietHours: { start: '22:00', end: '08:00' },
    } as const;
    const seed = seedOf(chosen);
    const input = visitorProfileInput(seed, 'Asia/Ho_Chi_Minh', true);
    expect(ProfileInput.parse(input)).toEqual(input);
    expect(input).toMatchObject({
      displayName: 'Lan',
      roommate: { species: 'capybara', name: 'Pip' },
      startPath: 'visitor',
      storyStartedOn: null,
      pace: null,
      notificationsAllowed: true,
    });
    expect(seedOf({ ...chosen, quietOn: false }).quietHours).toBeNull();
  });
});
