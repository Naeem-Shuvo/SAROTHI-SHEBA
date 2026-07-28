#!/usr/bin/env node
// Replaces the ~170 lines of commented-out INSERT statements that used to
// sit dead at the bottom of database/schema.sql (P2-7) with a real,
// idempotent script — safe to run against an empty DB or re-run against
// a seeded one without duplicating data.
//
// Passwords are hashed with the SAME (weak) scheme the app currently uses
// (crypto.sha256, see backend/controller/login.js:49) so seeded users can
// actually log in through the running API. Phase 5 replaces this with
// Argon2id and a transparent rehash-on-login migration — seed data isn't
// exempt from that upgrade, it just isn't jumping the queue ahead of it.
//
// Usage:  npm run seed

const crypto = require('crypto');
const { withTransaction, closePool } = require('./db');

function hashPassword(plaintext) {
    return crypto.createHash('sha256').update(plaintext).digest('hex');
}

const DEV_PASSWORD = 'DevPass123!';
const DEV_HASH = hashPassword(DEV_PASSWORD);

// NOTE: the precheck_info trigger (migration 20260728120003) enforces
// @gmail.com emails, BD phone numbers, and letters-only names (no digits)
// at the DATABASE level now — this seed data has to satisfy the same
// rules a real user's registration would.
const USERS = {
    admin: { name: 'System Admin', email: 'sarothi.admin@gmail.com', phone: '01711111111' },
    driver: { name: 'Karim Driver', email: 'sarothi.driver@gmail.com', phone: '01722222222' },
    passenger: { name: 'Rahim Passenger', email: 'sarothi.passenger@gmail.com', phone: '01733333333' }
};

async function upsertUser(client, { name, email, phone }) {
    const existing = await client.query('SELECT user_id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) return existing.rows[0].user_id;

    const { rows } = await client.query(
        `INSERT INTO users (name, email, phone_number, password_hash)
         VALUES ($1, $2, $3, $4) RETURNING user_id`,
        [name, email, phone, DEV_HASH]
    );
    return rows[0].user_id;
}

async function seed() {
    const summary = await withTransaction(async (client) => {
        // ── Vehicle types ──────────────────────────────────────────
        // No unique constraint on type_name (Phase 2 will add one) — use
        // the same WHERE NOT EXISTS idempotency pattern the original
        // commented-out schema.sql data used.
        await client.query(`
            INSERT INTO vehicle_types (type_name, base_fare, rate_per_km)
            SELECT 'Bike', 30.00, 12.00
            WHERE NOT EXISTS (SELECT 1 FROM vehicle_types WHERE type_name = 'Bike')
        `);
        await client.query(`
            INSERT INTO vehicle_types (type_name, base_fare, rate_per_km)
            SELECT 'Car', 60.00, 20.00
            WHERE NOT EXISTS (SELECT 1 FROM vehicle_types WHERE type_name = 'Car')
        `);
        const bikeType = await client.query(
            "SELECT vehicle_type_id FROM vehicle_types WHERE type_name = 'Bike'"
        );
        const bikeTypeId = bikeType.rows[0].vehicle_type_id;

        // ── Users + roles ──────────────────────────────────────────
        const adminId = await upsertUser(client, USERS.admin);
        const driverId = await upsertUser(client, USERS.driver);
        const passengerId = await upsertUser(client, USERS.passenger);

        await client.query(
            `INSERT INTO admins (admin_id, admin_level) VALUES ($1, 2)
             ON CONFLICT (admin_id) DO NOTHING`,
            [adminId]
        );
        await client.query(
            `INSERT INTO drivers (user_id, license_number, rating_average, status)
             VALUES ($1, 'DHK-DR-1001', 4.80, 'active')
             ON CONFLICT (user_id) DO NOTHING`,
            [driverId]
        );
        await client.query(
            `INSERT INTO passengers (user_id, rating_average, total_distance)
             VALUES ($1, 4.70, 52.50)
             ON CONFLICT (user_id) DO NOTHING`,
            [passengerId]
        );

        // ── Vehicle ────────────────────────────────────────────────
        await client.query(
            `INSERT INTO vehicles (driver_id, vehicle_type_id, plate_number, model, color)
             VALUES ($1, $2, 'DHAKA-METRO-HA-123456', 'Honda CB Hornet', 'Red')
             ON CONFLICT (plate_number) DO NOTHING`,
            [driverId, bikeTypeId]
        );

        // ── One sample completed ride, end to end ─────────────────
        // Inserted already-completed (not via UPDATE), so the
        // after_ride_completed trigger — which only fires on UPDATE OF
        // ride_status — deliberately does NOT run here. Payment is
        // inserted explicitly below, matching how the original
        // commented-out schema.sql sample data handled it.
        const existingRide = await client.query(
            `SELECT ride_id FROM rides
             WHERE passenger_id = $1 AND pickup_address = 'Shahbag, Dhaka'
               AND drop_address = 'Dhanmondi 27, Dhaka'`,
            [passengerId]
        );

        let rideId;
        if (existingRide.rows.length > 0) {
            rideId = existingRide.rows[0].ride_id;
        } else {
            const rideResult = await client.query(
                `INSERT INTO rides (
                    passenger_id, driver_id, vehicle_type_id,
                    pickup_latitude, pickup_longitude, drop_latitude, drop_longitude,
                    pickup_address, drop_address,
                    requested_at, pickup_time, drop_time,
                    distance_km, fare_amount, ride_status
                ) VALUES (
                    $1, $2, $3,
                    23.810300, 90.412500, 23.780600, 90.279200,
                    'Shahbag, Dhaka', 'Dhanmondi 27, Dhaka',
                    NOW() - INTERVAL '30 minutes', NOW() - INTERVAL '25 minutes', NOW() - INTERVAL '5 minutes',
                    8.70, 134.40, 'completed'
                ) RETURNING ride_id`,
                [passengerId, driverId, bikeTypeId]
            );
            rideId = rideResult.rows[0].ride_id;

            await client.query(
                `INSERT INTO payments (ride_id, amount, payment_method, transaction_id, payment_status, paid_at)
                 VALUES ($1, 134.40, 'cash', 'TXN-SAMPLE-1001', 'paid', NOW() - INTERVAL '4 minutes')`,
                [rideId]
            );
            await client.query(
                `INSERT INTO ratings (ride_id, rating_value, comment) VALUES ($1, 5, 'Smooth and safe ride.')`,
                [rideId]
            );
            await client.query(
                `INSERT INTO messages (ride_id, sender_id, message_text)
                 VALUES ($1, $2, 'I am waiting at the gate.')`,
                [rideId, passengerId]
            );
            await client.query(
                `INSERT INTO location_logs (ride_id, latitude, longitude, recorded_at)
                 VALUES ($1, 23.800000, 90.390000, NOW() - INTERVAL '20 minutes')`,
                [rideId]
            );
        }

        return { adminId, driverId, passengerId, rideId };
    });

    console.log('✅ Seed complete.\n');
    console.log('   Dev login (all roles share the same password locally):');
    console.log(`   Password: ${DEV_PASSWORD}\n`);
    console.log(`   Admin:     ${USERS.admin.email}`);
    console.log(`   Driver:    ${USERS.driver.email}`);
    console.log(`   Passenger: ${USERS.passenger.email}\n`);
    console.log(`   Sample completed ride: #${summary.rideId} (Shahbag → Dhanmondi 27, paid, rated 5★)`);
}

seed()
    .then(() => closePool())
    .catch((err) => {
        console.error('❌ Seed failed:', err.message);
        return closePool().finally(() => process.exit(1));
    });
