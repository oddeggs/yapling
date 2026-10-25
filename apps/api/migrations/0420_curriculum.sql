-- The curriculum drives the stories, and each learner has one companion. The learner's companion
-- (a cast id, chosen at the end of arriving), their place in the syllabus (stage, units told,
-- can-dos shown, JSON), and the kept painting's one thing to fix (JSON: what they said, better).

ALTER TABLE learners ADD COLUMN companion TEXT;
ALTER TABLE learners ADD COLUMN curriculum TEXT;
ALTER TABLE paintings ADD COLUMN fix TEXT;

-- Stories written before the curriculum don't continue: everyone starts their first unit.
UPDATE stories SET status = 'done' WHERE status IN ('active', 'planning');
UPDATE moments SET status = 'failed' WHERE status IN ('planning', 'ready');
