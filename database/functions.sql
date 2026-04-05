CREATE OR REPLACE FUNCTION calculate_fare(distance_km DECIMAL, v_type_id INT)
RETURNS DECIMAL AS $$
DECLARE
    b_fare DECIMAL;
    rate DECIMAL;
    total_fare DECIMAL;
BEGIN
    -- base fare and rate per km niye total fare calculate korchi
    SELECT base_fare, rate_per_km INTO b_fare, rate 
    FROM vehicle_types WHERE vehicle_type_id = v_type_id;
    
    -- total fare calculate korchi
    total_fare := b_fare + (rate * distance_km);
    RETURN total_fare;
END;
$$ LANGUAGE plpgsql;





CREATE OR REPLACE FUNCTION insert_payment_on_completion()
RETURNS TRIGGER AS $$
BEGIN
    -- when a ride is completed, insert a pending payment record
    -- SSLCommerz will update this to 'paid' after successful payment
    IF NEW.ride_status = 'completed' AND OLD.ride_status != 'completed' THEN
        INSERT INTO payments (ride_id, amount, payment_method, payment_status)
        VALUES (NEW.ride_id, NEW.fare_amount, 'pending', 'pending')
        ON CONFLICT (ride_id) DO NOTHING;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

--rides e kono ride status update hole payment insert er function ta call hobe
CREATE OR REPLACE TRIGGER after_ride_completed
AFTER UPDATE OF ride_status ON rides
FOR EACH ROW
EXECUTE FUNCTION insert_payment_on_completion();







CREATE OR REPLACE PROCEDURE complete_ride(
    p_ride_id INT, 
    p_distance_km DECIMAL
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_type_id INT;
    v_passenger_id INT;
    calculated_fare DECIMAL;
BEGIN
    -- ride ta valid kina check korchi
    SELECT vehicle_type_id, passenger_id INTO v_type_id, v_passenger_id 
    FROM rides WHERE ride_id = p_ride_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Ride % not found', p_ride_id;
    END IF;

    -- calculate_fare function call korchi
    calculated_fare := calculate_fare(p_distance_km, v_type_id);
    
    -- update the ride with distance, fare, status and drop timestamp
    UPDATE rides 
    SET ride_status = 'completed', 
        distance_km = p_distance_km, 
        fare_amount = calculated_fare, 
        drop_time = NOW()
    WHERE ride_id = p_ride_id;
    
    -- passenger er total distance update korchi
    UPDATE passengers 
    SET total_distance = total_distance + p_distance_km 
    WHERE user_id = v_passenger_id;

END;
$$;

