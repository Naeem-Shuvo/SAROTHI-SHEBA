const { updateDriverLocation } = require('../matching');

// A driver publishes their current position (and optionally toggles
// availability). Feeds BOTH matchers built in Phase 4: driver_locations
// (PostGIS, durable) and Valkey's H3-cell sets (hot path). The frontend
// would call this on a heartbeat (every few seconds while a driver has
// the app open and marked available) — see
// ULTIMATE_REFINEMENT_PLAN.md §4.7. Not wired into any page yet; that's
// Phase 8's job.
//
// A REST endpoint rather than a socket event deliberately: sockets carry
// no verified identity until Phase 5 (§1.4 P1-2), so there is currently
// no reliable way to know WHICH driver a socket message came from. Every
// REST request already does via authMiddleware's JWT verification.
const updateLocation = async (req, res) => {
    const decoded = req.user;
    if (!decoded || decoded.role !== 'driver') {
        return res.status(403).json({ msg: 'Only drivers can update their location' });
    }

    const { lat, lng, is_available } = req.body;
    if (typeof lat !== 'number' || typeof lng !== 'number') {
        return res.status(400).json({ msg: 'lat and lng (numbers) are required' });
    }
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        return res.status(400).json({ msg: 'lat/lng out of range' });
    }

    try {
        await updateDriverLocation(decoded.userId, lat, lng, is_available !== false);
        res.status(200).json({ msg: 'Location updated' });
    } catch (error) {
        console.error('Error updating driver location:', error.message);
        res.status(500).json({ msg: 'Internal server error' });
    }
};

module.exports = { updateLocation };
