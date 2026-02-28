# Phase 3 — Frontend Scaffold, Auth & Role-Based Dashboards

## What We're Building

A React frontend where:
- Users **sign up / sign in** via Clerk
- New users **choose a role** (Passenger or Driver — drivers also provide license number)
- After role selection, they land on a **role-specific dashboard** with real data from Postgres

---

## Architecture

```
┌─────────────────────────────────────────────────┐
│                  React (Vite)                    │
│                                                  │
│  /sign-in   /sign-up   /select-role              │
│                                                  │
│  /passenger/dashboard     /driver/dashboard       │
│  ┌───────────────────┐   ┌────────────────────┐  │
│  │ Rating  ★ 4.8     │   │ Status: Available  │  │
│  │ Rides Taken: 12   │   │ Rating: ★ 4.5      │  │
│  │ Distance: 48 km   │   │ Rides Given: 25    │  │
│  │ Recent Rides       │   │ Vehicle: Honda CB  │  │
│  │ [Request a Ride]  │   │ Recent Rides       │  │
│  └───────────────────┘   │ Earnings: ৳2,400   │  │
│                           └────────────────────┘  │
└──────────────────────┬──────────────────────────┘
                       │  API calls (JWT in header)
                       ▼
              Express Backend (Phase 2)
```

---

## New Backend APIs Needed

| Endpoint | Auth | Response |
|----------|------|----------|
| `GET /api/passengers/dashboard` | ✅ | Rating, total rides, total distance, last 5 rides |
| `GET /api/drivers/dashboard` | ✅ | Rating, status, vehicle info, total rides, total earnings, last 5 rides |

These use JOINs and aggregations — good raw SQL showcase for your DB project.

---

## Frontend File Structure

```
frontend/
├── index.html
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
├── package.json
├── public/
└── src/
    ├── main.jsx
    ├── App.jsx                    ← Router + ClerkProvider
    ├── index.css                  ← Tailwind imports + custom styles
    ├── api/
    │   └── axios.js               ← Axios instance with Clerk JWT
    ├── components/
    │   ├── Navbar.jsx              ← Nav with user info + sign out
    │   └── ProtectedRoute.jsx     ← Redirects if not signed in
    ├── layouts/
    │   └── DashboardLayout.jsx    ← Sidebar/nav shell
    └── pages/
        ├── SignInPage.jsx
        ├── SignUpPage.jsx
        ├── SelectRolePage.jsx     ← Passenger vs Driver choice
        ├── passenger/
        │   └── Dashboard.jsx      ← Passenger stats + recent rides
        └── driver/
            └── Dashboard.jsx      ← Driver stats + vehicle + recent rides
```

---

## Page Breakdown

### 1. Sign Up / Sign In
- Clerk's `<SignIn>` and `<SignUp>` components (hosted UI)
- Zero custom auth logic needed

### 2. Role Selection (`/select-role`)
- Shown only if `GET /api/users/me` returns `role: null`
- Two cards: **"I'm a Passenger"** and **"I'm a Driver"**
- Driver card expands to show a license number input
- Calls `POST /api/users/role`

### 3. Passenger Dashboard (`/passenger/dashboard`)
- **Stats cards**: Rating, Total Rides, Total Distance
- **Recent rides table**: Date, route, fare, status
- **"Request a Ride" button** (placeholder → Phase 5)

### 4. Driver Dashboard (`/driver/dashboard`)
- **Stats cards**: Rating, Status, Total Rides, Total Earnings
- **Vehicle card**: Plate, model, color, type
- **Recent rides table**: Date, passenger name, route, fare
- **"Go Online/Offline" toggle** (placeholder → Phase 6)

---

## Verification

1. Sign up a new user → webhook creates DB record → role selection page appears
2. Choose Passenger → redirected to Passenger Dashboard with real data
3. Sign up another user → choose Driver (with license) → Driver Dashboard
4. Sign out → redirected to sign-in page

---

> **⏸️ Confirm this plan and I'll implement the full phase at once (backend APIs + entire frontend).**
