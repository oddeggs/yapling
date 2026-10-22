-- Jev, the turn judge, in each call's cost record: its input tokens (output is free) and their
-- dollars at list price ($0.042 per million input tokens, src/call/costs.ts). Calls recorded before
-- it read 0. The total a cost record reports includes it.
ALTER TABLE call_costs ADD COLUMN judge_input_tokens INTEGER NOT NULL DEFAULT 0;
ALTER TABLE call_costs ADD COLUMN judge_usd REAL NOT NULL DEFAULT 0;
