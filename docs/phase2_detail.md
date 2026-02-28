# Phase 2 — Clerk Authentication & User Sync (Detailed Plan)

## How It Works (Architecture)

```
┌──────────────┐     sign-up/login     ┌───────────┐
│   React App  │ ───────────────────►  │   Clerk   │
└──────────────┘                       └─────┬─────┘
                                             │  webhook (user.created / user.updated)
                                             ▼
                                    ┌─────────────────┐       raw SQL       ┌────────────┐
                                    │  Express Server  │ ──────────────────► │ PostgreSQL │
                                    └─────────────────┘                     └────────────┘
                                             ▲
                                             │  JWT in Authorization header
┌──────────────┐   protected API call  ──────┘
│   React App  │
└──────────────┘
```

1. User signs up on the **React frontend** via Clerk's hosted UI.
2. Clerk fires a **webhook** to our backend → we `INSERT` into `Users`.
3. Every subsequent API call includes a **Clerk JWT** → our middleware verifies it and attaches the DB `user_id` to `req`.
4. After first login, user hits the **role selection API** to become a `Passenger` or `Driver`.

---

## Schema Migration Required

> [!IMPORTANT]
> The `Users` table needs a `clerk_id` column to map Clerk's external user ID (e.g. `user_2abc123`) to our DB `user_id`. We also need to make `password_hash` nullable since Clerk manages passwords.

```sql
ALTER TABLE Users ADD COLUMN clerk_id TEXT UNIQUE;
ALTER TABLE Users ALTER COLUMN password_hash DROP NOT NULL;
```

This will be added to a new `database/migrations/001_add_clerk_id.sql` file and also patched into `schema.sql`.

---

## Files to Create / Modify

| File | Action | Purpose |
|------|--------|---------|
| `database/migrations/001_add_clerk_id.sql` | **NEW** | Migration to add `clerk_id` column |
| `database/schema.sql` | **MODIFY** | Add `clerk_id` column to `Users` definition |
| `backend/routes/webhooks.js` | **NEW** | `POST /api/webhooks/clerk` — receives Clerk events |
| `backend/middleware/auth.js` | **NEW** | Verifies Clerk JWT, attaches `req.userId` (DB id) |
| `backend/routes/users.js` | **NEW** | `POST /api/users/role` — role selection |
| `backend/controllers/userController.js` | **NEW** | Business logic for user/role operations |
| `backend/server.js` | **MODIFY** | Mount new routes |
| `backend/.env` | **MODIFY** | Add `CLERK_SECRET_KEY` and `CLERK_WEBHOOK_SECRET` |
| `backend/package.json` | **MODIFY** | Add `svix` and `@clerk/express` deps |

---

## API Endpoints

### 1. `POST /api/webhooks/clerk` (Public — no auth)

| Field | Detail |
|-------|--------|
| **Trigger** | Clerk fires this on `user.created`, `user.updated`, `user.deleted` |
| **Verification** | Svix signature check using `CLERK_WEBHOOK_SECRET` |
| **DB Action** | `INSERT INTO Users (clerk_id, name, email, phone_number)` on create; `UPDATE` on update |
| **Response** | `200 OK` (Clerk requires this) |

### 2. `POST /api/users/role` (Protected — requires auth)

| Field | Detail |
|-------|--------|
| **Body** | `{ "role": "passenger" | "driver", "license_number?": "..." }` |
| **DB Action** | `INSERT INTO Passengers` or `INSERT INTO Drivers` |
| **Validation** | Driver must provide `license_number`; user can't pick a role twice |
| **Response** | `{ success: true, role: "passenger" }` |

### 3. `GET /api/users/me` (Protected — requires auth)

| Field | Detail |
|-------|--------|
| **DB Action** | `SELECT` from `Users` + check `Passengers`/`Drivers`/`Admins` for role |
| **Response** | `{ user_id, name, email, role: "passenger" | "driver" | "admin" | null }` |

---

## Auth Middleware Flow

```
Request → Check Authorization header → Verify JWT with Clerk SDK
  → Look up clerk_id in Users table → Attach req.userId (DB user_id) and req.userRole
  → Next()
```

---

## Dependencies to Install

```
npm install svix @clerk/express
```

- **`svix`** — Verifies Clerk webhook signatures
- **`@clerk/express`** — Express middleware for JWT verification

---

## How I'll Test

```bash
# 1. Run migration
psql -U anjum -d rideshare_db -f database/migrations/001_add_clerk_id.sql

# 2. Start server
cd backend && npm start

# 3. Test webhook with a mock payload
curl -X POST http://localhost:5000/api/webhooks/clerk \
  -H "Content-Type: application/json" \
  -d '{ ... mock clerk event ... }'

# 4. Test /api/users/me and /api/users/role with a Clerk JWT
```

> [!NOTE]
> **For steps 2.1 (Clerk project setup):** You'll need to create a Clerk app at [clerk.com](https://clerk.com), get your keys, and paste them into `.env`. I can't do this part for you — but I'll structure the code so it works the moment you add the keys.

---

> **⏸️ Confirm this plan, then I'll implement the entire phase at once.**
