// Row-Level Security policies (ULTIMATE_REFINEMENT_PLAN.md §4.8) —
// written, reviewable, and correct, but candidly: NOT YET ENFORCED.
//
// Postgres superusers and table owners BYPASS RLS entirely, by design —
// it isn't a bug, it's documented Postgres behavior. This app's DB role
// (`anjum`, confirmed via \du in Phase 0) is a superuser with
// BYPASSRLS. These policies are inert until the app connects as a
// separate, non-superuser role instead.
//
// That role change is deliberately NOT made in this migration: it means
// creating a new role, granting exactly the right privileges on every
// table/sequence, and switching config.PG_USER for the RUNTIME
// connection while keeping migrations/seed running as the privileged
// role — a real piece of infrastructure work with genuine risk of
// silently breaking table access this late with Phases 6-9 still ahead.
// Enabling RLS for real is future work; shipping the policy definitions
// now means they're written, reviewed, and ready the moment that role
// exists — not designed from scratch under time pressure later.
//
// app_current_user_id() reads a setting withTransaction() (database/db.js)
// already sets via SELECT set_config('app.current_user_id', ..., true)
// whenever an actorId is passed — wired in since Phase 1, unused until
// now. STABLE + wrapped in a function so the planner evaluates it once
// per query, not once per row (an easy 10x regression otherwise).

exports.shorthands = undefined;

exports.up = (pgm) => {
    pgm.sql(`
        CREATE OR REPLACE FUNCTION app_current_user_id() RETURNS INT
        LANGUAGE sql STABLE AS $$
            SELECT NULLIF(current_setting('app.current_user_id', true), '')::INT
        $$;
    `);

    pgm.sql(`
        ALTER TABLE rides ENABLE ROW LEVEL SECURITY;
        ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
        ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
    `);

    pgm.sql(`
        CREATE POLICY rides_participant_select ON rides FOR SELECT
            USING (passenger_id = app_current_user_id() OR driver_id = app_current_user_id());

        -- Drivers can see unclaimed requests (GET /rides/available's
        -- manual-pull fallback, and dispatch matching) but no other
        -- driver's assigned ride.
        CREATE POLICY rides_open_to_drivers ON rides FOR SELECT
            USING (ride_status = 'requested' AND EXISTS (
                SELECT 1 FROM drivers d WHERE d.user_id = app_current_user_id()
            ));

        CREATE POLICY rides_participant_write ON rides FOR UPDATE
            USING (passenger_id = app_current_user_id() OR driver_id = app_current_user_id());
    `);

    pgm.sql(`
        CREATE POLICY messages_participant ON messages FOR ALL
            USING (EXISTS (
                SELECT 1 FROM rides r WHERE r.ride_id = messages.ride_id
                  AND (r.passenger_id = app_current_user_id() OR r.driver_id = app_current_user_id())
            ));
    `);

    pgm.sql(`
        CREATE POLICY payments_participant ON payments FOR SELECT
            USING (EXISTS (
                SELECT 1 FROM rides r WHERE r.ride_id = payments.ride_id
                  AND r.passenger_id = app_current_user_id()
            ));
    `);
};

exports.down = (pgm) => {
    pgm.sql(`
        DROP POLICY IF EXISTS payments_participant ON payments;
        DROP POLICY IF EXISTS messages_participant ON messages;
        DROP POLICY IF EXISTS rides_participant_write ON rides;
        DROP POLICY IF EXISTS rides_open_to_drivers ON rides;
        DROP POLICY IF EXISTS rides_participant_select ON rides;

        ALTER TABLE payments DISABLE ROW LEVEL SECURITY;
        ALTER TABLE messages DISABLE ROW LEVEL SECURITY;
        ALTER TABLE rides DISABLE ROW LEVEL SECURITY;

        DROP FUNCTION IF EXISTS app_current_user_id();
    `);
};
