-- The pace the learner asked for on the residency card (contracts `Pace`): `slower` or `faster`;
-- null keeps the stage's own pace.
ALTER TABLE profiles ADD COLUMN pace TEXT;
