# SAROTHI SHEBA — Working Plan

> Short session companion. The full reasoning lives in [`ULTIMATE_REFINEMENT_PLAN.md`](./ULTIMATE_REFINEMENT_PLAN.md).
> Live status lives in [`progress.md`](./progress.md).

**Current phase:** Phase 1 — 95% done, all exit criteria proven
**Last updated:** 2026-07-28

---

## The one-line summary

Take a ~6,000 LOC Uber-clone term project that **could not boot**, and rebuild it into a production-grade distributed system across 10 phases — pausing before each phase so the concepts are understood before the code is generated.

**It boots now, every leaked secret with real value has been rotated, and the database is now under real migration control with a tested transaction primitive ready for Phase 3.** See `progress.md` for the full proof log of every exit criterion in Phases 0 and 1 — nothing below was asserted without a real, falsifiable test.

---

## Decisions made this session

1. **Skip the git history purge** (Phase 0). Rotation, not history rewriting, is what neutralizes a leaked-secret risk. Deferred indefinitely, revisitable later.
2. **No SSLCommerz sandbox account** (Phase 0). Deferred to Phase 3/4 — register fresh then.
3. *(Phase 0, committed as `5f91bb9`, nothing pushed.)*

## Next 3 actions

1. **Checkpoint 1** — "Reproducibility: migrations, config, and the transaction boundary." Covers migrations vs. hand-edited schema files, why `withTransaction` exists and what `query()` still can't do, and the isolation-level/retry material the concurrency proofs above already demonstrated live.
2. **Commit Phase 1's changes** — `backend/config.js`, `database/db.js` rewrite, migrations, `seed.js`, pino logging, graceful shutdown. Nothing committed yet; working tree has the full diff pending review.
3. **Start Phase 2** — schema v2: enums, partial unique indexes (the real fix for P1-7), PostGIS columns, money as integer minor units, the append-only `ride_events` audit log.

---

## Phase map

| # | Phase | Status | Key outcome |
|---|---|---|---|
| 0 | Triage & secrets | 🟨 95% | ✅ Backend starts. ✅ Live secrets rotated & proven dead. History purge descoped by design. |
| 1 | Foundation: Docker, migrations, config | 🟨 95% | ✅ Migrations (up/down/up proven), `withTransaction` (rollback + real 40001 + 10-way retry proven), Zod config, pino logging, graceful shutdown (proven) |
| 2 | Schema v2: constraints, PostGIS | ⬜ | Invalid data becomes impossible |
| 3 | ★ Concurrency, isolation, outbox | ⬜ | Provably correct under load |
| 4 | ★ Geospatial matching engine | ⬜ | Real dispatch, p99 < 100 ms |
| 5 | Auth, RBAC, RLS, socket auth | ⬜ | Every §1.4 finding closed |
| 6 | Event backbone (Redpanda) | ⬜ | Postgres is the source of truth |
| 7 | Observability, load, chaos | ⬜ | Claims become measurements |
| 8 | Frontend rebuild | ⬜ | 60 fps, Lighthouse ≥ 90 |
| 9 | Tests, CI, docs | ⬜ | Safe to change |

★ = the intellectual core.

---

## Decision log

| # | Decision | Choice | Why |
|---|---|---|---|
| D1 | Deployment | Docker Compose, laptop-only | Production *patterns*, zero cloud spend. Drives Redpanda over Kafka, `otel-lgtm` over SigNoz. |
| D2 | Language | Stay in JavaScript | No TS migration tax. Effort goes to architecture. Rules out Drizzle/Prisma → hand-written SQL + Zod, which is also better pedagogically here. |
| D3 | Migration | Strangler fig on this repo | App runs at the end of every phase. No big-bang rewrite. |
| D4 | Docs & pacing | Repo root, checkpoint per phase | 10 Human Learning Checkpoints. |
| D5 | Orchestration | Postgres saga + outbox, **not** LangGraph/n8n | Those orchestrate LLM agents / low-code integrations — wrong problem domain for a money-handling ride lifecycle. Restate noted as optional depth. |
| D6 | Geospatial | Build PostGIS first, **benchmark**, then add H3+Valkey | The crossover point is a measurement, not an opinion. |
| D7 | Motion | Motion **and** GSAP | Different layers (declarative/React vs imperative/DOM); research confirms they don't conflict. GSAP also drives R3F natively. |

---

## Ground rules for our sessions

1. **No code before its checkpoint.** Each phase's concepts get taught first, with hands-on demos, and you decide when to move on.
2. **The app boots at the end of every phase.** If a change would leave it broken, it gets split.
3. **Benchmarks go in `progress.md`.** Claims like "faster" are worthless without a number next to them.
4. **Destructive and outward-facing actions need explicit go-ahead** — history rewriting, force-push, credential rotation.
5. **Re-run graphify after each phase.** Watching `query()` fall from 52 edges is objective proof the refactor worked.

---

## Open questions

| # | Question | Needed by | Status |
|---|---|---|---|
| Q1 | Force-push disruption to `Nemo`/`blackhatcrow` collaborators? | — | ✅ **moot** — history purge descoped, no force-push happening |
| Q2 | SSLCommerz sandbox access? | Phase 3/4 | ✅ answered — no account; will register fresh when payment work starts |
| Q3 | Existing production DB with real users, or is all data disposable? Changes Phase 2 migration strategy. | Phase 2 | 🟡 open — a fresh empty DB now exists locally, so likely disposable |
| Q4 | Laptop RAM? The `full` profile wants ~3.3 GB. | Phase 1 | 🟡 open — `core` (Postgres + Valkey) confirmed running fine |
| Q5 | Submission or demo deadline that should shape phase ordering? | — | 🟡 open |

## Environment as of Phase 0

| Thing | Value |
|---|---|
| Node | v24.18.0 |
| Docker / Compose | 29.5.2 / v5.1.3 |
| Postgres | `postgis/postgis:17-3.5` → `sarothi-postgres`, healthy |
| Valkey | `valkey/valkey:8-alpine` → `sarothi-valkey`, healthy |
| DB user / name | `anjum` / `rideshare_db` |
| API port | 4000 |
| Start the stack | `docker compose --env-file backend/.env --profile core up -d` |
| Start the API | `cd backend && npm run dev` |
| Run migrations | `npm run migrate:up` / `npm run migrate:down` (repo root) |
| Seed dev data | `npm run seed` (repo root) — prints login credentials, safe to re-run |
| Dev login | `sarothi.{admin,driver,passenger}@gmail.com` / `DevPass123!` (after seeding) |

⚠️ `anjum` is a **superuser with BYPASSRLS**. Phase 5 needs a separate non-superuser `app_user`, or RLS policies will be silently ignored.

---

## Quick reference — the findings that drive everything

**Cannot boot:** `tokenBlacklist.js:7` (SyntaxError) · `routes.js:46` (undefined handler)

**Exposed:** `backend/.env` in public git history since `6749d1d` — `JWT_SECRET`, `PG_PASSWORD`, `SSLCOMMERZ_STORE_PASSWORD`, and `ADMIN_LEVEL1/2`. The last two *are* the admin authorization check (`register.js:82-88`), so reading the repo is the privilege escalation.

**Biggest design gap:** there is no matching engine. `rideRequest.js:57` broadcasts every request to every connected socket; lat/lng are unindexed `DECIMAL`; no driver-location table exists.

**Biggest security hole:** Socket.IO has no auth (`startPoint.js:28-49`). Anyone can `join_room` with any user id and stream a stranger's live driver GPS.

**Root architectural cause:** `db.js:25-52` commits per statement, so multi-statement atomicity is unreachable — which is why roughly a third of the correctness defects exist.
