-- Live call records (contracts `CallRecord`): one row per call, written when the call ends. The
-- transcript lives in R2 under the learner's prefix (`transcript_key`); the post-call job fills
-- `summary` and clears `summary_pending`. Times are epoch milliseconds.
CREATE TABLE calls (
  id TEXT NOT NULL PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  scene_id TEXT NOT NULL,
  -- The character who led the call.
  character TEXT NOT NULL,
  stage TEXT NOT NULL,
  started_at INTEGER NOT NULL,
  ended_at INTEGER NOT NULL,
  learner_seconds INTEGER NOT NULL,
  character_seconds INTEGER NOT NULL,
  end_reason TEXT NOT NULL,
  summary_pending INTEGER NOT NULL,
  -- `CallSummary` JSON, null until written (or for a call too short for one).
  summary TEXT,
  -- The scene runner's state when the call stopped early (minutes ran out), to resume the scene.
  scene_state TEXT,
  -- Set when the call stopped for the learner's safety (`crisis`); never shown, for review.
  safety_flag TEXT,
  -- Provider usage and the estimated cost: STT seconds, TTS characters, tokens, dollars.
  cost TEXT NOT NULL,
  -- Per-stage latency medians in milliseconds.
  timings TEXT NOT NULL,
  transcript_key TEXT NOT NULL
);
CREATE INDEX calls_user_started_idx ON calls (user_id, started_at DESC);
CREATE INDEX calls_user_scene_idx ON calls (user_id, scene_id, ended_at DESC);
