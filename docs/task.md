# SAROTHI-SHEBA — Task Tracker

## Phase 1: Database & Express Server Foundation

### Step 1.1: Finalize & Seed the Database
- [x] Fix `schema.sql` — add missing `updated_at` to `Rides`
- [x] Create `seed.sql` — realistic BD test data
- [x] Create `reset_db.sql` — drop → create → seed convenience script
- [x] Test: run scripts and verify with queries

### Step 1.2: Scaffold the Express Server
- [x] Set up `server.js`, `db/pool.js`, `.env`, folder structure

### Step 1.3: Health-check & Smoke Test
- [x] `GET /api/health` endpoint, test with curl

## Phase 2: Clerk Authentication & User Sync
- [x] Schema migration — add `clerk_id` to Users
- [x] Install `svix` and `@clerk/express`
- [x] Webhook endpoint (`POST /api/webhooks/clerk`)
- [x] Auth middleware (JWT verification + DB lookup)
- [x] Role selection API (`POST /api/users/role`)
- [x] User info API (`GET /api/users/me`)
- [x] Mount routes in `server.js`
- [x] Test all endpoints

## Phase 3: Frontend Scaffold, Auth & Role-Based Dashboards
- [x] Backend: Passenger dashboard API
- [x] Backend: Driver dashboard API
- [x] Frontend: Vite + React + Tailwind init
- [x] Frontend: Clerk auth (SignIn, SignUp)
- [x] Frontend: Role selection page
- [x] Frontend: Passenger dashboard
- [x] Frontend: Driver dashboard
- [x] Frontend: Routing + protected routes
- [x] Test end-to-end flow
