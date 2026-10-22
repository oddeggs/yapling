-- The Settling-in chapters done (contracts `SettlingProgress`), a JSON array checked against the
-- contracts on every read and write; empty for progress saved before they were kept.
ALTER TABLE progress ADD COLUMN settling_chapters_done TEXT NOT NULL DEFAULT '[]';
