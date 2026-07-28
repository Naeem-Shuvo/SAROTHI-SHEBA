// Fixes P1-13: the old ratings table had no rater_id/ratee_id at all, so
// "who rated whom" was unrecoverable, and rateRide.js's own app-level
// check ("has this ride already been rated?") meant whoever rated FIRST
// silently blocked the other participant from ever rating. This rebuild
// makes "one rating per (ride, rater)" a real constraint, so both parties
// can rate independently, and adds an O(1) running average instead of a
// full-table-scan recompute on every single rating.
//
// The old table is dropped rather than migrated in place: it holds only
// disposable seed/dev data (confirmed — see plan.md Q3, this DB is
// treated as disposable pre-production), and there is no way to backfill
// rater_id/ratee_id for historical rows that never recorded who rated.
// A real production migration with real historical data would need a
// backfill strategy; this one doesn't have historical data to preserve.
//
// backend/controller/rateRide.js and database/seed.js are updated in the
// same commit as this migration — the schema change makes the OLD
// insert shape (no rater_id/ratee_id) fail outright, so this is a
// narrow, schema-driven controller fix, not the broad Phase 3
// controller migration onto withTransaction.

exports.shorthands = undefined;

exports.up = (pgm) => {
    pgm.sql(`DROP TABLE IF EXISTS ratings;`);

    pgm.sql(`
        CREATE TABLE ratings (
            rating_id BIGSERIAL PRIMARY KEY,
            ride_id INT NOT NULL REFERENCES rides(ride_id),
            rater_id INT NOT NULL REFERENCES users(user_id),
            ratee_id INT NOT NULL REFERENCES users(user_id),
            rating_value SMALLINT NOT NULL CHECK (rating_value BETWEEN 1 AND 5),
            comment TEXT,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            CONSTRAINT ratings_no_self CHECK (rater_id <> ratee_id)
        );
        CREATE UNIQUE INDEX ratings_one_per_rater_per_ride ON ratings (ride_id, rater_id);
        CREATE INDEX ratings_ratee_idx ON ratings (ratee_id);
    `);

    pgm.sql(`
        ALTER TABLE drivers
            ADD COLUMN rating_count INT NOT NULL DEFAULT 0,
            ADD COLUMN rating_sum BIGINT NOT NULL DEFAULT 0;
    `);

    // Preserve any existing rating_average as a starting point isn't
    // possible without knowing how many ratings produced it — reset to
    // 0/0 (NULL average) is honest; real ratings accumulate from here.
    pgm.sql(`
        ALTER TABLE drivers DROP COLUMN rating_average;
        ALTER TABLE drivers ADD COLUMN rating_average NUMERIC(3, 2)
            GENERATED ALWAYS AS (
                CASE WHEN rating_count = 0 THEN NULL
                     ELSE ROUND(rating_sum::numeric / rating_count, 2) END
            ) STORED;
    `);
};

exports.down = (pgm) => {
    pgm.sql(`
        ALTER TABLE drivers DROP COLUMN rating_average;
        ALTER TABLE drivers ADD COLUMN rating_average DECIMAL(3, 2);
        ALTER TABLE drivers
            DROP COLUMN IF EXISTS rating_sum,
            DROP COLUMN IF EXISTS rating_count;

        DROP TABLE IF EXISTS ratings;
        CREATE TABLE ratings (
            rating_id SERIAL PRIMARY KEY,
            ride_id INT NOT NULL REFERENCES rides(ride_id),
            rating_value INT CHECK (rating_value BETWEEN 1 AND 5),
            comment TEXT,
            created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        );
    `);
};
