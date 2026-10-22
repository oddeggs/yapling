import type { CharacterId } from '@yapling/contracts';

import type { SeasonWeeks, StoryWeekShape, WeekSceneShape } from './story-week';

/*
 * A season shaped like Season One for the learning model's tests: six episode weeks and a closing
 * week with no episode. Week 1 is the first week as it ships; week 2 has every slot; week 4 names
 * no real-week or practice scene (they open on the fallback days); week 5 has its practice call on
 * day 6. Test data only: the real weeks come from `@yapling/story`.
 */

const scene = (id: string, kind: string, cast: readonly CharacterId[]): WeekSceneShape => ({
  id,
  kind,
  cast,
});

const week = (
  id: string,
  slots: readonly (readonly [number, string, string, readonly CharacterId[]])[],
): StoryWeekShape => ({
  id,
  week: slots.map(([day, sceneId]) => ({ day, scene: sceneId })),
  scenes: slots.map(([, sceneId, kind, cast]) => scene(sceneId, kind, cast)),
});

const episodeWeek = (
  n: number,
  options: { readonly ringCalls?: boolean; readonly practiceDay?: number } = {},
): StoryWeekShape => {
  const e = `s1-e${n}`;
  return week(e, [
    [1, e, 'episode', ['mei', 'pip']],
    [2, `${e}-story`, 'story', ['pip']],
    [2, `${e}-postcard`, 'postcard', ['linh']],
    ...(options.ringCalls === false
      ? []
      : ([
          [3, `${e}-real-week`, 'real_week', ['dex']],
          [options.practiceDay ?? 4, `${e}-practice`, 'practice', ['bea']],
        ] as const)),
    [5, `${e}-voicemail`, 'voicemail', ['sol']],
  ]);
};

export const WEEK_ONE: StoryWeekShape = week('s1-e1', [
  [2, 's1-e1', 'episode', ['mei', 'pip', 'linh']],
  [3, 's1-e1-story', 'story', ['pip']],
  [3, 's1-e1-postcard', 'postcard', ['linh']],
  [4, 's1-e1-real-week', 'real_week', ['pip']],
  [5, 's1-e1-practice', 'practice', ['bea']],
  [6, 's1-e1-voicemail', 'voicemail', ['mei']],
]);

export const FESTIVAL_WEEK: StoryWeekShape = week('s1-festival', [
  [2, 's1-festival-story', 'story', ['pip']],
  [3, 's1-festival-postcard', 'postcard', ['mei']],
]);

export const TEST_SEASON: SeasonWeeks = [
  WEEK_ONE,
  episodeWeek(2),
  episodeWeek(3),
  episodeWeek(4, { ringCalls: false }),
  episodeWeek(5, { practiceDay: 6 }),
  episodeWeek(6),
  FESTIVAL_WEEK,
];
