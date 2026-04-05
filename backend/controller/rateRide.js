const { query } = require('../../database/db');

const rateRide = async (req, res) => {
    const decoded = req.user;
    const { ride_id } = req.params;
    const { rating_value, comment } = req.body;

    //rating 1-5 er moddhe hoite hobe
    if (!rating_value || rating_value < 1 || rating_value > 5) {
        return res.status(400).json({ msg: 'Rating must be a number between 1 and 5' });
    }

    try {
        //ride ta valid kina check korchi
        const rideResult = await query('SELECT * FROM rides WHERE ride_id = $1', [ride_id]);
        if (rideResult.rows.length === 0) {
            return res.status(404).json({ msg: 'Ride not found' });
        }

        const ride = rideResult.rows[0];

        //shudhu completed ride e rating deya jabe
        if (ride.ride_status !== 'completed') {
            return res.status(400).json({ msg: 'You can only rate completed rides' });
        }

        //oi ride e connected passenger or driver e ekmatro rating dite parbe
        if (decoded.userId !== ride.passenger_id && decoded.userId !== ride.driver_id) {
            return res.status(403).json({ msg: 'You were not a part of this ride' });
        }

        //ek ride e ekbar e rating deya jabe (ekjoner jonno)
        const existingRating = await query('SELECT * FROM ratings WHERE ride_id = $1 AND rater_id = $2', [ride_id, decoded.userId]);
        if (existingRating.rows.length > 0) {
            return res.status(400).json({ msg: 'You have already rated this ride' });
        }

        //rating insert korchi rater_id shoho
        await query(
            'INSERT INTO ratings (ride_id, rater_id, rating_value, comment) VALUES ($1, $2, $3, $4)',
            [ride_id, decoded.userId, rating_value, comment]
        );

        //kar rating update hobe seta check korchi (driver naki passenger)
        const isRaterPassenger = decoded.userId === ride.passenger_id;
        const ratedUserId = isRaterPassenger ? ride.driver_id : ride.passenger_id;
        const targetTable = isRaterPassenger ? 'drivers' : 'passengers';

        // average calculate korchi current role wise
        let avgQuery;
        if (isRaterPassenger) {
            // driver er avg calculate korbo jara passenger ra dise
            avgQuery = `
                SELECT AVG(r.rating_value) as new_avg 
                FROM ratings r 
                JOIN rides rd ON r.ride_id = rd.ride_id 
                WHERE rd.driver_id = $1 AND r.rater_id = rd.passenger_id
            `;
        } else {
            // passenger er avg calculate korbo jara driver ra dise
            avgQuery = `
                SELECT AVG(r.rating_value) as new_avg 
                FROM ratings r 
                JOIN rides rd ON r.ride_id = rd.ride_id 
                WHERE rd.passenger_id = $1 AND r.rater_id = rd.driver_id
            `;
        }

        const avgResult = await query(avgQuery, [ratedUserId]);

        // average rating update korchi target table e (drivers or passengers)
        if (avgResult.rows.length > 0 && avgResult.rows[0].new_avg) {
            const newAvg = parseFloat(avgResult.rows[0].new_avg).toFixed(2);
            await query(
                `UPDATE ${targetTable} SET rating_average = $1 WHERE user_id = $2`,
                [newAvg, ratedUserId]
            );
        }

        res.status(200).json({ msg: 'Rating submitted successfully' });

    } catch (error) {
        console.error('Error rating ride:', error.message);
        res.status(500).json({ msg: 'Internal server error' });
    }
};

module.exports = { rateRide };
