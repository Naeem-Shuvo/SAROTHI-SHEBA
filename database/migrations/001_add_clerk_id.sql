-- Migration 001: Add Clerk ID to Users table
-- Run: psql -U anjum -d rideshare_db -f database/migrations/001_add_clerk_id.sql

ALTER TABLE Users ADD COLUMN IF NOT EXISTS clerk_id TEXT UNIQUE;
ALTER TABLE Users ALTER COLUMN password_hash DROP NOT NULL;
