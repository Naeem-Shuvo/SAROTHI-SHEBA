// Fixes the idempotency half of P1-9: the original complete_ride() had no
// guard against being called twice — a duplicate request (retry, double
// tap, or two concurrent requests) would re-add distance_km to the
// passenger's total_distance every time. FOR UPDATE takes a real row
// lock, so a second call arriving WHILE the first is still running
// blocks until the first commits, then sees the ride is already
// 'completed' and exits — this is pessimistic locking used exactly where
// ULTIMATE_REFINEMENT_PLAN.md §4.2 says to use it: a multi-statement
// read-then-write sequence that needs protecting, not a single guarded
// UPDATE (that's the optimistic pattern rideAccept.js already uses
// correctly).
//
// Distance sanity bounds (rides_distance_sane, added in migration
// 130002) already stop an absurd client-supplied distance_km from being
// stored at all — this closes the remaining "call it twice" vector.

exports.shorthands = undefined;

exports.up = (pgm) => {
    pgm.sql(`
        CREATE OR REPLACE PROCEDURE complete_ride(
            p_ride_id INT,
            p_distance_km DECIMAL
        )
        LANGUAGE plpgsql
        AS $$
        DECLARE
            v_type_id INT;
            v_passenger_id INT;
            v_current_status ride_status_t;
            calculated_fare DECIMAL;
        BEGIN
            SELECT vehicle_type_id, passenger_id, ride_status
              INTO v_type_id, v_passenger_id, v_current_status
              FROM rides WHERE ride_id = p_ride_id
              FOR UPDATE;

            IF NOT FOUND THEN
                RAISE EXCEPTION 'Ride % not found', p_ride_id;
            END IF;

            IF v_current_status = 'completed' THEN
                RETURN; -- idempotent no-op: already completed
            END IF;

            calculated_fare := calculate_fare(p_distance_km, v_type_id);

            UPDATE rides
            SET ride_status = 'completed',
                distance_km = p_distance_km,
                fare_amount = calculated_fare,
                drop_time = NOW()
            WHERE ride_id = p_ride_id;

            UPDATE passengers
            SET total_distance = total_distance + p_distance_km
            WHERE user_id = v_passenger_id;
        END;
        $$;
    `);
};

exports.down = (pgm) => {
    pgm.sql(`
        CREATE OR REPLACE PROCEDURE complete_ride(
            p_ride_id INT,
            p_distance_km DECIMAL
        )
        LANGUAGE plpgsql
        AS $$
        DECLARE
            v_type_id INT;
            v_passenger_id INT;
            calculated_fare DECIMAL;
        BEGIN
            SELECT vehicle_type_id, passenger_id INTO v_type_id, v_passenger_id
            FROM rides WHERE ride_id = p_ride_id;

            IF NOT FOUND THEN
                RAISE EXCEPTION 'Ride % not found', p_ride_id;
            END IF;

            calculated_fare := calculate_fare(p_distance_km, v_type_id);

            UPDATE rides
            SET ride_status = 'completed',
                distance_km = p_distance_km,
                fare_amount = calculated_fare,
                drop_time = NOW()
            WHERE ride_id = p_ride_id;

            UPDATE passengers
            SET total_distance = total_distance + p_distance_km
            WHERE user_id = v_passenger_id;
        END;
        $$;
    `);
};
