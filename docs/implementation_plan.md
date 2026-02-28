# SAROTHI-SHEBA — Full Project Roadmap

A ride-sharing application (Uber-like) built for a university Database course. The primary constraint is **raw SQL only** — no ORMs.

---

## Phase 1 — Database & Express Server Foundation

> **Goal:** Get a production-ready backend skeleton talking to PostgreSQL.

| Step | What happens |
|------|-------------|
| 1.1 | **Finalize & seed the database** — Run `schema.sql`, add seed data for `Vehicle_Types`, and create a few test `Users`/`Drivers`/`Passengers`. Write a `seed.sql` file. |
| 1.2 | **Scaffold the Express server** — Set up `server.js`, connection pool (`db/pool.js`), `.env` for credentials, folder structure (`routes/`, `controllers/`, `middleware/`). |
| 1.3 | **Health-check & smoke test** — A `GET /api/health` endpoint that queries `SELECT NOW()` to prove DB connectivity. Test with Postman/curl. |

---

## Phase 2 — Clerk Authentication & User Sync

> **Goal:** Users sign up/sign in via Clerk on the frontend; a Clerk webhook inserts/updates rows in `Users`.

| Step | What happens |
|------|-------------|
| 2.1 | **Clerk project setup** — Create a Clerk application, get `CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY`. |
| 2.2 | **Webhook endpoint** (`POST /api/webhooks/clerk`) — Verify the Svix signature, then `INSERT INTO Users …` on `user.created` and `UPDATE Users …` on `user.updated`. |
| 2.3 | **Auth middleware** — Verify the Clerk session JWT on every protected route. Attach `userId` (the DB `user_id`, looked up from the Clerk external ID) to `req`. |
| 2.4 | **Role selection API** — `POST /api/users/role` lets a newly-registered user choose *Passenger* or *Driver*, inserting into the corresponding role table. |

---

## Phase 3 — Frontend Scaffold & Auth UI

> **Goal:** React + Vite + Tailwind app with Clerk sign-in/sign-up and role-selection screens.

| Step | What happens |
|------|-------------|
| 3.1 | **Vite + React + Tailwind init** inside `frontend/`. |
| 3.2 | **Clerk React provider** — Wrap app with `<ClerkProvider>`, add `<SignIn>`, `<SignUp>` pages. |
| 3.3 | **Role selection page** — After first sign-up, redirect to a page where the user picks `Passenger` or `Driver` (calls Phase 2's API). |
| 3.4 | **Protected layout** — Redirect unauthenticated users to sign-in. Show different dashboard shells for Passenger vs Driver. |

---

## Phase 4 — Driver Profile & Vehicle Management (CRUD)

> **Goal:** A driver can register their vehicle, view/edit profile.

| Step | What happens |
|------|-------------|
| 4.1 | **Driver APIs** — `GET/PUT /api/drivers/:id` (profile), `POST/GET/PUT/DELETE /api/drivers/:id/vehicles`. All raw SQL. |
| 4.2 | **Driver dashboard UI** — Profile card, vehicle list, add-vehicle form. |

---

## Phase 5 — Passenger Ride Request (Map + Fare Estimation)

> **Goal:** Passenger picks pickup & drop locations on a map, sees estimated fare, and requests a ride.

| Step | What happens |
|------|-------------|
| 5.1 | **Map component** — React-Leaflet map with OpenStreetMap tiles. Click-to-set markers, geocoding search bar. |
| 5.2 | **OSRM routing** — Call the public OSRM API to get distance & polyline between two points. |
| 5.3 | **Fare estimation API** — `POST /api/rides/estimate` → takes coordinates + `vehicle_type_id`, returns distance & fare using `Vehicle_Types` rates. |
| 5.4 | **Ride request API** — `POST /api/rides` → inserts into `Rides` with `ride_status = 'requested'`. |
| 5.5 | **Passenger request UI** — Combines map, address search, vehicle-type selector, fare preview, and "Request Ride" button. |

---

## Phase 6 — Driver Matching & Ride Lifecycle

> **Goal:** Drivers see nearby ride requests, accept them, and move rides through the state machine (`requested → accepted → ongoing → completed → cancelled`).

| Step | What happens |
|------|-------------|
| 6.1 | **Available rides API** — `GET /api/rides/available` (for nearby requests; filtered by proximity or simple list for now). |
| 6.2 | **Accept ride API** — `PUT /api/rides/:id/accept` → sets `driver_id`, changes status to `accepted`. |
| 6.3 | **Ride state transition APIs** — `PUT /api/rides/:id/start` (→ `ongoing`), `PUT /api/rides/:id/complete` (→ `completed`, sets `drop_time`, `distance_km`, `fare_amount`), `PUT /api/rides/:id/cancel`. |
| 6.4 | **Driver UI** — Ride requests list, accept button, active-ride panel with "Start" / "Complete" / "Cancel" controls. |
| 6.5 | **Passenger UI** — Real-time ride status display (polling or sockets). |

---

## Phase 7 — Real-Time Location Tracking (Socket.io)

> **Goal:** During an `ongoing` ride, the driver's location streams to the passenger's map in real time.

| Step | What happens |
|------|-------------|
| 7.1 | **Socket.io server setup** — Integrate with the Express server. Rooms per `ride_id`. |
| 7.2 | **Driver emits location** — Front-end watches `navigator.geolocation` and emits `location:update`. Server writes to `Location_Logs` and broadcasts to the room. |
| 7.3 | **Passenger receives location** — Moving marker on the Leaflet map. |

---

## Phase 8 — Payments (SSLCommerz Sandbox)

> **Goal:** After ride completion, passenger pays via SSLCommerz. Payment status recorded in `Payments`.

| Step | What happens |
|------|-------------|
| 8.1 | **SSLCommerz init API** — `POST /api/payments/init` → calls SSLCommerz sandbox, returns the redirect URL. |
| 8.2 | **IPN / success / fail / cancel callbacks** — Server endpoints that SSLCommerz calls back; insert/update `Payments`. |
| 8.3 | **Payment UI** — "Pay Now" button on completed ride, redirects to SSLCommerz, returns to a success/failure page. |

---

## Phase 9 — Ratings & Reviews

> **Goal:** After completing a ride, passenger can rate the driver (1–5 ★) and leave a comment.

| Step | What happens |
|------|-------------|
| 9.1 | **Rating API** — `POST /api/rides/:id/rating`. A **SQL trigger or stored procedure** recalculates `Drivers.rating_average`. |
| 9.2 | **Rating UI** — Star picker + comment box, shown post-ride. |

---

## Phase 10 — In-Ride Messaging

> **Goal:** Passenger and driver can text-chat during an active ride.

| Step | What happens |
|------|-------------|
| 10.1 | **Message APIs** — `POST /api/rides/:id/messages`, `GET /api/rides/:id/messages`. |
| 10.2 | **Real-time chat via Socket.io** — Messages broadcast within the ride room. |
| 10.3 | **Chat UI** — Chat panel inside the active-ride view. |

---

## Phase 11 — Voice/Video Calling (Agora)

> **Goal:** One-tap call between passenger and driver during an active ride.

| Step | What happens |
|------|-------------|
| 11.1 | **Agora token server** — `GET /api/agora/token?channel=ride_<id>` generates an RTC token. |
| 11.2 | **Call UI** — "Call Driver/Passenger" button, Agora Web SDK for audio. |

---

## Phase 12 — Admin Dashboard

> **Goal:** Admin can view all users, rides, revenue, and manage the system.

| Step | What happens |
|------|-------------|
| 12.1 | **Admin APIs** — List users, rides, payments. Stats queries (total revenue, rides per day, etc.). Use SQL aggregate functions, `GROUP BY`, `JOIN`s. |
| 12.2 | **Admin UI** — Table views, stats cards, charts. |

---

## Phase 13 — SQL Triggers, Stored Procedures & Views (DB Project Showpieces)

> **Goal:** Demonstrate advanced DB features to satisfy project requirements.

| Item | Description |
|------|-------------|
| **Trigger** | `after_rating_insert` → automatically recalculates `Drivers.rating_average`. |
| **Trigger** | `after_ride_complete` → updates `Passengers.total_distance`. |
| **Stored Procedure** | `calculate_fare(distance, vehicle_type_id)` → returns fare. |
| **View** | `ride_summary_view` — joins `Rides`, `Users`, `Payments`, `Ratings` into a single queryable view. |
| **Index** | Create indexes on frequently queried columns (`ride_status`, `driver_id`, etc.). |

---

## Phase 14 — Polish, Ride History & Final Testing

> **Goal:** Tie up loose ends, add ride history, and do full end-to-end testing.

| Step | What happens |
|------|-------------|
| 14.1 | **Ride history APIs** — `GET /api/rides/history` (for passenger & driver). |
| 14.2 | **Ride history UI** — Paginated list with fare, date, rating, payment status. |
| 14.3 | **End-to-end testing** — Full flow: sign up → request ride → accept → track → complete → pay → rate. |
| 14.4 | **UI polish** — Loading states, error handling, responsive design, notifications. |

---

## Execution Order (Single-Developer Timeline)

```
Phase 1  ➜  Phase 2  ➜  Phase 3  ➜  Phase 4
                                        ↓
Phase 5  ➜  Phase 6  ➜  Phase 7  ➜  Phase 8
                                        ↓
Phase 9  ➜  Phase 10  ➜  Phase 11  ➜  Phase 12
                                        ↓
                    Phase 13  ➜  Phase 14
```

Each phase is self-contained and testable before moving to the next.

---

> **⏸️ STOPPING HERE — Per Rule 1 of our engagement rules.**
>
> Please review this roadmap. Once you confirm, I'll provide the detailed breakdown for **Phase 1, Step 1.1** and wait for your "Start" before writing any code.
