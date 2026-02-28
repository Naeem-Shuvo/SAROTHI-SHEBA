-- seed data for rideshare_db
-- run after schema.sql

-- vehicle types
INSERT INTO Vehicle_Types (type_name, base_fare, rate_per_km) VALUES
    ('Bike',            25.00,  8.00),
    ('Auto-Rickshaw',   40.00,  12.00),
    ('Car',             70.00,  18.00),
    ('SUV',             120.00, 25.00);

-- users
INSERT INTO Users (name, email, phone_number, password_hash) VALUES
    ('Rahim Uddin',     'rahim@example.com',    '+8801711000001', 'clerk_managed'),
    ('Karim Hossain',   'karim@example.com',    '+8801711000002', 'clerk_managed'),
    ('Farhan Ahmed',    'farhan@example.com',   '+8801711000003', 'clerk_managed'),
    ('Nusrat Jahan',    'nusrat@example.com',   '+8801711000004', 'clerk_managed'),
    ('Admin Sheba',     'admin@sarothi.com',    '+8801711000005', 'clerk_managed');

-- admin
INSERT INTO Admins (admin_id, admin_level) VALUES
    (5, 1);

-- drivers
INSERT INTO Drivers (user_id, license_number, rating_average, status) VALUES
    (1, 'DL-DHAKA-2024-001', 4.50, 'available'),
    (2, 'DL-DHAKA-2024-002', 4.20, 'available');

-- passengers
INSERT INTO Passengers (user_id, rating_average, total_distance) VALUES
    (3, 4.80, 0),
    (4, 4.60, 0);

-- vehicles
INSERT INTO Vehicles (driver_id, vehicle_type_id, plate_number, model, color) VALUES
    (1, 1, 'DHAKA-KA-11-2345', 'Honda CB Shine', 'Black'),
    (2, 3, 'DHAKA-GA-22-6789', 'Toyota Axio',    'White');

-- completed ride
INSERT INTO Rides (passenger_id, driver_id, vehicle_type_id,
    pickup_latitude, pickup_longitude, drop_latitude, drop_longitude,
    pickup_address, drop_address,
    requested_at, pickup_time, drop_time,
    distance_km, fare_amount, ride_status)
VALUES (
    3, 1, 1,
    23.7382, 90.3956, 23.7461, 90.3742,
    'Shahbag, Dhaka', 'Dhanmondi 27, Dhaka',
    NOW() - INTERVAL '2 hours',
    NOW() - INTERVAL '1 hour 50 minutes',
    NOW() - INTERVAL '1 hour 30 minutes',
    3.20, 50.60, 'completed'
);

-- requested ride
INSERT INTO Rides (passenger_id, driver_id, vehicle_type_id,
    pickup_latitude, pickup_longitude, drop_latitude, drop_longitude,
    pickup_address, drop_address,
    distance_km, fare_amount, ride_status)
VALUES (
    4, NULL, 3,
    23.8060, 90.3654, 23.7577, 90.3870,
    'Mirpur 10, Dhaka', 'Farmgate, Dhaka',
    6.50, 187.00, 'requested'
);

-- payment
INSERT INTO Payments (ride_id, amount, payment_method, transaction_id, payment_status, paid_at)
VALUES (1, 50.60, 'sslcommerz', 'TXN_SANDBOX_001', 'completed', NOW() - INTERVAL '1 hour 29 minutes');

-- rating
INSERT INTO Ratings (ride_id, rating_value, comment)
VALUES (1, 5, 'Great ride, very smooth! Thank you bhaiya.');

-- messages
INSERT INTO Messages (ride_id, sender_id, message_text, sent_at) VALUES
    (1, 3, 'Bhaiya, I am near the Shahbag intersection, wearing a blue shirt.', NOW() - INTERVAL '1 hour 52 minutes'),
    (1, 1, 'Coming in 2 minutes, please wait.', NOW() - INTERVAL '1 hour 51 minutes');

-- location logs
INSERT INTO Location_Logs (ride_id, latitude, longitude, recorded_at) VALUES
    (1, 23.7382, 90.3956, NOW() - INTERVAL '1 hour 50 minutes'),
    (1, 23.7415, 90.3880, NOW() - INTERVAL '1 hour 40 minutes'),
    (1, 23.7461, 90.3742, NOW() - INTERVAL '1 hour 30 minutes');
