-- full database reset
-- drops everything, re-creates schema, seeds data

-- drop tables
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

-- recreate schema
\i schema.sql

-- seed data
\i seed.sql
