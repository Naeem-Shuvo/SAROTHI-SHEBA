const { query, withTransaction } = require('../../database/db');

// Rewritten for the Phase 2 ratings schema (rater_id/ratee_id — see
// database/migrations/20260728130006_ratings-rebuild.js, fixes P1-13).
// The old table had no way to record WHO rated, so whoever rated first
// silently blocked the other participant forever. Now each participant
// rates independently; the database enforces "once per (ride, rater)"
// via a real unique index, not an app-level check-then-insert.
const rateRide = async (req, res) => {
    const decoded = req.user;
    const { ride_id } = req.params;
    const { rating_value, comment } = req.body;

    if (!rating_value || rating_value < 1 || rating_value > 5) {
        return res.status(400).json({ msg: 'Rating must be a number between 1 and 5' });
    }

    try {
        const rideResult = await query('SELECT * FROM rides WHERE ride_id = $1', [ride_id]);
        if (rideResult.rows.length === 0) {
            return res.status(404).json({ msg: 'Ride not found' });
        }

        const ride = rideResult.rows[0];

        if (ride.ride_status !== 'completed') {
            return res.status(400).json({ msg: 'You can only rate completed rides' });
        }

        if (decoded.userId !== ride.passenger_id && decoded.userId !== ride.driver_id) {
            return res.status(403).json({ msg: 'You were not a part of this ride' });
        }

        const raterId = decoded.userId;
        const rateeId = raterId === ride.passenger_id ? ride.driver_id : ride.passenger_id;

        try {
            await withTransaction(async (client) => {
                await client.query(
                    'INSERT INTO ratings (ride_id, rater_id, ratee_id, rating_value, comment) VALUES ($1, $2, $3, $4, $5)',
                    [ride_id, raterId, rateeId, rating_value, comment]
                );

                // Only drivers carry a running rating_count/rating_sum
                // (rating_average is a GENERATED column derived from
                // these — see the migration). Passenger-directed ratings
                // are recorded but not currently aggregated, matching
                // the original app's behavior, which never touched
                // passengers.rating_average either.
                if (rateeId === ride.driver_id) {
                    await client.query(
                        'UPDATE drivers SET rating_count = rating_count + 1, rating_sum = rating_sum + $1 WHERE user_id = $2',
                        [rating_value, rateeId]
                    );
                }
            }, { actorId: raterId });
        } catch (error) {
            // 23505 = unique_violation on ratings_one_per_rater_per_ride —
            // the database catching a double-rate race the app-level
            // pre-check above can't fully close on its own.
            if (error.code === '23505') {
                return res.status(400).json({ msg: 'You have already rated this ride' });
            }
            throw error;
        }

        res.status(200).json({ msg: 'Rating submitted successfully' });

    } catch (error) {
        console.error('Error rating ride:', error.message);
        res.status(500).json({ msg: 'Internal server error' });
    }
};

module.exports = { rateRide };
