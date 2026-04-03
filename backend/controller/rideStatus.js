const { query } = require('../../database/db');

const updateRideStatus = async (req, res) => {
    const decoded = req.user;
    const { ride_id } = req.params;
    const { status, distance_km } = req.body;

    //status pass kora lagbe
    if (!status) {
        return res.status(400).json({ msg: 'status is required' });
    }

    try {
        //ride ta valid kina check korchi
        const rideResult = await query('SELECT * FROM rides WHERE ride_id = $1', [ride_id]);
        if (rideResult.rows.length === 0) {
            return res.status(404).json({ msg: 'Ride not found' });
        }

        const ride = rideResult.rows[0];

        //shudhumatro driver e ongoing ba completed e change korte parbe status 
        if ((status === 'ongoing' || status === 'completed') && decoded.userId !== ride.driver_id) {
            return res.status(403).json({ msg: 'Only the assigned driver can update this ride' });
        }

        //completed hole distance_km pass kora lagbe
        if (status === 'completed') {
            if (!distance_km || distance_km <= 0) {
                return res.status(400).json({ msg: 'distance_km is required to complete a ride' });
            }

            // SQL procedure diye ride update korchi
            await query('CALL complete_ride($1, $2)', [ride_id, distance_km]);

        } else {
            // completed na hole shudhu status update korchi
            await query('UPDATE rides SET ride_status = $1 WHERE ride_id = $2', [status, ride_id]);
        }

        res.status(200).json({ msg: `Ride status updated to '${status}'` });

    } catch (error) {
        console.error('Error updating ride status:', error.message);
        res.status(500).json({ msg: 'Internal server error' });
    }
};

module.exports = { updateRideStatus };
