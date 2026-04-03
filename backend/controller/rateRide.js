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

        //ek ride e ekbar e rating deya jabe
        const existingRating = await query('SELECT * FROM ratings WHERE ride_id = $1', [ride_id]);
        if (existingRating.rows.length > 0) {
            return res.status(400).json({ msg: 'This ride has already been rated' });
        }

        //rating insert korchi
        await query(
            'INSERT INTO ratings (ride_id, rating_value, comment) VALUES ($1, $2, $3)',
            [ride_id, rating_value, comment]
        );

        //driver er new average rating calculate korchi ratings table theke
        const avgResult = await query(
            `SELECT AVG(rating_value) as new_avg 
             FROM ratings r 
             JOIN rides rd ON r.ride_id = rd.ride_id 
             WHERE rd.driver_id = $1`,
            [ride.driver_id]
        );

        //average rating update korchi
        if (avgResult.rows.length > 0 && avgResult.rows[0].new_avg) {
            const newAvg = parseFloat(avgResult.rows[0].new_avg).toFixed(2);
            await query(
                'UPDATE drivers SET rating_average = $1 WHERE user_id = $2',
                [newAvg, ride.driver_id]
            );
        }

        res.status(200).json({ msg: 'Rating submitted successfully' });

    } catch (error) {
        console.error('Error rating ride:', error.message);
        res.status(500).json({ msg: 'Internal server error' });
    }
};

module.exports = { rateRide };
