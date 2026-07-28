// Phase 2 begins the real schema redesign (Phase 1 only ported the
// existing schema verbatim). This migration converts every free-text
// status column into a proper enum, and adds a transition-validating
// trigger on rides.ride_status — ULTIMATE_REFINEMENT_PLAN.md §2.1's
// "make illegal states unrepresentable" principle, applied for real.
//
// Enum labels deliberately match the CURRENT app's actual string values
// (including 'ongoing', not the plan's originally-proposed 'in_progress')
// so this lands with ZERO controller changes — six call sites across
// backend and frontend depend on the literal string 'ongoing' today, and
// renaming it is a cosmetic change with no functional benefit that would
// need to touch the frontend before Phase 8 is scheduled to. Postgres
// enums are extensible later (ALTER TYPE ... ADD VALUE) so states the app
// doesn't reach yet (quoted, offered, arriving...) are added in Phase 4
// when the matching engine actually produces them, not speculatively now.

exports.shorthands = undefined;

exports.up = (pgm) => {
    pgm.sql(`
        CREATE TYPE ride_status_t AS ENUM ('requested', 'accepted', 'ongoing', 'completed', 'cancelled');
        CREATE TYPE driver_status_t AS ENUM ('active', 'pending', 'suspended', 'offline', 'banned');
        CREATE TYPE application_status_t AS ENUM ('pending', 'approved', 'rejected');
        CREATE TYPE payment_status_t AS ENUM ('pending', 'paid', 'failed', 'cancelled');
        -- 'pending' here is a genuine transient placeholder, not a mistake:
        -- functions.sql's insert_payment_on_completion trigger inserts a
        -- payment row the instant a ride completes, before the passenger
        -- has chosen cash or SSLCommerz — payment.js later overwrites this
        -- with the real method once one is selected.
        CREATE TYPE payment_method_t AS ENUM ('pending', 'cash', 'sslcommerz');
    `);

    // after_ride_completed (from the Phase 1 baseline-functions migration)
    // is declared as "AFTER UPDATE OF ride_status" — Postgres refuses to
    // ALTER COLUMN TYPE on any column named in a trigger's UPDATE OF list,
    // so it has to come off first and go back on unchanged afterward.
    pgm.sql(`DROP TRIGGER IF EXISTS after_ride_completed ON rides;`);

    // USING clause: existing string values must already match a label, or
    // this fails loudly rather than silently truncating/coercing bad data.
    pgm.sql(`
        ALTER TABLE rides
            ALTER COLUMN ride_status DROP DEFAULT,
            ALTER COLUMN ride_status TYPE ride_status_t USING ride_status::ride_status_t;

        ALTER TABLE drivers
            ALTER COLUMN status DROP DEFAULT,
            ALTER COLUMN status TYPE driver_status_t USING status::driver_status_t;

        ALTER TABLE driver_applications
            ALTER COLUMN status DROP DEFAULT,
            ALTER COLUMN status TYPE application_status_t USING status::application_status_t,
            ALTER COLUMN status SET DEFAULT 'pending';

        ALTER TABLE payments
            ALTER COLUMN payment_status DROP DEFAULT,
            ALTER COLUMN payment_status TYPE payment_status_t USING payment_status::payment_status_t,
            ALTER COLUMN payment_method TYPE payment_method_t USING payment_method::payment_method_t;
    `);

    // Legal transitions only. BEFORE UPDATE means INSERTs (including
    // seed.js's already-completed sample ride) are unaffected — this only
    // fires when an EXISTING row's status changes.
    pgm.sql(`
        CREATE OR REPLACE FUNCTION check_ride_status_transition()
        RETURNS TRIGGER
        LANGUAGE plpgsql
        AS $$
        BEGIN
            IF OLD.ride_status = NEW.ride_status THEN
                RETURN NEW;
            END IF;

            IF NOT (
                (OLD.ride_status = 'requested' AND NEW.ride_status IN ('accepted', 'cancelled'))
                OR (OLD.ride_status = 'accepted' AND NEW.ride_status IN ('ongoing', 'completed', 'cancelled'))
                OR (OLD.ride_status = 'ongoing' AND NEW.ride_status IN ('completed', 'cancelled'))
            ) THEN
                RAISE EXCEPTION 'Illegal ride_status transition: % -> % (ride_id=%)',
                    OLD.ride_status, NEW.ride_status, OLD.ride_id;
            END IF;

            RETURN NEW;
        END;
        $$;
    `);

    pgm.sql(`
        CREATE TRIGGER check_ride_status_transition_trigger
        BEFORE UPDATE OF ride_status ON rides
        FOR EACH ROW
        EXECUTE FUNCTION check_ride_status_transition();
    `);

    // Restore the trigger dropped above, unchanged — the column's TYPE
    // changed, not its name, so the trigger definition itself needs no
    // modification, just re-attaching. BEFORE our new trigger fires first
    // (alphabetical-by-name ordering among triggers on the same event in
    // Postgres), validating the transition before the payment-insertion
    // side effect runs.
    pgm.sql(`
        CREATE TRIGGER after_ride_completed
        AFTER UPDATE OF ride_status ON rides
        FOR EACH ROW
        EXECUTE FUNCTION insert_payment_on_completion();
    `);
};

exports.down = (pgm) => {
    pgm.sql(`
        DROP TRIGGER IF EXISTS after_ride_completed ON rides;
        DROP TRIGGER IF EXISTS check_ride_status_transition_trigger ON rides;
        DROP FUNCTION IF EXISTS check_ride_status_transition();

        ALTER TABLE payments
            ALTER COLUMN payment_status TYPE TEXT USING payment_status::TEXT,
            ALTER COLUMN payment_method TYPE TEXT USING payment_method::TEXT;

        ALTER TABLE driver_applications
            ALTER COLUMN status DROP DEFAULT,
            ALTER COLUMN status TYPE VARCHAR(20) USING status::TEXT,
            ALTER COLUMN status SET DEFAULT 'pending';

        ALTER TABLE drivers
            ALTER COLUMN status TYPE VARCHAR(20) USING status::TEXT;

        ALTER TABLE rides
            ALTER COLUMN ride_status TYPE VARCHAR(20) USING ride_status::TEXT;

        DROP TYPE IF EXISTS payment_method_t;
        DROP TYPE IF EXISTS payment_status_t;
        DROP TYPE IF EXISTS application_status_t;
        DROP TYPE IF EXISTS driver_status_t;
        DROP TYPE IF EXISTS ride_status_t;
    `);

    pgm.sql(`
        CREATE TRIGGER after_ride_completed
        AFTER UPDATE OF ride_status ON rides
        FOR EACH ROW
        EXECUTE FUNCTION insert_payment_on_completion();
    `);
};
