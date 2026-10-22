import type { StoryWeek } from '../types';
import { pipStory, postcards, voicemail } from './later-weeks';

/*
 * Bunting Week, the festival after the last episode (`season-1-script.md`, "Bunting Week"): no new
 * story pressure. It names no ring calls of its own, so each of its three slots takes any call of
 * its kind (an episode replayed at today's stage, any real-week or practice call). Its own things
 * are listening: Pip's season story, Mei's thank-you postcard and Bea's voicemail about the boat.
 */

export const S1_FESTIVAL: StoryWeek = {
  id: 's1-festival',
  number: 7,
  title: 'Bunting Week',
  week: [
    { day: 2, scene: 's1-fest-story' },
    { day: 3, scene: 's1-fest-postcard' },
    { day: 5, scene: 's1-fest-voicemail' },
  ],
  scenes: [
    pipStory(
      {
        id: 's1-fest-story',
        title: 'The story of our season',
        summary:
          "Pip tells the whole season back, from Mei's letter to the vote in the square, with the learner's name.",
      },
      [
        's1-fest-story-01',
        's1-fest-story-02',
        's1-fest-story-03',
        's1-fest-story-04',
        's1-fest-story-05',
        's1-fest-story-06',
        's1-fest-story-07',
        's1-fest-story-08',
        's1-fest-story-09',
      ],
    ),
    postcards(
      {
        id: 's1-fest-postcard',
        title: 'Postcard from Mei',
        summary:
          'Mei says thank you: the café stays because of the learner. Free kaya toast all week.',
      },
      [['mei', 's1-fest-postcard-mei']],
    ),
    voicemail({
      id: 's1-fest-voicemail',
      title: 'Bea left you a voicemail',
      summary: 'The boat is still in the harbour, and nobody has come off it yet.',
      from: 'bea',
      line: 's1-fest-vm-boat',
    }),
  ],
};
