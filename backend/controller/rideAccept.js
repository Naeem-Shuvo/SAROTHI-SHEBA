const { query } = require('../../database/db');

const acceptRide = async (req, res) => {

    //user ta driver kina check korchi
    const decoded = req.user;
    if (!decoded || decoded.role !== 'driver') {
        return res.status(403).json({ msg: 'Only drivers can accept rides' });
    }

    //ride ta valid kina check korchi
    const { ride_id } = req.body;
    if (!ride_id) {
        return res.status(400).json({ msg: 'ride_id is required' });
    }

    try {
        // driver er already active ride ase kina check korchi
        const activeRide = await query(
            `SELECT ride_id FROM rides 
             WHERE driver_id = $1 AND ride_status IN ('accepted', 'ongoing')`,
            [decoded.userId]
        );
        if (activeRide.rows.length > 0) {
            return res.status(400).json({ msg: 'You already have an active ride' });
        }

        // ride ta accept korchi (only if still 'requested')
        const result = await query(
            `UPDATE rides SET driver_id = $1, ride_status = 'accepted'
             WHERE ride_id = $2 AND ride_status = 'requested'
             RETURNING ride_id, passenger_id, driver_id, pickup_address, drop_address, ride_status`,
            [decoded.userId, ride_id]
        );

        // ride ta found na hole ba already accept hoye gele error pathacchi

        if (result.rows.length === 0) {
            return res.status(404).json({ msg: 'Ride not found or already accepted' });
        }

        // notify the passenger via socket that their ride was accepted
        if (global.io) {
            global.io.to(`user_${result.rows[0].passenger_id}`).emit('ride_accepted', result.rows[0]);
        }

        res.status(200).json({
            msg: 'Ride accepted',
            ride: result.rows[0],
        });
    } catch (error) {
        console.error('Error accepting ride:', error.message);
        res.status(500).json({ msg: 'Internal server error' });
    }
};

module.exports = { acceptRide };
