// Time-boxed, exclusive dispatch offers — replaces "broadcast to every
// driver on earth and whoever's thumb is fastest wins"
// (rideRequest.js:57's global.io.emit, §1.6) with real, ranked,
// one-at-a-time dispatch. See ULTIMATE_REFINEMENT_PLAN.md §4.7.

exports.shorthands = undefined;

exports.up = (pgm) => {
    pgm.sql(`
        CREATE TABLE ride_offers (
            offer_id BIGSERIAL PRIMARY KEY,
            ride_id INT NOT NULL REFERENCES rides(ride_id),
            driver_id INT NOT NULL REFERENCES drivers(user_id),
            rank SMALLINT NOT NULL,
            score NUMERIC(8, 4) NOT NULL,
            offered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            expires_at TIMESTAMPTZ NOT NULL,
            responded_at TIMESTAMPTZ,
            outcome TEXT CHECK (outcome IN ('accepted', 'declined', 'expired', 'superseded'))
        );

        -- At most one LIVE (unresolved) offer per ride, and at most one
        -- per driver — a driver can't be offered two rides at once, and
        -- a ride can't have two competing live offers.
        CREATE UNIQUE INDEX ride_offers_one_live_per_ride ON ride_offers (ride_id) WHERE outcome IS NULL;
        CREATE UNIQUE INDEX ride_offers_one_live_per_driver ON ride_offers (driver_id) WHERE outcome IS NULL;
        CREATE INDEX ride_offers_expiry_idx ON ride_offers (expires_at) WHERE outcome IS NULL;
    `);
};

exports.down = (pgm) => {
    pgm.sql(`DROP TABLE IF EXISTS ride_offers;`);
};
