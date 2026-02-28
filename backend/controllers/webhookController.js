const { Webhook } = require('svix');
const pool = require('../db/pool');

// handle clerk webhook
async function handleClerkWebhook(req, res) {
    const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

    if (!WEBHOOK_SECRET) {
        console.error('CLERK_WEBHOOK_SECRET not set');
        return res.status(500).json({ error: 'Server misconfigured' });
    }

    // get svix headers
    const svix_id = req.headers['svix-id'];
    const svix_timestamp = req.headers['svix-timestamp'];
    const svix_signature = req.headers['svix-signature'];

    if (!svix_id || !svix_timestamp || !svix_signature) {
        return res.status(400).json({ error: 'Missing svix headers' });
    }

    // verify signature
    const wh = new Webhook(WEBHOOK_SECRET);
    let event;

    try {
        event = wh.verify(JSON.stringify(req.body), {
            'svix-id': svix_id,
            'svix-timestamp': svix_timestamp,
            'svix-signature': svix_signature,
        });
    } catch (err) {
        console.error('Webhook verification failed:', err.message);
        return res.status(400).json({ error: 'Invalid signature' });
    }

    const { type } = event;
    const data = event.data;

    try {
        if (type === 'user.created') {
            const { id, email_addresses, first_name, last_name, phone_numbers } = data;

            const email = email_addresses?.[0]?.email_address || '';
            const name = [first_name, last_name].filter(Boolean).join(' ') || 'Unknown';
            const phone = phone_numbers?.[0]?.phone_number || '';

            await pool.query(
                `INSERT INTO Users (clerk_id, name, email, phone_number, password_hash)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (clerk_id) DO NOTHING`,
                [id, name, email, phone, 'clerk_managed']
            );

            console.log(`User created: ${name} (${email})`);
        }

        if (type === 'user.updated') {
            const { id, email_addresses, first_name, last_name, phone_numbers } = data;

            const email = email_addresses?.[0]?.email_address || '';
            const name = [first_name, last_name].filter(Boolean).join(' ') || 'Unknown';
            const phone = phone_numbers?.[0]?.phone_number || '';

            await pool.query(
                `UPDATE Users SET name = $1, email = $2, phone_number = $3, updated_at = NOW()
         WHERE clerk_id = $4`,
                [name, email, phone, id]
            );

            console.log(`User updated: ${name} (${email})`);
        }

        if (type === 'user.deleted') {
            const { id } = data;
            console.log(`User deletion event for clerk_id: ${id}`);
        }

        res.status(200).json({ received: true });
    } catch (err) {
        console.error('Webhook processing error:', err.message);
        res.status(500).json({ error: 'Internal server error' });
    }
}

module.exports = { handleClerkWebhook };
