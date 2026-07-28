// Adds integer minor-unit (poisha) money columns alongside the existing
// DECIMAL ones — deliberately NOT dropping fare_amount/amount yet.
// payment.js:56 does parseFloat(ride.fare_amount), converting to IEEE-754
// double at the boundary (P1-11); fixing that means touching payment.js,
// which is Phase 3 territory (controllers migrate together with
// withTransaction, not piecemeal in a schema-only phase). This migration
// makes the correct column available and backfilled/kept-in-sync via
// trigger, so Phase 3 has an exact, ready-made column to switch reads to
// — old and new stay consistent in the meantime.

exports.shorthands = undefined;

exports.up = (pgm) => {
    pgm.sql(`
        ALTER TABLE rides ADD COLUMN fare_minor BIGINT;
        ALTER TABLE payments ADD COLUMN amount_minor BIGINT;
    `);

    pgm.sql(`
        UPDATE rides SET fare_minor = ROUND(fare_amount * 100) WHERE fare_amount IS NOT NULL;
        UPDATE payments SET amount_minor = ROUND(amount * 100);
    `);

    pgm.sql(`
        ALTER TABLE payments ALTER COLUMN amount_minor SET NOT NULL;
        ALTER TABLE payments ADD CONSTRAINT payments_amount_minor_nonneg CHECK (amount_minor >= 0);
        ALTER TABLE rides ADD CONSTRAINT rides_fare_minor_nonneg CHECK (fare_minor IS NULL OR fare_minor >= 0);
    `);

    // Keep both representations consistent for any write that only
    // touches one of them, until Phase 3 removes the decimal columns
    // entirely and this trigger with them.
    pgm.sql(`
        CREATE OR REPLACE FUNCTION sync_ride_fare_minor()
        RETURNS TRIGGER
        LANGUAGE plpgsql
        AS $$
        BEGIN
            IF NEW.fare_amount IS NOT NULL THEN
                NEW.fare_minor := ROUND(NEW.fare_amount * 100);
            END IF;
            RETURN NEW;
        END;
        $$;
        CREATE TRIGGER sync_ride_fare_minor_trigger
        BEFORE INSERT OR UPDATE OF fare_amount ON rides
        FOR EACH ROW EXECUTE FUNCTION sync_ride_fare_minor();
    `);

    pgm.sql(`
        CREATE OR REPLACE FUNCTION sync_payment_amount_minor()
        RETURNS TRIGGER
        LANGUAGE plpgsql
        AS $$
        BEGIN
            NEW.amount_minor := ROUND(NEW.amount * 100);
            RETURN NEW;
        END;
        $$;
        CREATE TRIGGER sync_payment_amount_minor_trigger
        BEFORE INSERT OR UPDATE OF amount ON payments
        FOR EACH ROW EXECUTE FUNCTION sync_payment_amount_minor();
    `);
};

exports.down = (pgm) => {
    pgm.sql(`
        DROP TRIGGER IF EXISTS sync_payment_amount_minor_trigger ON payments;
        DROP FUNCTION IF EXISTS sync_payment_amount_minor();
        DROP TRIGGER IF EXISTS sync_ride_fare_minor_trigger ON rides;
        DROP FUNCTION IF EXISTS sync_ride_fare_minor();

        ALTER TABLE rides DROP CONSTRAINT IF EXISTS rides_fare_minor_nonneg;
        ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_amount_minor_nonneg;

        ALTER TABLE payments DROP COLUMN IF EXISTS amount_minor;
        ALTER TABLE rides DROP COLUMN IF EXISTS fare_minor;
    `);
};
