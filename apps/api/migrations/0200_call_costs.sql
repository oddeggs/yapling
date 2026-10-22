-- What each live call cost and how fast it answered: one row per call, written beside its call
-- record when the call ends; the post-call summary's cost is added when the summary is written.
-- Dollars are estimates from list prices (src/call/costs.ts). Times are epoch milliseconds.
CREATE TABLE call_costs (
  call_id TEXT NOT NULL PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  scene_id TEXT NOT NULL,
  started_at INTEGER NOT NULL,
  ended_at INTEGER NOT NULL,
  end_reason TEXT NOT NULL,
  learner_seconds INTEGER NOT NULL,
  character_seconds INTEGER NOT NULL,
  -- Learner turns answered with a generated reply.
  turns INTEGER NOT NULL,
  -- Provider usage: audio streamed to speech-to-text, characters sent to text-to-speech, and the
  -- live turns' tokens (hedged requests included).
  stt_seconds REAL NOT NULL,
  tts_chars INTEGER NOT NULL,
  llm_input_tokens INTEGER NOT NULL,
  llm_cache_read_tokens INTEGER NOT NULL,
  llm_cache_write_tokens INTEGER NOT NULL,
  llm_output_tokens INTEGER NOT NULL,
  stt_usd REAL NOT NULL,
  tts_usd REAL NOT NULL,
  llm_usd REAL NOT NULL,
  -- The post-call summary; 0 until it is written (or for a call too short for one).
  summary_usd REAL NOT NULL DEFAULT 0,
  -- End of learner speech → first reply audio sent, per turn (JSON array of milliseconds), and its
  -- 50th and 90th percentiles; null for a call with no reply.
  reply_ms TEXT NOT NULL,
  reply_p50_ms INTEGER,
  reply_p90_ms INTEGER,
  -- End of learner speech → first character audio heard, as the phone measured it (JSON array).
  phone_ms TEXT NOT NULL
);
CREATE INDEX call_costs_user_started_idx ON call_costs (user_id, started_at DESC);
