// A general-purpose optimistic-concurrency counter, bumped on every
// meaningful ride update. The status-guard pattern rideAccept.js already
// used (UPDATE ... WHERE ride_status='requested') is real optimistic
// locking and stays exactly as it was — version is a second, more
// general signal (useful once Phase 4's dispatch offers need to detect
// "did anything about this ride change since I last read it", not just
// "did the status specifically change").

exports.shorthands = undefined;

exports.up = (pgm) => {
    pgm.sql(`ALTER TABLE rides ADD COLUMN version INT NOT NULL DEFAULT 0;`);
};

exports.down = (pgm) => {
    pgm.sql(`ALTER TABLE rides DROP COLUMN IF EXISTS version;`);
};
