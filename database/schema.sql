-- independent tables
CREATE TABLE Users (
    user_id SERIAL PRIMARY KEY,
    clerk_id TEXT UNIQUE,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone_number VARCHAR(50) UNIQUE NOT NULL,
    password_hash TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE Vehicle_Types (
    vehicle_type_id SERIAL PRIMARY KEY,
    type_name TEXT NOT NULL,
    base_fare DECIMAL(10, 2) NOT NULL,
    rate_per_km DECIMAL(10, 2) NOT NULL
);

-- role tables
CREATE TABLE Admins (
    admin_id INT PRIMARY KEY REFERENCES Users(user_id),
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

-- asset tables
CREATE TABLE Vehicles (
    vehicle_id SERIAL PRIMARY KEY,
    driver_id INT NOT NULL REFERENCES Drivers(user_id),
    vehicle_type_id INT NOT NULL REFERENCES Vehicle_Types(vehicle_type_id),
    plate_number TEXT UNIQUE NOT NULL,
    model TEXT,
    color TEXT
);

-- transactional tables
CREATE TABLE Rides (
    ride_id SERIAL PRIMARY KEY,
    passenger_id INT NOT NULL REFERENCES Passengers(user_id),
    driver_id INT REFERENCES Drivers(user_id),
    vehicle_type_id INT NOT NULL REFERENCES Vehicle_Types(vehicle_type_id),
    pickup_latitude DECIMAL(9, 6) NOT NULL,
    pickup_longitude DECIMAL(9, 6) NOT NULL,
    drop_latitude DECIMAL(9, 6) NOT NULL,
    drop_longitude DECIMAL(9, 6) NOT NULL,
    pickup_address TEXT,
    drop_address TEXT,
    requested_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    pickup_time TIMESTAMPTZ,
    drop_time TIMESTAMPTZ,
    distance_km DECIMAL(10, 2),
    fare_amount DECIMAL(10, 2),
    ride_status VARCHAR(20),
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- dependent tables
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