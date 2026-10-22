-- How the learner started (contracts `StartPath`: `visitor` or `placement`) and the local day the
-- story started (`YYYY-MM-DD`, the letter under the café door), which week 1 and the free weeks
-- count from. Both null for a profile saved before they were kept, whose story started on the
-- install day.
ALTER TABLE profiles ADD COLUMN story_started_on TEXT;
ALTER TABLE profiles ADD COLUMN start_path TEXT;
