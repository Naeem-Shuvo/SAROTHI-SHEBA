# Phase 1, Step 1.1 — Finalize & Seed the Database

## What We're Doing

1. **Fix `schema.sql`** — Add the missing `updated_at` column to `Rides` (from your prompt) and ensure everything matches exactly.
2. **Create `seed.sql`** — Insert realistic test data so we have something to query against immediately.
3. **Create `reset_db.sql`** — A convenience script that drops all tables and re-runs schema + seed in one shot.

---

## Files We'll Touch

| File | Action | Purpose |
|------|--------|---------|
| `database/schema.sql` | **Modify** | Add `updated_at` to `Rides` table |
| `database/seed.sql` | **Create** | Insert test data into all tables |
| `database/reset_db.sql` | **Create** | Drop → Create → Seed in one script |

---

## Seed Data Plan

We'll insert just enough data to validate every table and relationship:

| Table | Records | Details |
|-------|---------|---------|
| `Vehicle_Types` | 4 | Bike, Auto-Rickshaw, Car, SUV (with BD-appropriate fares in BDT) |
| `Users` | 5 | 2 passengers, 2 drivers, 1 admin |
| `Admins` | 1 | Admin user |
| `Drivers` | 2 | With license numbers and `available` status |
| `Passengers` | 2 | With default values |
| `Vehicles` | 2 | One per driver, linked to vehicle types |
| `Rides` | 2 | One `completed`, one `requested` |
| `Payments` | 1 | For the completed ride |
| `Ratings` | 1 | For the completed ride |
| `Messages` | 2 | Sample chat messages on the completed ride |
| `Location_Logs` | 3 | GPS breadcrumbs for the completed ride |

---

## How We'll Test

After running the scripts, we'll verify with these queries:

```sql
-- 1. Confirm all tables exist
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';

-- 2. Verify row counts
SELECT 'Users' AS tbl, COUNT(*) FROM Users
UNION ALL SELECT 'Rides', COUNT(*) FROM Rides
UNION ALL SELECT 'Payments', COUNT(*) FROM Payments;

-- 3. Test a JOIN (preview of ride_summary_view)
SELECT r.ride_id, u.name AS passenger, d.name AS driver, r.fare_amount, r.ride_status
FROM Rides r
JOIN Users u ON r.passenger_id = u.user_id
LEFT JOIN Users d ON r.driver_id = d.user_id;
```

You can run these via `psql` or your existing `test_db.js`.

---

> **⏸️ Say "Start" and I'll write the code for these three files.**
