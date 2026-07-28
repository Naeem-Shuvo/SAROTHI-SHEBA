// The real fix for P1-7 (ULTIMATE_REFINEMENT_PLAN.md §4.4): a partial
// unique index makes "one active ride per passenger/driver" a physical
// property of the database, not something an application `if` statement
// hopes to enforce under a TOCTOU race. See rideRequest.js:25-32 and
// rideAccept.js:19-26 for the check-then-act pattern this makes
// impossible to violate, regardless of what any future code path does.

exports.shorthands = undefined;

exports.up = (pgm) => {
    pgm.sql(`
        CREATE UNIQUE INDEX rides_one_active_per_passenger
            ON rides (passenger_id)
            WHERE ride_status IN ('requested', 'accepted', 'ongoing');
    `);

    pgm.sql(`
        CREATE UNIQUE INDEX rides_one_active_per_driver
            ON rides (driver_id)
            WHERE driver_id IS NOT NULL AND ride_status IN ('accepted', 'ongoing');
    `);

    // Sanity bounds — closes part of P1-9 (fare inflation via an
    // unbounded client-supplied distance_km). Full server-side distance
    // computation is Phase 4's job (real routing via OSRM); this is the
    // database refusing to store a physically absurd value in the
    // meantime, which is worth having regardless.
    pgm.sql(`
        ALTER TABLE rides
            ADD CONSTRAINT rides_distance_sane
                CHECK (distance_km IS NULL OR (distance_km > 0 AND distance_km <= 500)),
            ADD CONSTRAINT rides_fare_nonneg
                CHECK (fare_amount IS NULL OR fare_amount >= 0);
    `);

    // Every hot access pattern from the controllers, unindexed until now
    // (P2-5) — every one of these was a sequential scan.
    pgm.sql(`
        CREATE INDEX rides_driver_id_idx ON rides (driver_id) WHERE driver_id IS NOT NULL;
        CREATE INDEX rides_passenger_id_idx ON rides (passenger_id);
        CREATE INDEX rides_open_requests_idx ON rides (vehicle_type_id, requested_at) WHERE ride_status = 'requested';
        CREATE INDEX payments_ride_id_idx ON payments (ride_id);
        CREATE INDEX ratings_ride_id_idx ON ratings (ride_id);
        CREATE INDEX messages_ride_id_idx ON messages (ride_id, sent_at);
        CREATE INDEX location_logs_ride_id_idx ON location_logs (ride_id, recorded_at);
        CREATE INDEX vehicles_driver_id_idx ON vehicles (driver_id);
    `);
};

exports.down = (pgm) => {
    pgm.sql(`
        DROP INDEX IF EXISTS vehicles_driver_id_idx;
        DROP INDEX IF EXISTS location_logs_ride_id_idx;
        DROP INDEX IF EXISTS messages_ride_id_idx;
        DROP INDEX IF EXISTS ratings_ride_id_idx;
        DROP INDEX IF EXISTS payments_ride_id_idx;
        DROP INDEX IF EXISTS rides_open_requests_idx;
        DROP INDEX IF EXISTS rides_passenger_id_idx;
        DROP INDEX IF EXISTS rides_driver_id_idx;

        ALTER TABLE rides
            DROP CONSTRAINT IF EXISTS rides_fare_nonneg,
            DROP CONSTRAINT IF EXISTS rides_distance_sane;

        DROP INDEX IF EXISTS rides_one_active_per_driver;
        DROP INDEX IF EXISTS rides_one_active_per_passenger;
    `);
};
