-- The phone's timezone, sent with the guest session request: the install day and the day count
-- follow it until onboarding saves the profile's timezone. Null when the app didn't send one.
ALTER TABLE users ADD COLUMN timezone TEXT;
