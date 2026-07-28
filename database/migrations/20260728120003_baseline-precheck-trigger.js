// This trigger existed in the repo as database/func precheck_info.sql
// (note the space in the filename — P2-11) but was never actually applied
// to any database; nothing in git history or the running container
// references it being sourced. It's real, intentional validation — a
// DB-level backstop for the same rules backend/controller/register.js
// already checks in JS — so it's brought under migration control here
// rather than left to bit-rot as an orphaned file. The old file is
// deleted once this migration exists.
//
// This is genuinely aligned with this project's own target philosophy
// (ULTIMATE_REFINEMENT_PLAN.md §2.1: "the database is the last line of
// defense") even though it predates that plan — worth preserving, not
// just renaming.

exports.shorthands = undefined;

exports.up = (pgm) => {
    pgm.sql(`
        CREATE OR REPLACE FUNCTION precheck_info()
        RETURNS TRIGGER
        LANGUAGE plpgsql
        AS $$
        BEGIN
            IF (TG_OP = 'INSERT') THEN
                IF (NEW.name IS NULL OR NEW.email IS NULL OR NEW.password_hash IS NULL OR NEW.phone_number IS NULL) THEN
                    RAISE EXCEPTION 'Name, email, password and phone number cannot be null';
                END IF;
                IF NEW.email !~ '^[A-Za-z0-9._%+-]+@gmail\\.com$' THEN
                    RAISE EXCEPTION 'Email must be a valid Gmail address';
                END IF;
                IF NEW.phone_number !~ '^\\+8801[3-9][0-9]{8}$' AND NEW.phone_number !~ '^01[3-9][0-9]{8}$' THEN
                    RAISE EXCEPTION 'Phone number must be a valid Bangladeshi number starting with +880';
                END IF;
                IF NEW.name !~ '^[A-Za-z ]+$' THEN
                    RAISE EXCEPTION 'Name must contain only letters and spaces';
                END IF;
            END IF;
            RETURN NEW;
        END;
        $$;
    `);

    pgm.sql(`
        DROP TRIGGER IF EXISTS precheck_info_trigger ON users;
        CREATE TRIGGER precheck_info_trigger
        BEFORE INSERT ON users
        FOR EACH ROW
        EXECUTE FUNCTION precheck_info();
    `);
};

exports.down = (pgm) => {
    pgm.sql(`
        DROP TRIGGER IF EXISTS precheck_info_trigger ON users;
        DROP FUNCTION IF EXISTS precheck_info();
    `);
};
