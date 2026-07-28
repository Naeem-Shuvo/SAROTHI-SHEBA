const { query, withTransaction } = require('../../database/db');
const { enqueueEvent } = require('../../database/outbox');

// send a message in an active ride chat
const sendMessage = async (req, res) => {
    const decoded = req.user;
    const { ride_id } = req.params;
    const { message_text } = req.body;

    // validate that message text is not empty
    if (!message_text || message_text.trim() === '') {
        return res.status(400).json({ msg: 'Message text is required' });
    }

    try {
        // check if the ride exists and user is part of it
        const rideResult = await query('SELECT * FROM rides WHERE ride_id = $1', [ride_id]);
        if (rideResult.rows.length === 0) {
            return res.status(404).json({ msg: 'Ride not found' });
        }

        const ride = rideResult.rows[0];

        // only the passenger or driver of this ride can send messages
        if (decoded.userId !== ride.passenger_id && decoded.userId !== ride.driver_id) {
            return res.status(403).json({ msg: 'You are not part of this ride' });
        }

        // determine the recipient before the transaction — needed either way
        const recipientId = decoded.userId === ride.passenger_id ? ride.driver_id : ride.passenger_id;

        const newMessage = await withTransaction(async (client) => {
            const result = await client.query(
                `INSERT INTO messages (ride_id, sender_id, message_text)
                 VALUES ($1, $2, $3)
                 RETURNING message_id, ride_id, sender_id, message_text, sent_at`,
                [ride_id, decoded.userId, message_text.trim()]
            );
            const inserted = result.rows[0];

            // Fixes P1-8: previously emitted right after query() returned,
            // outside any transaction — a message could appear in the
            // recipient's chat even if something after it in the request
            // failed. Now it can only be seen after commit.
            if (recipientId) {
                await enqueueEvent(client, {
                    aggregateType: 'ride',
                    aggregateId: String(ride_id),
                    eventType: 'new_message',
                    rooms: [`user_${recipientId}`],
                    data: { ...inserted, sender_name: decoded.username }
                });
            }

            return inserted;
        }, { actorId: decoded.userId });

        res.status(201).json({ msg: 'Message sent', message: newMessage });
    } catch (error) {
        console.error('Error sending message:', error.message);
        res.status(500).json({ msg: 'Internal server error' });
    }
};

// get all messages for a specific ride
const getMessages = async (req, res) => {
    const decoded = req.user;
    const { ride_id } = req.params;

    try {
        // verify the ride exists
        const rideResult = await query('SELECT * FROM rides WHERE ride_id = $1', [ride_id]);
        if (rideResult.rows.length === 0) {
            return res.status(404).json({ msg: 'Ride not found' });
        }

        const ride = rideResult.rows[0];

        // only the passenger, driver, or admin can view messages
        if (decoded.userId !== ride.passenger_id && decoded.userId !== ride.driver_id && decoded.role !== 'admin') {
            return res.status(403).json({ msg: 'You are not part of this ride' });
        }

        // fetch all messages for this ride, ordered by time
        const result = await query(
            `SELECT m.message_id, m.message_text, m.sent_at, m.sender_id,
                    u.name AS sender_name
             FROM messages m
             JOIN users u ON m.sender_id = u.user_id
             WHERE m.ride_id = $1
             ORDER BY m.sent_at ASC`,
            [ride_id]
        );

        res.status(200).json({ messages: result.rows });
    } catch (error) {
        console.error('Error fetching messages:', error.message);
        res.status(500).json({ msg: 'Internal server error' });
    }
};

module.exports = { sendMessage, getMessages };
