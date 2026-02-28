-- add clerk_id to users
ALTER TABLE Users ADD COLUMN IF NOT EXISTS clerk_id TEXT UNIQUE;
ALTER TABLE Users ALTER COLUMN password_hash DROP NOT NULL;
