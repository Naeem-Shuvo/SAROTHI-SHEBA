// Adds real spatial columns alongside the existing plain-DECIMAL lat/lng
// (which stay — nothing reads pickup_geog yet, so nothing breaks). Backfills
// from the columns that already exist. GiST index is what makes
// ST_DWithin / KNN (<->) queries sublinear instead of a full table scan —
// see ULTIMATE_REFINEMENT_PLAN.md §4.7.
//
// No h3-pg extension is available in this Postgres image (checked: only
// postgis/postgis_topology/postgis_tiger_geocoder/postgis_raster/
// postgis_sfcgal are installable — confirmed via
// pg_available_extensions). H3 cell computation happens in the app via
// h3-js instead, storing the result as a plain indexed BIGINT. That's a
// completely standard pattern for H3 without the Postgres extension, and
// Phase 4 (the matching engine) is what actually populates these columns
// — added here now because it's schema, left NULL until then.

exports.shorthands = undefined;

exports.up = (pgm) => {
    pgm.sql(`CREATE EXTENSION IF NOT EXISTS postgis;`);

    pgm.sql(`
        ALTER TABLE rides
            ADD COLUMN pickup_geog geography(Point, 4326),
            ADD COLUMN drop_geog geography(Point, 4326),
            ADD COLUMN pickup_h3_r8 BIGINT,
            ADD COLUMN drop_h3_r8 BIGINT;
    `);

    pgm.sql(`
        UPDATE rides
        SET pickup_geog = geography(ST_SetSRID(ST_MakePoint(pickup_longitude::float8, pickup_latitude::float8), 4326)),
            drop_geog = geography(ST_SetSRID(ST_MakePoint(drop_longitude::float8, drop_latitude::float8), 4326));
    `);

    // Keeps geog in sync automatically for any future INSERT/UPDATE that
    // only sets lat/lng — controllers don't need to know pickup_geog
    // exists at all until Phase 4 explicitly queries it.
    pgm.sql(`
        CREATE OR REPLACE FUNCTION sync_ride_geography()
        RETURNS TRIGGER
        LANGUAGE plpgsql
        AS $$
        BEGIN
            NEW.pickup_geog := geography(ST_SetSRID(ST_MakePoint(NEW.pickup_longitude::float8, NEW.pickup_latitude::float8), 4326));
            NEW.drop_geog := geography(ST_SetSRID(ST_MakePoint(NEW.drop_longitude::float8, NEW.drop_latitude::float8), 4326));
            RETURN NEW;
        END;
        $$;
    `);
    pgm.sql(`
        CREATE TRIGGER sync_ride_geography_trigger
        BEFORE INSERT OR UPDATE OF pickup_latitude, pickup_longitude, drop_latitude, drop_longitude ON rides
        FOR EACH ROW
        EXECUTE FUNCTION sync_ride_geography();
    `);

    pgm.sql(`
        CREATE INDEX rides_pickup_geog_gix ON rides USING GIST (pickup_geog);
        CREATE INDEX rides_pickup_h3_r8_idx ON rides (pickup_h3_r8);
    `);

    // Driver live position — this table does not exist at all today
    // (§1.6: there is nowhere for a waiting driver to publish location).
    // UNLOGGED: skips the WAL, meaning far faster writes at the cost of
    // losing rows on an unclean crash — acceptable here because a driver
    // re-pings within seconds regardless.
    pgm.sql(`
        CREATE UNLOGGED TABLE driver_locations (
            driver_id INT PRIMARY KEY REFERENCES drivers(user_id),
            geog geography(Point, 4326) NOT NULL,
            h3_r8 BIGINT,
            heading_deg SMALLINT,
            speed_kmh NUMERIC(5, 2),
            is_available BOOLEAN NOT NULL DEFAULT TRUE,
            updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );
        CREATE INDEX driver_locations_geog_gix ON driver_locations USING GIST (geog);
        CREATE INDEX driver_locations_h3_avail_idx ON driver_locations (h3_r8) WHERE is_available;
    `);
};

exports.down = (pgm) => {
    pgm.sql(`
        DROP TABLE IF EXISTS driver_locations;

        DROP TRIGGER IF EXISTS sync_ride_geography_trigger ON rides;
        DROP FUNCTION IF EXISTS sync_ride_geography();

        DROP INDEX IF EXISTS rides_pickup_h3_r8_idx;
        DROP INDEX IF EXISTS rides_pickup_geog_gix;

        ALTER TABLE rides
            DROP COLUMN IF EXISTS drop_h3_r8,
            DROP COLUMN IF EXISTS pickup_h3_r8,
            DROP COLUMN IF EXISTS drop_geog,
            DROP COLUMN IF EXISTS pickup_geog;
    `);
    // Deliberately NOT dropping the postgis extension itself — it may be
    // relied on by other schemas/tools in this database (tiger, topology).
};
