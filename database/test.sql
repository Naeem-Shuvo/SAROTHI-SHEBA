SELECT
r.ride_id,
pu.name AS passenger_name,
du.name AS driver_name,
vt.type_name AS vehicle_type,
r.fare_amount,
r.ride_status,
p.payment_status,
r.requested_at
FROM rides r
JOIN users pu ON pu.user_id = r.passenger_id
LEFT JOIN users du ON du.user_id = r.driver_id
JOIN vehicle_types vt ON vt.vehicle_type_id = r.vehicle_type_id
LEFT JOIN payments p ON p.ride_id = r.ride_id
ORDER BY r.requested_at DESC
LIMIT 20;