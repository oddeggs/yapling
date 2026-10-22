import { Profile, type ProfileInput, type ProfileUpdate, type Stage } from '@yapling/contracts';

/** Reads and writes on `profiles`. Every write grows the revision by one. */

interface ProfileRow {
  revision: number;
  display_name: string;
  first_language: string;
  roommate_species: string;
  roommate_name: string;
  track: string;
  quiet_start: string | null;
  quiet_end: string | null;
  timezone: string;
  notifications_allowed: number;
  pace: string | null;
  stage: string;
  updated_at: number;
  story_started_on: string | null;
  start_path: string | null;
}

function fromRow(row: ProfileRow): Profile {
  return Profile.parse({
    revision: row.revision,
    displayName: row.display_name,
    firstLanguage: row.first_language,
    roommate: { species: row.roommate_species, name: row.roommate_name },
    track: row.track,
    quietHours:
      row.quiet_start === null || row.quiet_end === null
        ? null
        : { start: row.quiet_start, end: row.quiet_end },
    timezone: row.timezone,
    notificationsAllowed: row.notifications_allowed === 1,
    pace: row.pace,
    stage: row.stage,
    updatedAt: row.updated_at,
    storyStartedOn: row.story_started_on,
    startPath: row.start_path,
  });
}

export async function readProfile(db: D1Database, userId: string): Promise<Profile | null> {
  const row = await db
    .prepare('SELECT * FROM profiles WHERE user_id = ?')
    .bind(userId)
    .first<ProfileRow>();
  return row === null ? null : fromRow(row);
}

function editableValues(input: ProfileInput) {
  return [
    input.displayName,
    input.firstLanguage,
    input.roommate.species,
    input.roommate.name,
    input.track,
    input.quietHours?.start ?? null,
    input.quietHours?.end ?? null,
    input.timezone,
    input.notificationsAllowed ? 1 : 0,
    input.pace ?? null,
    input.storyStartedOn ?? null,
    input.startPath ?? null,
  ] as const;
}

/** 1 when the body carries the field (null included), 0 when it leaves it out: then it's kept. */
const given = (value: unknown): 0 | 1 => (value === undefined ? 0 : 1);

/**
 * `PUT`: the whole editable profile, at the end of onboarding or again later. A new profile starts
 * at Newcomer; an existing one keeps its stage, and its pace, story start and start path when the
 * body leaves them out (older apps never send the last two).
 */
export async function putProfile(
  db: D1Database,
  userId: string,
  input: ProfileInput,
  now: number,
): Promise<Profile> {
  const row = await db
    .prepare(
      `INSERT INTO profiles (user_id, revision, display_name, first_language, roommate_species,
         roommate_name, track, quiet_start, quiet_end, timezone, notifications_allowed, pace,
         story_started_on, start_path, updated_at)
       VALUES (?1, 1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?17)
       ON CONFLICT (user_id) DO UPDATE SET
         revision = revision + 1, display_name = ?2, first_language = ?3, roommate_species = ?4,
         roommate_name = ?5, track = ?6, quiet_start = ?7, quiet_end = ?8, timezone = ?9,
         notifications_allowed = ?10, pace = CASE WHEN ?14 = 1 THEN ?11 ELSE pace END,
         story_started_on = CASE WHEN ?15 = 1 THEN ?12 ELSE story_started_on END,
         start_path = CASE WHEN ?16 = 1 THEN ?13 ELSE start_path END,
         updated_at = ?17
       RETURNING *`,
    )
    .bind(
      userId,
      ...editableValues(input),
      given(input.pace),
      given(input.storyStartedOn),
      given(input.startPath),
      now,
    )
    .first<ProfileRow>();
  if (row === null) throw new Error('the profile write returned nothing');
  return fromRow(row);
}

function merged(profile: Profile, update: ProfileUpdate): ProfileInput {
  return {
    displayName: update.displayName ?? profile.displayName,
    firstLanguage: update.firstLanguage ?? profile.firstLanguage,
    roommate: update.roommate ?? profile.roommate,
    track: update.track ?? profile.track,
    quietHours: update.quietHours === undefined ? profile.quietHours : update.quietHours,
    timezone: update.timezone ?? profile.timezone,
    notificationsAllowed: update.notificationsAllowed ?? profile.notificationsAllowed,
    pace: update.pace === undefined ? profile.pace : update.pace,
    storyStartedOn:
      update.storyStartedOn === undefined ? profile.storyStartedOn : update.storyStartedOn,
    startPath: update.startPath === undefined ? profile.startPath : update.startPath,
  };
}

/**
 * `PATCH`: some editable fields, or only the story start and start path; null when there is no
 * profile yet. Written only over the revision
 * it read, so two edits racing both land, one after the other.
 */
export async function patchProfile(
  db: D1Database,
  userId: string,
  update: ProfileUpdate,
  now: number,
): Promise<Profile | null> {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const current = await readProfile(db, userId);
    if (current === null) return null;
    const row = await db
      .prepare(
        `UPDATE profiles SET
           revision = revision + 1, display_name = ?3, first_language = ?4, roommate_species = ?5,
           roommate_name = ?6, track = ?7, quiet_start = ?8, quiet_end = ?9, timezone = ?10,
           notifications_allowed = ?11, pace = ?12, story_started_on = ?13, start_path = ?14,
           updated_at = ?15
         WHERE user_id = ?1 AND revision = ?2
         RETURNING *`,
      )
      .bind(userId, current.revision, ...editableValues(merged(current, update)), now)
      .first<ProfileRow>();
    if (row !== null) return fromRow(row);
  }
  throw new Error('the profile kept changing under the edit');
}

/**
 * The stage, which only the server sets: placement sets the first one and the learning model
 * moves it. False when the learner has no profile yet.
 */
export async function setStage(
  db: D1Database,
  userId: string,
  stage: Stage,
  now: number,
): Promise<boolean> {
  const result = await db
    .prepare(
      `UPDATE profiles SET stage = ?2, revision = revision + 1, updated_at = ?3
       WHERE user_id = ?1 AND stage <> ?2`,
    )
    .bind(userId, stage, now)
    .run();
  if (result.meta.changes === 1) return true;
  return (await readProfile(db, userId)) !== null;
}
