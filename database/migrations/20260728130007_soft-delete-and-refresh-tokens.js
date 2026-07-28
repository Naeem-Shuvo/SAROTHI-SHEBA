// Part of fixing P1-12: adminUsers.js's deactivateUser hard-DELETEs a
// user's role rows non-atomically, which either orphans their historical
// rides (FK still points at a passenger/driver row that no longer
// exists) or fails outright with a FK violation. is_active/deleted_at
// make deactivation reversible and auditable instead. The controller fix
// itself (adminUsers.js + login.js checking is_active) lands in the same
// commit — same reasoning as the ratings rebuild: this is a narrow fix
// required BY the schema change, not the broad Phase 3 controller sweep.
//
// refresh_tokens is added now (schema only) for Phase 5, which replaces
// the in-memory token blacklist (P1-14) with real rotation + reuse
// detection. Nothing reads or writes it yet.

exports.shorthands = undefined;

exports.up = (pgm) => {
    pgm.sql(`
        ALTER TABLE users
            ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT TRUE,
            ADD COLUMN deleted_at TIMESTAMPTZ,
            ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
    `);

    pgm.sql(`
        CREATE TABLE refresh_tokens (
            jti UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id INT NOT NULL REFERENCES users(user_id),
            family_id UUID NOT NULL,
            issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            expires_at TIMESTAMPTZ NOT NULL,
            revoked_at TIMESTAMPTZ,
            replaced_by UUID REFERENCES refresh_tokens(jti),
            user_agent TEXT,
            ip INET
        );
        CREATE INDEX refresh_tokens_family_idx ON refresh_tokens (family_id);
        CREATE INDEX refresh_tokens_user_idx ON refresh_tokens (user_id);
    `);
};

exports.down = (pgm) => {
    pgm.sql(`
        DROP TABLE IF EXISTS refresh_tokens;
        ALTER TABLE users
            DROP COLUMN IF EXISTS updated_at,
            DROP COLUMN IF EXISTS deleted_at,
            DROP COLUMN IF EXISTS is_active;
    `);
};
