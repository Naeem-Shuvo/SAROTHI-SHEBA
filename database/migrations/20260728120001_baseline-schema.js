// Phase 1: brings the CURRENT schema under version control, verbatim from
// the old database/schema.sql — no redesign here. That's Phase 2's job
// (enums, partial unique indexes, PostGIS, money as integer minor units;
// see ULTIMATE_REFINEMENT_PLAN.md §2.4). This migration's only goal is
// "the schema is now reproducible and reversible" rather than "the schema
// is now correct".
//
// Two things deliberately dropped from the old schema.sql:
//   - The ~170 lines of commented-out sample INSERT statements (P2-7) —
//     replaced by database/seed.js, a real idempotent script.
//   - The stray `select * from passengers join users...` at the end of
//     the old file (P2-6) — never should have been there; it was a
//     leftover debugging query, not schema.

exports.shorthands = undefined;

exports.up = (pgm) => {
    pgm.sql(`
        -- 1. Independent tables (no foreign keys)
        CREATE TABLE Users (
            user_id SERIAL PRIMARY KEY,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            phone_number VARCHAR(50) UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE Vehicle_Types (
            vehicle_type_id SERIAL PRIMARY KEY,
            type_name TEXT NOT NULL,
            base_fare DECIMAL(10, 2) NOT NULL,
            rate_per_km DECIMAL(10, 2) NOT NULL
        );

        -- 2. Role tables (inherit from Users)
        CREATE TABLE Admins (
            admin_id INT PRIMARY KEY REFERENCES Users(user_id),
            admin_level INT NOT NULL
        );

        CREATE TABLE Drivers (
            user_id INT PRIMARY KEY REFERENCES Users(user_id),
            license_number TEXT UNIQUE NOT NULL,
            rating_average DECIMAL(3, 2),
            status VARCHAR(20)
        );

        CREATE TABLE Passengers (
            user_id INT PRIMARY KEY REFERENCES Users(user_id),
            rating_average DECIMAL(3, 2),
            total_distance DECIMAL(10, 2) DEFAULT 0
        );

        -- 3. Asset tables
        CREATE TABLE Vehicles (
            vehicle_id SERIAL PRIMARY KEY,
            driver_id INT NOT NULL REFERENCES Drivers(user_id),
            vehicle_type_id INT NOT NULL REFERENCES Vehicle_Types(vehicle_type_id),
            plate_number TEXT UNIQUE NOT NULL,
            model TEXT,
            color TEXT
        );

        CREATE TABLE driver_applications (
            application_id SERIAL PRIMARY KEY,
            user_id INT NOT NULL REFERENCES Users(user_id),
            license_number TEXT NOT NULL,
            status VARCHAR(20) DEFAULT 'pending',
            applied_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(user_id)
        );

        -- 4. Transactional tables (the core process)
        CREATE TABLE Rides (
            ride_id SERIAL PRIMARY KEY,
            passenger_id INT NOT NULL REFERENCES Passengers(user_id),
            driver_id INT REFERENCES Drivers(user_id),
            vehicle_type_id INT NOT NULL REFERENCES Vehicle_Types(vehicle_type_id),

            pickup_latitude DECIMAL(9, 6) NOT NULL,
            pickup_longitude DECIMAL(9, 6) NOT NULL,
            drop_latitude DECIMAL(9, 6) NOT NULL,
            drop_longitude DECIMAL(9, 6) NOT NULL,
            pickup_address TEXT,
            drop_address TEXT,

            requested_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
            pickup_time TIMESTAMPTZ,
            drop_time TIMESTAMPTZ,

            distance_km DECIMAL(10, 2),
            fare_amount DECIMAL(10, 2),
            ride_status VARCHAR(20) -- e.g. 'requested', 'ongoing', 'completed'
        );

        -- 5. Dependent tables (referencing Rides)
        CREATE TABLE Payments (
            payment_id SERIAL PRIMARY KEY,
            ride_id INT UNIQUE NOT NULL REFERENCES Rides(ride_id),
            amount DECIMAL(10, 2) NOT NULL,
            payment_method TEXT,
            transaction_id TEXT,
            payment_status TEXT,
            paid_at TIMESTAMPTZ
        );

        CREATE TABLE Ratings (
            rating_id SERIAL PRIMARY KEY,
            ride_id INT NOT NULL REFERENCES Rides(ride_id),
            rating_value INT CHECK (rating_value BETWEEN 1 AND 5),
            comment TEXT,
            created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE Messages (
            message_id SERIAL PRIMARY KEY,
            ride_id INT NOT NULL REFERENCES Rides(ride_id),
            sender_id INT NOT NULL REFERENCES Users(user_id),
            message_text TEXT,
            sent_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE Location_Logs (
            log_id SERIAL PRIMARY KEY,
            ride_id INT NOT NULL REFERENCES Rides(ride_id),
            latitude DECIMAL(9, 6) NOT NULL,
            longitude DECIMAL(9, 6) NOT NULL,
            recorded_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        );
    `);
};

exports.down = (pgm) => {
    // Reverse FK-dependency order.
    pgm.sql(`
        DROP TABLE IF EXISTS Location_Logs;
        DROP TABLE IF EXISTS Messages;
        DROP TABLE IF EXISTS Ratings;
        DROP TABLE IF EXISTS Payments;
        DROP TABLE IF EXISTS Rides;
        DROP TABLE IF EXISTS driver_applications;
        DROP TABLE IF EXISTS Vehicles;
        DROP TABLE IF EXISTS Passengers;
        DROP TABLE IF EXISTS Drivers;
        DROP TABLE IF EXISTS Admins;
        DROP TABLE IF EXISTS Vehicle_Types;
        DROP TABLE IF EXISTS Users;
    `);
};
