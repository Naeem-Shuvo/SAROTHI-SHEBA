const { query } = require('../../database/db');

const getAvailableRides = async (req, res) => {
    const decoded = req.user;
    //available rides dekhar access shudhu driver er ache
    if (!decoded || decoded.role !== 'driver') {
        return res.status(403).json({ msg: 'Only drivers can view available rides' });
    }

    //driver er current location query theke nitesi (frontend geolocation theke ashbe)
    const driverLat = parseFloat(req.query.driver_lat);
    const driverLng = parseFloat(req.query.driver_lng);

    //valid coordinate na paile strict nearby filtering possible na
    if (!Number.isFinite(driverLat) || !Number.isFinite(driverLng)) {
        return res.status(400).json({ msg: 'Driver location is required to fetch nearby rides' });
    }

    //basic coordinate range validation
    if (driverLat < -90 || driverLat > 90 || driverLng < -180 || driverLng > 180) {
        return res.status(400).json({ msg: 'Invalid driver coordinates' });
    }

    try {
        //requested ride gula distance hishebe nearest theke sort kore anchi
        //100km er baire hole list e ashbe na
        const result = await query(
            `SELECT r.ride_id, r.pickup_address, r.drop_address, r.requested_at,
                    r.pickup_latitude, r.pickup_longitude,
                    u.name AS passenger_name, u.phone_number AS passenger_phone,
                    vt.type_name AS vehicle_type,
                    (
                        6371 * 2 * ASIN(
                            SQRT(
                                POWER(SIN(RADIANS((r.pickup_latitude - $1) / 2)), 2) +
                                COS(RADIANS($1)) * COS(RADIANS(r.pickup_latitude)) *
                                POWER(SIN(RADIANS((r.pickup_longitude - $2) / 2)), 2)
                            )
                        )
                    ) AS distance_km
             FROM rides r
             JOIN users u ON r.passenger_id = u.user_id
             JOIN vehicle_types vt ON r.vehicle_type_id = vt.vehicle_type_id
             WHERE r.ride_status = 'requested'
               AND (
                    6371 * 2 * ASIN(
                        SQRT(
                            POWER(SIN(RADIANS((r.pickup_latitude - $1) / 2)), 2) +
                            COS(RADIANS($1)) * COS(RADIANS(r.pickup_latitude)) *
                            POWER(SIN(RADIANS((r.pickup_longitude - $2) / 2)), 2)
                        )
                    )
               ) <= 100
             ORDER BY distance_km ASC, r.requested_at ASC`,
            [driverLat, driverLng]
        );

        res.status(200).json({
            rides: result.rows,
        });
    } catch (error) {
        console.error('Error fetching available rides:', error.message);
        res.status(500).json({ msg: 'Internal server error' });
    }
};

module.exports = { getAvailableRides };
