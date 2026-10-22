-- How each call's learner turns passed (match, generous, skip, fallback), counted, as JSON.
-- Null for calls from before it was kept.
ALTER TABLE calls ADD COLUMN turn_passes TEXT;
