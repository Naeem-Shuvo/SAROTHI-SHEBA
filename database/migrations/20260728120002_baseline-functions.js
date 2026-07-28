// Ported verbatim from the old database/functions.sql. Same rule as the
// baseline schema migration: reproducibility first, redesign later.
// complete_ride()'s lack of idempotency (P1-9 — calling it twice
// double-counts distance and refare) is a known, tracked defect, not
// something silently fixed here — that happens in Phase 2/4 alongside the
// state-machine and constraint work it depends on.

exports.shorthands = undefined;

exports.up = (pgm) => {
    pgm.sql(`
        CREATE OR REPLACE FUNCTION calculate_fare(distance_km DECIMAL, v_type_id INT)
        RETURNS DECIMAL AS $$
        DECLARE
            b_fare DECIMAL;
            rate DECIMAL;
            total_fare DECIMAL;
        BEGIN
            SELECT base_fare, rate_per_km INTO b_fare, rate
            FROM vehicle_types WHERE vehicle_type_id = v_type_id;

            total_fare := b_fare + (rate * distance_km);
            RETURN total_fare;
        END;
        $$ LANGUAGE plpgsql;
    `);

    pgm.sql(`
        CREATE OR REPLACE FUNCTION insert_payment_on_completion()
        RETURNS TRIGGER AS $$
        BEGIN
            -- When a ride is completed, insert a pending payment record.
            -- SSLCommerz (or cash checkout) updates this to 'paid' afterward.
            IF NEW.ride_status = 'completed' AND OLD.ride_status != 'completed' THEN
                INSERT INTO payments (ride_id, amount, payment_method, payment_status)
                VALUES (NEW.ride_id, NEW.fare_amount, 'pending', 'pending')
                ON CONFLICT (ride_id) DO NOTHING;
            END IF;
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
    `);

    pgm.sql(`
        CREATE OR REPLACE TRIGGER after_ride_completed
        AFTER UPDATE OF ride_status ON rides
        FOR EACH ROW
        EXECUTE FUNCTION insert_payment_on_completion();
    `);

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

exports.down = (pgm) => {
    pgm.sql(`
        DROP PROCEDURE IF EXISTS complete_ride(INT, DECIMAL);
        DROP TRIGGER IF EXISTS after_ride_completed ON rides;
        DROP FUNCTION IF EXISTS insert_payment_on_completion();
        DROP FUNCTION IF EXISTS calculate_fare(DECIMAL, INT);
    `);
};
