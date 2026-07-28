// Structure for Phase 3's concurrency work (outbox pattern, §4.6) and an
// audit trail nothing in this schema has ever had. Created now, in
// Phase 2, because it's schema; POPULATING and CONSUMING these tables is
// Phase 3's job — no controller reads or writes them yet.

exports.shorthands = undefined;

exports.up = (pgm) => {
    // Append-only. REVOKE below makes "append-only" a real guarantee, not
    // a convention — see ULTIMATE_REFINEMENT_PLAN.md §2.4.
    pgm.sql(`
        CREATE TABLE ride_events (
            event_id BIGSERIAL PRIMARY KEY,
            ride_id INT NOT NULL REFERENCES rides(ride_id),
            from_status ride_status_t,
            to_status ride_status_t NOT NULL,
            actor_id INT REFERENCES users(user_id),
            actor_role TEXT,
            payload JSONB NOT NULL DEFAULT '{}',
            occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );
        CREATE INDEX ride_events_ride_idx ON ride_events (ride_id, occurred_at);
        REVOKE UPDATE, DELETE ON ride_events FROM PUBLIC;
    `);

    pgm.sql(`
        CREATE TABLE outbox (
            id BIGSERIAL PRIMARY KEY,
            aggregate_type TEXT NOT NULL,
            aggregate_id TEXT NOT NULL,
            event_type TEXT NOT NULL,
            payload JSONB NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            published_at TIMESTAMPTZ,
            attempts INT NOT NULL DEFAULT 0,
            last_error TEXT
        );
        CREATE INDEX outbox_unpublished_idx ON outbox (created_at) WHERE published_at IS NULL;
    `);

    pgm.sql(`
        CREATE TABLE idempotency_keys (
            key TEXT PRIMARY KEY,
            scope TEXT NOT NULL,
            request_hash TEXT NOT NULL,
            response_code INT,
            response_body JSONB,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            expires_at TIMESTAMPTZ NOT NULL
        );
        CREATE INDEX idempotency_keys_expiry_idx ON idempotency_keys (expires_at);
    `);

    pgm.sql(`
        CREATE TABLE processed_events (
            event_id BIGINT NOT NULL,
            consumer TEXT NOT NULL,
            processed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            PRIMARY KEY (event_id, consumer)
        );
    `);
};

exports.down = (pgm) => {
    pgm.sql(`
        DROP TABLE IF EXISTS processed_events;
        DROP TABLE IF EXISTS idempotency_keys;
        DROP TABLE IF EXISTS outbox;
    `);
    // Append-only in principle, but 'down' must still be a real undo —
    // otherwise a bad migration can never be cleanly rolled back in dev.
    pgm.sql(`
        GRANT UPDATE, DELETE ON ride_events TO PUBLIC;
        DROP TABLE IF EXISTS ride_events;
    `);
};
