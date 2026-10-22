import {
  API_ROUTES,
  Profile,
  SETTLING_CHAPTER_COUNT,
  StageRequest,
  type FirstLanguage,
  type LocalDate,
  type ProfileInput,
  type QuietHours,
  type Roommate,
  type SettlingChapterDone,
  type TimeZone,
} from '@yapling/contracts';
import { addDays, localDateOf, type SettlingChapter } from '@yapling/domain';

import { appData, getSessionToken } from '../../data';
import { apiBase } from '../../data/config';
import { createHttp } from '../../data/http';
import { devSeedSettling } from '../burrow/settling-store';
import { requestKnockPermission } from '../knocks/permission';
import { jumpToDay } from './debug-clock';

/*
 * The test menu's Settling-in tools: a new learner who starts as a Visitor, a jump to any chapter,
 * and a jump to the letter's day. Each writes the learner's real profile and progress on the API
 * (the dev Worker in the test builds) and moves the debug clock, so the burrow, the calls and the
 * knocks all see the same state a learner would reach by playing.
 *
 * A jump leaves one chapter done per day from the install day, so chapter N is next on settling
 * day N (two in a day would bring the burrow's "tomorrow", and the knocks would wait a day). The
 * chapters go to the server's progress, which the burrow trusts first, rather than only to the
 * burrow's own copy on the phone (its `devSeedSettling` marks them all done today). Jumps go
 * forward; to go back, start a new Visitor.
 */

/** The chapters done before `chapter`, one a day from the install day (chapter k on day k). */
export const chaptersBefore = (
  installedOn: LocalDate,
  chapter: SettlingChapter | 7,
): SettlingChapterDone[] =>
  Array.from({ length: chapter - 1 }, (_, i) => ({
    chapter: i + 1,
    doneOn: addDays(installedOn, i),
    callRecordId: null,
  }));

/** The letter comes on the evening Chapter 6 is done: settling day 6 when one is done a day. */
export const LETTER_SETTLING_DAY = SETTLING_CHAPTER_COUNT;

/** All six chapters done, one a day, and the letter's day (Chapter 6's). */
export const letterDayJump = (
  installedOn: LocalDate,
): { readonly chapters: SettlingChapterDone[]; readonly letterOn: LocalDate } => ({
  chapters: chaptersBefore(installedOn, 7),
  letterOn: addDays(installedOn, LETTER_SETTLING_DAY - 1),
});

/** What a new Visitor's profile is made from: onboarding's answers so far, or a stand-in. */
export interface VisitorSeed {
  readonly displayName: string;
  readonly firstLanguage: FirstLanguage;
  readonly roommate: Roommate;
  readonly quietHours: QuietHours | null;
}

/** A stand-in learner for the names onboarding hasn't asked yet. */
export const STAND_IN_NAME = 'Lan';

/** The whole profile of a learner who starts with Linh (no placement call). */
export const visitorProfileInput = (
  seed: VisitorSeed,
  timezone: TimeZone,
  notificationsAllowed: boolean,
): ProfileInput => ({
  displayName: seed.displayName.trim() || STAND_IN_NAME,
  firstLanguage: seed.firstLanguage,
  roommate: { species: seed.roommate.species, name: seed.roommate.name.trim() || 'Pip' },
  track: 'both',
  quietHours: seed.quietHours,
  timezone,
  notificationsAllowed,
  pace: null,
  storyStartedOn: null,
  startPath: 'visitor',
});

/** `POST /api/me/stage` with the session's token; answers the server's profile. */
async function requestStage(request: StageRequest): Promise<Profile> {
  const http = createHttp({ base: apiBase() });
  return http.send({
    method: 'POST',
    path: API_ROUTES.stage,
    body: request,
    request: StageRequest,
    response: Profile,
    token: await getSessionToken(),
  });
}

/**
 * Makes a new learner on this phone who starts with Linh: a guest session, the profile (onboarding
 * skipped), the stage set to Visitor as the level question's "just starting" does, and the
 * progress read. Call it after the phone's learner was cleared.
 */
export async function createVisitor(seed: VisitorSeed, timezone: TimeZone): Promise<Profile> {
  const data = appData();
  const session = await data.startGuest();
  // The burrow's own copy says "started with Linh" at once, before the profile is read back.
  await devSeedSettling(session.userId, {
    visitor: true,
    upTo: 0,
    today: localDateOf(Date.now(), timezone),
  });
  const allowed = await requestKnockPermission().catch(() => false);
  await data.profile.put(visitorProfileInput(seed, timezone, allowed));
  const profile = await requestStage({ to: 'visitor', reason: 'self_select' });
  await data.profile.resource.setFromServer(profile);
  await data.progress.refresh();
  return profile;
}

/** Writes the chapters done and the story's start; the stage and path are left as they are. */
async function writeSettling(
  chapters: readonly SettlingChapterDone[],
  storyStartedOn: LocalDate | null,
): Promise<void> {
  const data = appData();
  await data.progress.update((p) => ({ ...p, settlingChaptersDone: [...chapters] }));
  if (data.profile.resource.data?.storyStartedOn !== storyStartedOn) {
    await data.profile.patch({ storyStartedOn });
  }
}

/** The learner the jumps work on. */
export interface JumpLearner {
  readonly installedOn: LocalDate;
  readonly timezone: TimeZone;
}

/** Chapter `chapter` next, on settling day `chapter`, the chapters before it done. */
export async function jumpToChapter(chapter: SettlingChapter, learner: JumpLearner) {
  await writeSettling(chaptersBefore(learner.installedOn, chapter), null);
  jumpToDay(chapter, learner.installedOn, learner.timezone);
}

/** All six chapters done and the clock on the letter's day, which is week 1's day 1. */
export async function jumpToLetterDay(learner: JumpLearner) {
  const { chapters, letterOn } = letterDayJump(learner.installedOn);
  await writeSettling(chapters, letterOn);
  jumpToDay(LETTER_SETTLING_DAY, learner.installedOn, learner.timezone);
}

/** The seed for a new Visitor from what onboarding has chosen so far. */
export const seedOf = (chosen: {
  readonly displayName: string;
  readonly firstLanguage: FirstLanguage;
  readonly species: Roommate['species'];
  readonly roommateName: string;
  readonly quietOn: boolean;
  readonly quietHours: QuietHours;
}): VisitorSeed => ({
  displayName: chosen.displayName,
  firstLanguage: chosen.firstLanguage,
  roommate: { species: chosen.species, name: chosen.roommateName },
  quietHours: chosen.quietOn ? chosen.quietHours : null,
});
