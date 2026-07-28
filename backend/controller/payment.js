const crypto = require('crypto');
const { query, withTransaction } = require('../../database/db');
const config = require('../config');
const SSLCommerzPayment = require('sslcommerz-lts');

const store_id = config.SSLCOMMERZ_STORE_ID;
const store_passwd = config.SSLCOMMERZ_STORE_PASSWORD;
const is_live = config.SSLCOMMERZ_IS_SANDBOX !== 'true'; // false = sandbox mode

// initialize a payment session with SSLCommerz for a completed ride
const initPayment = async (req, res) => {
    const decoded = req.user;
    const { ride_id } = req.params;

    try {
        const rideResult = await query(
            `SELECT r.*, u.name AS passenger_name, u.email AS passenger_email, u.phone_number
             FROM rides r
             JOIN users u ON r.passenger_id = u.user_id
             WHERE r.ride_id = $1`,
            [ride_id]
        );

        if (rideResult.rows.length === 0) {
            return res.status(404).json({ msg: 'Ride not found' });
        }

        const ride = rideResult.rows[0];

        if (decoded.userId !== ride.passenger_id) {
            return res.status(403).json({ msg: 'Only the passenger can pay for this ride' });
        }

        if (ride.ride_status !== 'completed') {
            return res.status(400).json({ msg: 'Ride must be completed before payment' });
        }

        const existingPayment = await query('SELECT * FROM payments WHERE ride_id = $1', [ride_id]);

        if (existingPayment.rows.length > 0 && existingPayment.rows[0].payment_status === 'paid') {
            return res.status(400).json({ msg: 'This ride has already been paid for' });
        }

        const tran_id = `SAROTHI_${ride_id}_${Date.now()}`;

        const paymentData = {
            total_amount: parseFloat(ride.fare_amount),
            currency: 'BDT',
            tran_id: tran_id,
            success_url: `${config.BACKEND_URL}/payment/success`,
            fail_url: `${config.BACKEND_URL}/payment/fail`,
            cancel_url: `${config.BACKEND_URL}/payment/cancel`,
            ipn_url: `${config.BACKEND_URL}/payment/ipn`,
            shipping_method: 'NO',
            product_name: `Ride #${ride_id}`,
            product_category: 'Transportation',
            product_profile: 'general',
            cus_name: ride.passenger_name,
            cus_email: ride.passenger_email,
            cus_add1: ride.pickup_address || 'Dhaka',
            cus_city: 'Dhaka',
            cus_state: 'Dhaka',
            cus_postcode: '1000',
            cus_country: 'Bangladesh',
            cus_phone: ride.phone_number,
            ship_name: 'N/A',
            ship_add1: 'N/A',
            ship_city: 'N/A',
            ship_postcode: '1000',
            ship_country: 'Bangladesh',
            value_a: ride_id.toString(),
            value_b: decoded.userId.toString(),
        };

        const sslcz = new SSLCommerzPayment(store_id, store_passwd, is_live);
        const apiResponse = await sslcz.init(paymentData);

        // amount_minor stays in sync automatically via the Phase 2
        // sync_payment_amount_minor trigger — nothing here needs to set it.
        await withTransaction(async (client) => {
            if (existingPayment.rows.length > 0) {
                await client.query(
                    'UPDATE payments SET transaction_id = $1, payment_status = $2, payment_method = $3 WHERE ride_id = $4',
                    [tran_id, 'pending', 'sslcommerz', ride_id]
                );
            } else {
                await client.query(
                    'INSERT INTO payments (ride_id, amount, payment_method, transaction_id, payment_status) VALUES ($1, $2, $3, $4, $5)',
                    [ride_id, ride.fare_amount, 'sslcommerz', tran_id, 'pending']
                );
            }
        }, { actorId: decoded.userId });

        if (apiResponse?.GatewayPageURL) {
            res.status(200).json({ url: apiResponse.GatewayPageURL });
        } else {
            res.status(500).json({ msg: 'Failed to initialize SSLCommerz session' });
        }

    } catch (error) {
        console.error('Error initializing payment:', error.message);
        res.status(500).json({ msg: 'Internal server error' });
    }
};

function hashBody(body) {
    return crypto.createHash('sha256').update(JSON.stringify(body)).digest('hex');
}

// Shared by both settlement callbacks (SSLCommerz fires BOTH
// /payment/success — a browser redirect — and /payment/ipn — a
// server-to-server call — for the SAME transaction, by design). Fixes
// P1-10: no idempotency guard before meant a duplicate callback re-ran the
// same UPDATE (harmless in isolation here, but the real hole was that
// nothing ever verified the gateway's reported amount matched what we
// actually charged — a forged or manipulated callback with a different
// `amount` was accepted blindly). Now: guarded by a real idempotency key
// so only the first callback for a given transaction does anything, under
// SERIALIZABLE so a race between /success and /ipn arriving simultaneously
// can't both "win", and the amount is verified against amount_minor before
// the payment is ever marked paid.
async function settlePayment({ tran_id, val_id, reportedAmount, method }) {
    return withTransaction(async (client) => {
        const idemKey = `sslcz:${tran_id}`;
        const { rowCount } = await client.query(
            `INSERT INTO idempotency_keys (key, scope, request_hash, expires_at)
             VALUES ($1, 'payment', $2, now() + interval '7 days')
             ON CONFLICT (key) DO NOTHING`,
            [idemKey, hashBody({ tran_id, val_id })]
        );
        if (rowCount === 0) {
            return { alreadySettled: true };
        }

        const sslcz = new SSLCommerzPayment(store_id, store_passwd, is_live);
        const validationResponse = await sslcz.validate({ val_id });

        if (validationResponse.status !== 'VALID' && validationResponse.status !== 'VALIDATED') {
            await client.query(
                "UPDATE payments SET payment_status = 'failed' WHERE transaction_id = $1 AND payment_status <> 'paid'",
                [tran_id]
            );
            return { verified: false };
        }

        const paymentRow = await client.query(
            'SELECT ride_id, amount_minor FROM payments WHERE transaction_id = $1',
            [tran_id]
        );
        if (paymentRow.rows.length === 0) {
            return { verified: true, matched: false, reason: 'no matching payment row' };
        }

        const expectedMinor = Number(paymentRow.rows[0].amount_minor);
        const reportedMinor = Math.round(Number(reportedAmount) * 100);

        if (reportedMinor !== expectedMinor) {
            // Never trust the gateway's number blindly — this is exactly
            // the check the original code never performed.
            await client.query(
                "UPDATE payments SET payment_status = 'failed' WHERE transaction_id = $1 AND payment_status <> 'paid'",
                [tran_id]
            );
            return { verified: true, matched: false, expectedMinor, reportedMinor };
        }

        await client.query(
            `UPDATE payments SET payment_status = 'paid', payment_method = $1, paid_at = NOW(),
                    gateway_amount_minor = $2, verified_at = now()
             WHERE transaction_id = $3`,
            [method || 'sslcommerz', reportedMinor, tran_id]
        );

        return { verified: true, matched: true };
    }, { isolation: 'SERIALIZABLE', maxRetries: 5 });
}

// handle SSLCommerz success callback (POST from SSLCommerz gateway)
const paymentSuccess = async (req, res) => {
    const { tran_id, val_id, amount, card_type } = req.body;

    try {
        const result = await settlePayment({ tran_id, val_id, reportedAmount: amount, method: card_type });

        if (result.alreadySettled || (result.verified && result.matched)) {
            res.redirect(`${config.FRONTEND_URL}/rides/history?payment=success`);
        } else {
            res.redirect(`${config.FRONTEND_URL}/rides/history?payment=failed`);
        }
    } catch (error) {
        console.error('Payment success validation error:', error.message);
        res.redirect(`${config.FRONTEND_URL}/rides/history?payment=error`);
    }
};

// handle SSLCommerz failure callback
const paymentFail = async (req, res) => {
    const { tran_id } = req.body;

    try {
        // Never downgrades a payment a concurrent /success or /ipn call
        // already marked paid — out-of-order webhook delivery is normal.
        await query(
            "UPDATE payments SET payment_status = 'failed' WHERE transaction_id = $1 AND payment_status <> 'paid'",
            [tran_id]
        );
    } catch (error) {
        console.error('Payment fail handler error:', error.message);
    }

    res.redirect(`${config.FRONTEND_URL}/rides/history?payment=failed`);
};

// handle SSLCommerz cancellation callback
const paymentCancel = async (req, res) => {
    const { tran_id } = req.body;

    try {
        await query(
            "UPDATE payments SET payment_status = 'cancelled' WHERE transaction_id = $1 AND payment_status <> 'paid'",
            [tran_id]
        );
    } catch (error) {
        console.error('Payment cancel handler error:', error.message);
    }

    res.redirect(`${config.FRONTEND_URL}/rides/history?payment=cancelled`);
};

// SSLCommerz IPN (Instant Payment Notification) — server-to-server validation
const paymentIPN = async (req, res) => {
    const { tran_id, val_id, status } = req.body;

    try {
        if (status === 'VALID') {
            await settlePayment({ tran_id, val_id, reportedAmount: req.body.amount, method: undefined });
        }
    } catch (error) {
        console.error('IPN handler error:', error.message);
    }

    // always respond 200 to SSLCommerz IPN
    res.status(200).json({ msg: 'IPN received' });
};

// get payment status for a specific ride
const getPaymentStatus = async (req, res) => {
    const { ride_id } = req.params;

    try {
        const result = await query('SELECT * FROM payments WHERE ride_id = $1', [ride_id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ msg: 'No payment found for this ride' });
        }

        res.status(200).json({ payment: result.rows[0] });
    } catch (error) {
        console.error('Error fetching payment status:', error.message);
        res.status(500).json({ msg: 'Internal server error' });
    }
};

// handle manual cash payment check-out
const cashPayment = async (req, res) => {
    const { ride_id } = req.params;
    const decoded = req.user;

    try {
        const rideResult = await query('SELECT passenger_id, ride_status, fare_amount FROM rides WHERE ride_id = $1', [ride_id]);
        if (rideResult.rows.length === 0) return res.status(404).json({ msg: 'Ride not found' });

        if (decoded.userId !== rideResult.rows[0].passenger_id) {
            return res.status(403).json({ msg: 'Only the passenger can pay for this ride' });
        }

        // payments.ride_id is UNIQUE — ON CONFLICT DO UPDATE replaces the
        // old check-then-branch (SELECT, then INSERT-or-UPDATE), which was
        // itself a TOCTOU pattern, with one atomic upsert.
        await withTransaction(async (client) => {
            await client.query(
                `INSERT INTO payments (ride_id, amount, payment_method, payment_status, paid_at)
                 VALUES ($1, $2, 'cash', 'paid', NOW())
                 ON CONFLICT (ride_id) DO UPDATE
                    SET payment_status = 'paid', payment_method = 'cash', paid_at = NOW()
                 WHERE payments.payment_status <> 'paid'`,
                [ride_id, rideResult.rows[0].fare_amount]
            );
        }, { actorId: decoded.userId });

        res.status(200).json({ msg: 'Paid with cash successfully' });
    } catch (error) {
        console.error('Error with cash payment:', error.message);
        res.status(500).json({ msg: 'Internal server error' });
    }
};

module.exports = { initPayment, paymentSuccess, paymentFail, paymentCancel, paymentIPN, getPaymentStatus, cashPayment };
