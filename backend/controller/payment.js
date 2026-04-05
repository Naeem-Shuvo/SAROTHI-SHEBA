const { query } = require('../../database/db');
const SSLCommerzPayment = require('sslcommerz-lts');

// read SSLCommerz credentials from environment variables
const store_id = process.env.SSLCOMMERZ_STORE_ID;
const store_passwd = process.env.SSLCOMMERZ_STORE_PASSWORD;
const is_live = process.env.SSLCOMMERZ_IS_SANDBOX !== 'true'; // false = sandbox mode

// initialize a payment session with SSLCommerz for a completed ride
const initPayment = async (req, res) => {
    const decoded = req.user;
    const { ride_id } = req.params;

    try {
        // fetch the ride details and validate it exists and is completed
        //oi ride er passenger er detail fetch
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

        // only the passenger of this ride can pay
        if (decoded.userId !== ride.passenger_id) {
            return res.status(403).json({ msg: 'Only the passenger can pay for this ride' });
        }

        // ride must be completed before payment
        if (ride.ride_status !== 'completed') {
            return res.status(400).json({ msg: 'Ride must be completed before payment' });
        }

        // check if payment already exists and is completed
        const existingPayment = await query(
            'SELECT * FROM payments WHERE ride_id = $1',
            [ride_id]
        );

        if (existingPayment.rows.length > 0 && existingPayment.rows[0].payment_status === 'paid') {
            return res.status(400).json({ msg: 'This ride has already been paid for' });
        }

        // generate a unique transaction ID for this payment
        const tran_id = `SAROTHI_${ride_id}_${Date.now()}`;

        // prepare the SSLCommerz payment data object
        const paymentData = {
            total_amount: parseFloat(ride.fare_amount),
            currency: 'BDT',
            tran_id: tran_id,
            success_url: `${process.env.BACKEND_URL}/payment/success`,
            fail_url: `${process.env.BACKEND_URL}/payment/fail`,
            cancel_url: `${process.env.BACKEND_URL}/payment/cancel`,
            ipn_url: `${process.env.BACKEND_URL}/payment/ipn`,
            shipping_method: 'NO',
            product_name: `Ride #${ride_id}`,
            product_category: 'Transportation',
            product_profile: 'general',
            cus_name: ride.passenger_name,
            cus_email: ride.passenger_email,
            cus_add1: ride.pickup_address || 'Dhaka',
            
            //default dhaka rakhtesi, mandatory field tai
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
            value_a: ride_id.toString(),        // store ride_id to retrieve later
            value_b: decoded.userId.toString(),  // store passenger user_id
        };

        // initialize the SSLCommerz session
        const sslcz = new SSLCommerzPayment(store_id, store_passwd, is_live);
        const apiResponse = await sslcz.init(paymentData);

        // update the payment record with the new transaction ID and pending status
        if (existingPayment.rows.length > 0) {
            await query(
                'UPDATE payments SET transaction_id = $1, payment_status = $2, payment_method = $3 WHERE ride_id = $4',
                [tran_id, 'pending', 'sslcommerz', ride_id]
            );
        } else {
            //jodi due rakhe
            await query(
                'INSERT INTO payments (ride_id, amount, payment_method, transaction_id, payment_status) VALUES ($1, $2, $3, $4, $5)',
                [ride_id, ride.fare_amount, 'sslcommerz', tran_id, 'pending']
            );
        }

        // return the SSLCommerz gateway URL for the frontend to redirect to
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

// handle SSLCommerz success callback (POST from SSLCommerz gateway)
const paymentSuccess = async (req, res) => {
    const { tran_id, val_id, amount, card_type, status } = req.body;

    try {
        // validate the transaction with SSLCommerz
        const sslcz = new SSLCommerzPayment(store_id, store_passwd, is_live);
        const validationResponse = await sslcz.validate({ val_id });

        // check if validation was successful
        if (validationResponse.status === 'VALID' || validationResponse.status === 'VALIDATED') {
            // update the payment record to mark it as paid
            await query(
                `UPDATE payments SET payment_status = 'paid', payment_method = $1, paid_at = NOW()
                 WHERE transaction_id = $2`,
                [card_type || 'sslcommerz', tran_id]
            );

            // redirect user back to the frontend with a success flag
            res.redirect(`${process.env.FRONTEND_URL}/rides/history?payment=success`);
        } else {
            // validation failed — mark as failed in our DB
            await query(
                "UPDATE payments SET payment_status = 'failed' WHERE transaction_id = $1",
                [tran_id]
            );
            res.redirect(`${process.env.FRONTEND_URL}/rides/history?payment=failed`);
        }
    } catch (error) {
        console.error('Payment success validation error:', error.message);
        res.redirect(`${process.env.FRONTEND_URL}/rides/history?payment=error`);
    }
};

// handle SSLCommerz failure callback
const paymentFail = async (req, res) => {
    const { tran_id } = req.body;

    try {
        // mark the payment as failed in our database
        await query(
            "UPDATE payments SET payment_status = 'failed' WHERE transaction_id = $1",
            [tran_id]
        );
    } catch (error) {
        console.error('Payment fail handler error:', error.message);
    }

    // redirect back to frontend with failure flag
    res.redirect(`${process.env.FRONTEND_URL}/rides/history?payment=failed`);
};

// handle SSLCommerz cancellation callback
const paymentCancel = async (req, res) => {
    const { tran_id } = req.body;

    try {
        // mark the payment as cancelled in our database
        await query(
            "UPDATE payments SET payment_status = 'cancelled' WHERE transaction_id = $1",
            [tran_id]
        );
    } catch (error) {
        console.error('Payment cancel handler error:', error.message);
    }

    // redirect back to frontend
    res.redirect(`${process.env.FRONTEND_URL}/rides/history?payment=cancelled`);
};

// SSLCommerz IPN (Instant Payment Notification) — server-to-server validation
const paymentIPN = async (req, res) => {
    const { tran_id, val_id, status } = req.body;

    try {
        if (status === 'VALID') {
            // validate with SSLCommerz server
            const sslcz = new SSLCommerzPayment(store_id, store_passwd, is_live);
            const validationResponse = await sslcz.validate({ val_id });

            if (validationResponse.status === 'VALID' || validationResponse.status === 'VALIDATED') {
                await query(
                    "UPDATE payments SET payment_status = 'paid', paid_at = NOW() WHERE transaction_id = $1",
                    [tran_id]
                );
            }
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
        const result = await query(
            'SELECT * FROM payments WHERE ride_id = $1',
            [ride_id]
        );

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
        const rideResult = await query('SELECT passenger_id, ride_status FROM rides WHERE ride_id = $1', [ride_id]);
        if (rideResult.rows.length === 0) return res.status(404).json({ msg: 'Ride not found' });
        
        if (decoded.userId !== rideResult.rows[0].passenger_id) {
            return res.status(403).json({ msg: 'Only the passenger can pay for this ride' });
        }

        const existingPayment = await query('SELECT * FROM payments WHERE ride_id = $1', [ride_id]);
        
        if (existingPayment.rows.length > 0) {
            await query(
                `UPDATE payments SET payment_status = 'paid', payment_method = 'cash', paid_at = NOW() WHERE ride_id = $1`,
                [ride_id]
            );
        } else {
            // Failsafe mostly, SQL trigger should have made the row already.
            await query(
                `INSERT INTO payments (ride_id, amount, payment_method, payment_status, paid_at) VALUES ($1, (SELECT fare_amount FROM rides WHERE ride_id=$1), 'cash', 'paid', NOW())`,
                [ride_id]
            );
        }

        res.status(200).json({ msg: 'Paid with cash successfully' });
    } catch (error) {
        console.error('Error with cash payment:', error.message);
        res.status(500).json({ msg: 'Internal server error' });
    }
};

module.exports = { initPayment, paymentSuccess, paymentFail, paymentCancel, paymentIPN, getPaymentStatus, cashPayment };
