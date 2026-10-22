import type { CharacterId } from '@yapling/contracts';
import type { SeasonWeeks, StoryWeekShape } from '@yapling/domain';
import { EPISODES } from '@yapling/story';

/*
 * A season shaped like the story's full Season One (its episodes' weeks, then the festival week):
 * week 1 is the first week as it ships; weeks 2–6 name all three ring calls, week 5's practice call
 * on day 6; the festival week has no calls of its own. Test data only.
 */

type Slot = readonly [day: number, scene: string, kind: string, cast: readonly CharacterId[]];

const week = (id: string, slots: readonly Slot[]): StoryWeekShape => ({
  id,
  week: slots.map(([day, scene]) => ({ day, scene })),
  scenes: slots.map(([, scene, kind, cast]) => ({ id: scene, kind, cast })),
});

const episodeWeek = (n: number, practiceDay = 4): StoryWeekShape => {
  const e = `s1-e${n}`;
  return week(e, [
    [1, e, 'episode', ['mei', 'pip']],
    [2, `${e}-story`, 'story', ['pip']],
    [3, `${e}-real-week`, 'real_week', ['dex']],
    [practiceDay, `${e}-practice`, 'practice', ['bea']],
    [5, `${e}-voicemail`, 'voicemail', ['sol']],
  ]);
};

const [weekOne] = EPISODES;
if (weekOne === undefined) throw new Error('the story has no first week');

export const FULL_SEASON: SeasonWeeks = [
  weekOne,
  episodeWeek(2),
  episodeWeek(3),
  episodeWeek(4),
  episodeWeek(5, 6),
  episodeWeek(6),
  week('s1-festival', [
    [2, 's1-festival-story', 'story', ['pip']],
    [3, 's1-festival-postcard', 'postcard', ['mei']],
  ]),
];
