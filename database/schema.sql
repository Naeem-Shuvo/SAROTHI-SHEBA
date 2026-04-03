-- 1. Independent Tables (No Foreign Keys)
CREATE TABLE Users (
    user_id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone_number VARCHAR(50) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP 
);

CREATE TABLE Vehicle_Types (
    vehicle_type_id SERIAL PRIMARY KEY,
    type_name TEXT NOT NULL,
    base_fare DECIMAL(10, 2) NOT NULL,
    rate_per_km DECIMAL(10, 2) NOT NULL
);

-- 2. Role Tables (Inherit from Users)
CREATE TABLE Admins (
    admin_id INT PRIMARY KEY REFERENCES Users(user_id), --emneo handled cz token chara admin houa jabe na, so reg 1st
    admin_level INT NOT NULL
);

CREATE TABLE Drivers (
    user_id INT PRIMARY KEY REFERENCES Users(user_id),
    license_number TEXT UNIQUE NOT NULL,
    rating_average DECIMAL(3, 2),
    status VARCHAR(20)
);

CREATE TABLE Passengers (
    user_id INT PRIMARY KEY REFERENCES Users(user_id),
    rating_average DECIMAL(3, 2),
    total_distance DECIMAL(10, 2) DEFAULT 0
);

-- 3. Asset Tables
CREATE TABLE Vehicles (
    vehicle_id SERIAL PRIMARY KEY,
    driver_id INT NOT NULL REFERENCES Drivers(user_id),
    vehicle_type_id INT NOT NULL REFERENCES Vehicle_Types(vehicle_type_id),
    plate_number TEXT UNIQUE NOT NULL,
    model TEXT,
    color TEXT
);

CREATE TABLE driver_applications (
    application_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES Users(user_id),
    license_number TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    applied_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
);


-- 4. Transactional Tables (The Core Process)
CREATE TABLE Rides (
    ride_id SERIAL PRIMARY KEY,
    passenger_id INT NOT NULL REFERENCES Passengers(user_id),
    driver_id INT REFERENCES Drivers(user_id),
    vehicle_type_id INT NOT NULL REFERENCES Vehicle_Types(vehicle_type_id),
    
    -- Locations
    pickup_latitude DECIMAL(9, 6) NOT NULL,
    pickup_longitude DECIMAL(9, 6) NOT NULL,
    drop_latitude DECIMAL(9, 6) NOT NULL,
    drop_longitude DECIMAL(9, 6) NOT NULL,
    pickup_address TEXT,
    drop_address TEXT,
    
    -- Timestamps
    requested_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    pickup_time TIMESTAMPTZ,
    drop_time TIMESTAMPTZ,
    
    distance_km DECIMAL(10, 2),
    fare_amount DECIMAL(10, 2),
    ride_status VARCHAR(20) -- e.g., 'requested', 'ongoing', 'completed'
);

-- 5. Dependent Tables (Referencing Rides)
CREATE TABLE Payments (
    payment_id SERIAL PRIMARY KEY,
    ride_id INT UNIQUE NOT NULL REFERENCES Rides(ride_id),
    amount DECIMAL(10, 2) NOT NULL,
    payment_method TEXT,
    transaction_id TEXT,
    payment_status TEXT,
    paid_at TIMESTAMPTZ
);

CREATE TABLE Ratings (
    rating_id SERIAL PRIMARY KEY,
    ride_id INT NOT NULL REFERENCES Rides(ride_id),
    rating_value INT CHECK (rating_value BETWEEN 1 AND 5),
    comment TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE Messages (
    message_id SERIAL PRIMARY KEY,
    ride_id INT NOT NULL REFERENCES Rides(ride_id),
    sender_id INT NOT NULL REFERENCES Users(user_id),
    message_text TEXT,
    sent_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE Location_Logs (
    log_id SERIAL PRIMARY KEY,
    ride_id INT NOT NULL REFERENCES Rides(ride_id),
    latitude DECIMAL(9, 6) NOT NULL,
    longitude DECIMAL(9, 6) NOT NULL,
    recorded_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 6. Sample Data (safe to run multiple times)

-- -- Users
-- INSERT INTO Users (name, email, phone_number, password_hash)
-- SELECT 'System Admin', 'admin@sarothisheba.com', '+8801700000001', 'hashed_admin_pass'
-- WHERE NOT EXISTS (
--         SELECT 1 FROM Users WHERE email = 'admin@sarothisheba.com'
-- );

-- INSERT INTO Users (name, email, phone_number, password_hash)
-- SELECT 'Driver One', 'driver1@sarothisheba.com', '+8801700000002', 'hashed_driver1_pass'
-- WHERE NOT EXISTS (
--         SELECT 1 FROM Users WHERE email = 'driver1@sarothisheba.com'
-- );

-- INSERT INTO Users (name, email, phone_number, password_hash)
-- SELECT 'Passenger One', 'passenger1@sarothisheba.com', '+8801700000003', 'hashed_passenger1_pass'
-- WHERE NOT EXISTS (
--         SELECT 1 FROM Users WHERE email = 'passenger1@sarothisheba.com'
-- );

-- -- Vehicle types
-- INSERT INTO Vehicle_Types (type_name, base_fare, rate_per_km)
-- SELECT 'Bike', 30.00, 12.00
-- WHERE NOT EXISTS (
--         SELECT 1 FROM Vehicle_Types WHERE type_name = 'Bike'
-- );

-- INSERT INTO Vehicle_Types (type_name, base_fare, rate_per_km)
-- SELECT 'Car', 60.00, 20.00
-- WHERE NOT EXISTS (
--         SELECT 1 FROM Vehicle_Types WHERE type_name = 'Car'
-- );

-- -- Role tables
-- INSERT INTO Admins (admin_id, admin_level)
-- SELECT u.user_id, 1
-- FROM Users u
-- WHERE u.email = 'admin@sarothisheba.com'
--     AND NOT EXISTS (
--             SELECT 1 FROM Admins a WHERE a.admin_id = u.user_id
--     );

-- INSERT INTO Drivers (user_id, license_number, rating_average, status)
-- SELECT u.user_id, 'DHK-DR-1001', 4.80, 'available'
-- FROM Users u
-- WHERE u.email = 'driver1@sarothisheba.com'
--     AND NOT EXISTS (
--             SELECT 1 FROM Drivers d WHERE d.user_id = u.user_id
--     );

-- INSERT INTO Passengers (user_id, rating_average, total_distance)
-- SELECT u.user_id, 4.70, 52.50
-- FROM Users u
-- WHERE u.email = 'passenger1@sarothisheba.com'
--     AND NOT EXISTS (
--             SELECT 1 FROM Passengers p WHERE p.user_id = u.user_id
--     );

-- -- Assets
-- INSERT INTO Vehicles (driver_id, vehicle_type_id, plate_number, model, color)
-- SELECT d.user_id, vt.vehicle_type_id, 'DHAKA-METRO-HA-123456', 'Honda CB Hornet', 'Red'
-- FROM Drivers d
-- JOIN Users u ON u.user_id = d.user_id
-- JOIN Vehicle_Types vt ON vt.type_name = 'Bike'
-- WHERE u.email = 'driver1@sarothisheba.com'
--     AND NOT EXISTS (
--             SELECT 1 FROM Vehicles v WHERE v.plate_number = 'DHAKA-METRO-HA-123456'
--     );

-- -- Transactional data
-- INSERT INTO Rides (
--         passenger_id,
--         driver_id,
--         vehicle_type_id,
--         pickup_latitude,
--         pickup_longitude,
--         drop_latitude,
--         drop_longitude,
--         pickup_address,
--         drop_address,
--         pickup_time,
--         drop_time,
--         distance_km,
--         fare_amount,
--         ride_status
-- )
-- SELECT
--         p.user_id,
--         d.user_id,
--         vt.vehicle_type_id,
--         23.810300,
--         90.412500,
--         23.780600,
--         90.279200,
--         'Shahbag, Dhaka',
--         'Dhanmondi 27, Dhaka',
--         CURRENT_TIMESTAMP - INTERVAL '30 minutes',
--         CURRENT_TIMESTAMP - INTERVAL '5 minutes',
--         8.70,
--         134.40,
--         'completed'
-- FROM Passengers p
-- JOIN Users pu ON pu.user_id = p.user_id
-- JOIN Drivers d ON TRUE
-- JOIN Users du ON du.user_id = d.user_id
-- JOIN Vehicle_Types vt ON vt.type_name = 'Bike'
-- WHERE pu.email = 'passenger1@sarothisheba.com'
--     AND du.email = 'driver1@sarothisheba.com'
--     AND NOT EXISTS (
--             SELECT 1
--             FROM Rides r
--             WHERE r.pickup_address = 'Shahbag, Dhaka'
--                 AND r.drop_address = 'Dhanmondi 27, Dhaka'
--                 AND r.passenger_id = p.user_id
--     );

-- -- Dependent data
-- INSERT INTO Payments (ride_id, amount, payment_method, transaction_id, payment_status, paid_at)
-- SELECT r.ride_id, r.fare_amount, 'cash', 'TXN-SAMPLE-1001', 'paid', CURRENT_TIMESTAMP - INTERVAL '4 minutes'
-- FROM Rides r
-- WHERE r.pickup_address = 'Shahbag, Dhaka'
--     AND r.drop_address = 'Dhanmondi 27, Dhaka'
--     AND NOT EXISTS (
--             SELECT 1 FROM Payments p WHERE p.ride_id = r.ride_id
--     )
-- LIMIT 1;

-- INSERT INTO Ratings (ride_id, rating_value, comment)
-- SELECT r.ride_id, 5, 'Smooth and safe ride.'
-- FROM Rides r
-- WHERE r.pickup_address = 'Shahbag, Dhaka'
--     AND r.drop_address = 'Dhanmondi 27, Dhaka'
--     AND NOT EXISTS (
--             SELECT 1
--             FROM Ratings rt
--             WHERE rt.ride_id = r.ride_id
--                 AND rt.comment = 'Smooth and safe ride.'
--     )
-- LIMIT 1;

-- INSERT INTO Messages (ride_id, sender_id, message_text)
-- SELECT r.ride_id, p.user_id, 'I am waiting at the gate.'
-- FROM Rides r
-- JOIN Passengers p ON p.user_id = r.passenger_id
-- WHERE r.pickup_address = 'Shahbag, Dhaka'
--     AND r.drop_address = 'Dhanmondi 27, Dhaka'
--     AND NOT EXISTS (
--             SELECT 1
--             FROM Messages m
--             WHERE m.ride_id = r.ride_id
--                 AND m.message_text = 'I am waiting at the gate.'
--     )
-- LIMIT 1;

-- INSERT INTO Location_Logs (ride_id, latitude, longitude, recorded_at)
-- SELECT r.ride_id, 23.800000, 90.390000, CURRENT_TIMESTAMP - INTERVAL '20 minutes'
-- FROM Rides r
-- WHERE r.pickup_address = 'Shahbag, Dhaka'
--     AND r.drop_address = 'Dhanmondi 27, Dhaka'
--     AND NOT EXISTS (
--             SELECT 1
--             FROM Location_Logs ll
--             WHERE ll.ride_id = r.ride_id
--                 AND ll.latitude = 23.800000
--                 AND ll.longitude = 90.390000
--     )
-- LIMIT 1;

select * FROM passengers join users on passengers.user_id=users.user_id;