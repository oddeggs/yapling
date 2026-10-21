-- The learner's profile (contracts `Profile`): what onboarding asks and Me edits, and the stage,
-- which only the server sets. `revision` grows on every change. Times are epoch milliseconds.
CREATE TABLE profiles (
  user_id TEXT NOT NULL PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
  revision INTEGER NOT NULL,
  display_name TEXT NOT NULL,
  first_language TEXT NOT NULL,
  roommate_species TEXT NOT NULL,
  roommate_name TEXT NOT NULL,
  track TEXT NOT NULL,
  -- `HH:MM` in the learner's timezone; both null for no quiet hours.
  quiet_start TEXT,
  quiet_end TEXT,
  timezone TEXT NOT NULL,
  notifications_allowed INTEGER NOT NULL,
  stage TEXT NOT NULL DEFAULT 'newcomer',
  updated_at INTEGER NOT NULL
);
