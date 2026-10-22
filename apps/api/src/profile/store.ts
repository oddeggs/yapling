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
  ] as const;
}

/**
 * `PUT`: the whole editable profile, at the end of onboarding or again later. A new profile starts
 * at Newcomer; an existing one keeps its stage, and its pace when the body leaves it out.
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
         updated_at)
       VALUES (?1, 1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?13)
       ON CONFLICT (user_id) DO UPDATE SET
         revision = revision + 1, display_name = ?2, first_language = ?3, roommate_species = ?4,
         roommate_name = ?5, track = ?6, quiet_start = ?7, quiet_end = ?8, timezone = ?9,
         notifications_allowed = ?10, pace = CASE WHEN ?12 = 1 THEN ?11 ELSE pace END,
         updated_at = ?13
       RETURNING *`,
    )
    .bind(userId, ...editableValues(input), input.pace === undefined ? 0 : 1, now)
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
  };
}

/**
 * `PATCH`: some editable fields; null when there is no profile yet. Written only over the revision
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
           notifications_allowed = ?11, pace = ?12, updated_at = ?13
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
