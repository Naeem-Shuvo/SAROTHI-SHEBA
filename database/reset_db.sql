-- ============================================
-- SAROTHI-SHEBA — Full Database Reset
-- Drops everything, re-creates schema, seeds data.
-- Usage: psql -U anjum -d rideshare_db -f database/reset_db.sql
-- ============================================

-- Drop tables in reverse dependency order
DROP TABLE IF EXISTS Location_Logs CASCADE;
DROP TABLE IF EXISTS Messages     CASCADE;
DROP TABLE IF EXISTS Ratings      CASCADE;
DROP TABLE IF EXISTS Payments     CASCADE;
DROP TABLE IF EXISTS Rides        CASCADE;
DROP TABLE IF EXISTS Vehicles     CASCADE;
DROP TABLE IF EXISTS Passengers   CASCADE;
DROP TABLE IF EXISTS Drivers      CASCADE;
DROP TABLE IF EXISTS Admins       CASCADE;
DROP TABLE IF EXISTS Vehicle_Types CASCADE;
DROP TABLE IF EXISTS Users        CASCADE;

-- Re-create schema
\i schema.sql

-- Seed data
\i seed.sql
