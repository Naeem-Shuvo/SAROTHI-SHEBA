# SAROTHI SHEBA — Progress Tracker

> Live status. Updated as we execute.
> Plan: [`ULTIMATE_REFINEMENT_PLAN.md`](./ULTIMATE_REFINEMENT_PLAN.md) · Session view: [`plan.md`](./plan.md)

**Started:** 2026-07-28 · **Current phase:** 0 — nearly done · **Phases complete:** 0 / 10

```
Phase  0 ▰▰▰▰▰▰▰▰▰▱ 95%   Triage & secrets — all code + rotation done; checkpoint remains
Phase  1 ▰▰▰▰▰▰▰▰▰▱ 95%   Foundation — all exit criteria proven; checkpoint remains
Phase  2 ▱▱▱▱▱▱▱▱▱▱  0%   Schema v2
Phase  3 ▱▱▱▱▱▱▱▱▱▱  0%   Concurrency ★
Phase  4 ▱▱▱▱▱▱▱▱▱▱  0%   Geospatial ★
Phase  5 ▱▱▱▱▱▱▱▱▱▱  0%   Security
Phase  6 ▱▱▱▱▱▱▱▱▱▱  0%   Events
Phase  7 ▱▱▱▱▱▱▱▱▱▱  0%   Observability
Phase  8 ▱▱▱▱▱▱▱▱▱▱  0%   Frontend
Phase  9 ▱▱▱▱▱▱▱▱▱▱  0%   Hardening
```

Legend: ⬜ not started · 🟨 in progress · ✅ done · ⛔ blocked · ⏭️ deferred

---

## Phase 0 — Triage & secrets 🟨 (80% — blocked on go-ahead)

**Exit criteria**
- [x] `node --check` passes on every file under `backend/` ✅
- [x] Backend boots without error ✅ *(`Database connected successfully` / `Server is running on port 4000`)*
- [x] `curl localhost:4000/db-health` → **200** ✅
- [x] `git ls-files | wc -l` < 70 → **1213 → 61** ✅
- [x] Old `JWT_SECRET` no longer authenticates ✅ **proven live**: identical token was 403 (valid) under the old secret, 401 "decoding token" (invalid signature) under the new one, immediately after rotation
- [~] `git log --all -- backend/.env` returns nothing — **descoped, see decision below**

**Decision: history purge descoped, rotation is the fix.** User pushed back on `git filter-repo` — correctly.
The actual risk is a *valid* secret being readable in history; once rotated, the old values in commit
`6749d1d` are inert. Purging history is hygiene (SHA rewrite, force-push, breaks any existing clone
of `Nemo`/`blackhatcrow`), not a live risk, given D1 (laptop-only, not yet shared beyond this repo's
current audience). Deferred indefinitely — revisit only if this repo is ever put in front of e.g. a
recruiter and a clean history becomes worth the disruption. `git-secrets` (0.8) also deferred to
Phase 1 alongside husky/lint-staged setup, since it's no longer gating anything urgent.

**Tasks**
- [x] 0.1 Comment out prose — `tokenBlacklist.js:7` ✅
- [x] 0.2 Import `adminRejectDriver` — `routes.js:4` ✅ *(32 routes now register)*
- [x] 0.3 Remove hardcoded password fallback + fail-fast guard — `db.js:6` ✅
- [x] 0.4 Rotate secrets — `PG_PASSWORD` ✅, `JWT_SECRET` ✅ (proven), `ADMIN_LEVEL1/2` ✅ (regenerated, unverified live — no admin flow exercised yet)
- [x] 0.5 History purge — **descoped by user decision**, see above
- [x] 0.6 Untrack `node_modules` (1,145) + `.DS_Store` (4) + stray logs ✅ *(files intact on disk)*
- [x] 0.7 Harden `.gitignore`; add `backend/.env.example` ✅
- [ ] 0.8 Install `git-secrets` pre-commit hook — deferred to Phase 1
- [x] 0.9 Remove dead `express.static` + delete `public/index.html` ✅
- [x] **0.10 (unplanned)** Install missing deps `socket.io`, `sslcommerz-lts` ✅ — see P0-6
- [x] **0.11 (unplanned)** Stand up Postgres + Valkey via Compose ✅ — see P0-7
- [ ] **0.12 (unplanned)** SSLCommerz sandbox credentials — user has no account access. **Deferred to Phase 3/4**: register a fresh sandbox account then (localhost domain accepted, no real verification needed). Old leaked sandbox creds are low-risk (test money only) and left as-is for now.

⚠️ = destructive / outward-facing, needs explicit go-ahead.

### Two defects found during execution that static analysis missed

**P0-6 · Declared dependencies were never installed.** `socket.io` and `sslcommerz-lts` are in
`backend/package.json` but absent from `backend/node_modules`. The committed `node_modules` tree
was a *partial* snapshot — a third boot blocker, and a direct consequence of vendoring deps into
git (P0-4). Fixed by `npm install` after untracking. `pg` resolves from the root `node_modules`.

**P0-7 · `PG_PASSWORD` was empty and no database existed.** The app had been silently relying on
`db.js`'s hardcoded `|| 'NewPassword123'` fallback the whole time — precisely the failure mode
that motivated 0.3. Removing the fallback surfaced it immediately. Nothing was listening on 5432
and no local Postgres was installed, so `docker-compose.yml` was pulled forward from Phase 1.

**Also noted for later:** the DB role `anjum` is a **superuser with BYPASSRLS**. Phase 5 requires a
separate non-superuser `app_user` role, or RLS policies will be silently ignored.

**Checkpoint 0 — "Git never forgets, and secrets are not text"** ⬜
- [ ] Taught · [ ] Hands-on done · [ ] Self-check passed

---

## Phase 1 — Foundation 🟨 (95% — all exit criteria proven, checkpoint remains)

**Exit criteria**
- [x] `docker compose --profile core up` → healthy Postgres + Valkey ✅ (running continuously since Phase 0, 55+ min uptime, both healthy)
- [x] `migrate:up` from empty; `migrate:down` reverses cleanly ✅ **proven**: dropped all app tables to bare `spatial_ref_sys`, ran `migrate:down` × 3 (unwinds one migration per call) back to empty, then `migrate:up` rebuilt all 12 tables + `calculate_fare()` + `after_ride_completed` trigger + the previously-orphaned `precheck_info_trigger`, all verified present afterward
- [x] `npm run seed` produces a usable dataset ✅ **proven idempotent**: ran twice, exact row counts unchanged (3 users, 2 vehicle types, 1 vehicle, 1 ride, 1 payment, 1 rating, 1 message, 1 location log) — same `ride_id` both times
- [x] Missing env var → startup refused with a clear message ✅ **proven**: broke `PG_PASSWORD` (emptied) and `JWT_SECRET` (too short) simultaneously — got both errors listed together in one aggregated message with exit code 1, not discovered one at a time
- [x] `withTransaction` rolls back all writes when the callback throws ✅ **proven** two ways: (1) a callback that writes twice then throws leaves 0 rows; (2) a real SERIALIZABLE conflict manually forced between two raw clients produced exactly SQLSTATE `40001`; (3) 10 genuinely concurrent transactions read-modify-write the same row under `SERIALIZABLE` with 5-20ms random overlap — all 10 succeeded via automatic retry, final value exactly 10, zero lost updates
- [x] `SIGTERM` drains in-flight requests ✅ **proven deterministically**: a synthetic 500ms-delayed route was hit, `SIGTERM` emitted 100ms in (request genuinely mid-flight, not just TCP handshake), response arrived at 516ms, `"Shutdown complete"` logged and `process.exit(0)` only fired after. (Note: real OS `SIGTERM` via PowerShell's `Stop-Process` does a hard `TerminateProcess` on Windows and bypasses Node's signal handler entirely — this is a genuine Windows limitation, not a gap in the app. Tested via `process.emit('SIGTERM')`, the standard cross-platform way to test Node shutdown logic, which exercises the identical registered handler.)

### Unplanned finds during Phase 1

**The orphaned `precheck_info` trigger, finally applied and tested.** `database/func precheck_info.sql` (P2-11) contained a real, well-written validation trigger (Gmail-only emails, BD phone format, letters-only names) that had **never once been applied to any database** — confirmed via `\df precheck_info` returning 0 rows before this phase. It's exactly the "database as last line of defense" principle the refinement plan argues for, just predating the plan and sitting unused. Folded into migration `20260728120003`, and functionally tested for the first time ever: correctly rejects a non-Gmail email and a malformed phone number, accepts valid data. The old loose `.sql` files (`schema.sql`, `functions.sql`, the space-named precheck file) are now redundant with the migrations and were removed — content fully preserved in migration files and git history.

**`node-pg-migrate` + `npx` doesn't work reliably on Windows.** `spawnSync('npx.cmd', ...)` without `shell:true` fails silently (empty output, exit 1) — a known Windows footgun with spawning `.cmd` wrapper scripts. Fixed by resolving `node-pg-migrate`'s actual entry script via `require.resolve()` and invoking `node` on it directly, skipping the shell entirely. Also hit a doubled-`.js` bug from the package's `exports` map already appending the extension to its `./bin/*` wildcard.

**`dotenv.config()` resolves relative to CWD, not `__dirname`** — same class of bug as the `express.static` fix in Phase 0. Bit `backend/config.js` the same way; fixed the same way (explicit `path.join(__dirname, '.env')`).

**Checkpoint 1 — "Reproducibility: migrations, config, transaction boundary"** ⬜
- [ ] Taught · [ ] Hands-on done · [ ] Self-check passed

---

## Phase 2 — Schema v2 ⬜

**Exit criteria**
- [ ] Two concurrent requests for one passenger → 1 wins, loser gets `23505`
- [ ] `ride_status='compelted'` → type error
- [ ] Illegal transition rejected by trigger
- [ ] Both parties can rate a ride; neither twice
- [ ] `complete_ride` twice → distance counted once
- [ ] `EXPLAIN` shows index usage on all hot queries
- [ ] Migration runs against existing seeded data without loss

**Checkpoint 2 — "Making illegal states unrepresentable"** ⬜
- [ ] Taught · [ ] Two-terminal demo done · [ ] Self-check passed

---

## Phase 3 — Concurrency ★ ⬜

**Exit criteria**
- [ ] 50 simultaneous accepts → exactly 1 winner, verified via `ride_events`
- [ ] 20 simultaneous requests from one passenger → 1 winner, losers fail on the **constraint**
- [ ] Duplicate SSLCommerz callback → one settlement
- [ ] Gateway amount mismatch → rejected
- [ ] Kill API mid-transaction → zero partial writes
- [ ] Kill relay mid-publish → redelivered, no duplicate effect
- [ ] `grep -r "global.io" backend/` → empty

**Checkpoint 3 — "Concurrency: the deep session"** ⬜
- [ ] A · Optimistic vs pessimistic
- [ ] B · Isolation levels + write skew (two-terminal demos)
- [ ] C · `SKIP LOCKED` scaling demo
- [ ] D · Outbox & delivery guarantees
- [ ] Self-check passed (7 questions)

---

## Phase 4 — Geospatial ★ ⬜

**Exit criteria**
- [ ] Requests reach only k-ring drivers, filtered by type and availability
- [ ] p99 match latency < 100 ms @ 10,000 drivers
- [ ] PostGIS vs H3 benchmark documented, crossover identified
- [ ] Declined/expired offers cascade automatically
- [ ] Tampered quote signature rejected
- [ ] Client-supplied `distance_km` ignored

**Checkpoint 4 — "Geospatial indexing, and why hexagons"** ⬜
- [ ] Taught · [ ] Benchmark run by you · [ ] Self-check passed

---

## Phase 5 — Security ⬜

**Exit criteria**
- [ ] Existing users silently upgraded to Argon2id on login
- [ ] Unauthenticated socket cannot connect
- [ ] `join_room` exploit no longer possible (handler removed)
- [ ] Forged `driver_location_update` dropped
- [ ] `ADMIN_LEVEL*` gone from the codebase
- [ ] Broken controller (`WHERE` removed) still returns only caller's rows under RLS
- [ ] `/login` rate-limited
- [ ] Refresh replay revokes the whole family

**Checkpoint 5 — "Authentication, authorization, and defense in depth"** ⬜
- [ ] Taught · [ ] You ran the IDOR exploit against your own app · [ ] Self-check passed

---

## Phase 6 — Events ⬜

**Exit criteria**
- [ ] Every state change visible in Redpanda Console
- [ ] Topic replay rebuilds the analytics projection identically
- [ ] Killing 1 of 2 API instances drops no client events
- [ ] Poisoned message → DLQ, partition keeps moving
- [ ] Double-replay → no duplicate side effects

**Checkpoint 6 — "Event-driven architecture and delivery guarantees"** ⬜
- [ ] Taught · [ ] Replay demo done · [ ] Self-check passed

---

## Phase 7 — Observability ⬜

**Exit criteria**
- [ ] One trace spans browser → API → SQL → Valkey → Redpanda → back
- [ ] SLOs documented with measured p50/p95/p99
- [ ] 500 concurrent riders sustained, error rate flat
- [ ] +500 ms DB latency → graceful degradation, no corruption
- [ ] Valkey killed → PostGIS fallback still matches
- [ ] Every `pg_stat_statements` slow query addressed

**Checkpoint 7 — "Percentiles, traces, and Little's Law"** ⬜
- [ ] Taught · [ ] Pool-size experiment run · [ ] Self-check passed

---

## Phase 8 — Frontend ⬜

**Exit criteria**
- [ ] Lighthouse ≥ 90 (performance, a11y, best practices)
- [ ] 200 drivers animating at sustained 60 fps
- [ ] Silent token refresh mid-session
- [ ] Full keyboard nav + screen-reader labels
- [ ] No component > 250 lines
- [ ] Socket reconnect restores state without reload

**Checkpoint 8 — "Server state, client state, and the 60fps budget"** ⬜
- [ ] Taught · [ ] DevTools profile comparison done · [ ] Self-check passed

---

## Phase 9 — Hardening ⬜

**Exit criteria**
- [ ] `npm test` runs the full pyramid
- [ ] CI green on a clean clone
- [ ] Coverage ≥ 80% on `services/` and `db/`
- [ ] Every ADR has context, decision, consequences
- [ ] `query()` no longer a 52-edge god node in the regenerated graph
- [ ] Clone → running system using only the README

**Checkpoint 9 — "Testing what actually matters"** ⬜
- [ ] Taught · [ ] Watched the concurrency test fail with the index dropped · [ ] Self-check passed

---

## Benchmarks

Filled in as we measure. Empty cells are honest — we haven't run them yet.

### Matching latency (Phase 4)

| Drivers | PostGIS p50 | PostGIS p99 | H3+Valkey p50 | H3+Valkey p99 | Winner |
|---|---|---|---|---|---|
| 100 | — | — | — | — | — |
| 1,000 | — | — | — | — | — |
| 10,000 | — | — | — | — | — |

**Crossover point:** _TBD_

### API under load (Phase 7)

| Scenario | RPS | p50 | p95 | p99 | Error % |
|---|---|---|---|---|---|
| Steady state, 500 riders | — | — | — | — | — |
| Thundering-herd accept (50→1 ride) | — | — | — | — | — |
| Sustained location stream | — | — | — | — | — |
| Payment burst | — | — | — | — | — |

### Connection pool sizing (Phase 7 checkpoint)

| Pool size | Throughput (req/s) | p99 (ms) |
|---|---|---|
| 5 | — | — |
| 10 | — | — |
| 50 | — | — |
| 100 | — | — |

### Frontend (Phase 8)

| Metric | Before (Leaflet) | After (MapLibre + deck.gl) |
|---|---|---|
| FPS @ 200 markers | — | — |
| Lighthouse performance | — | — |
| Bundle size (gz) | — | — |

### Graph evolution

| Phase | Nodes | Edges | `query()` edges | Communities |
|---|---|---|---|---|
| Baseline (2026-07-28) | 278 | 506 | **52** | 26 |
| After Phase 3 | — | — | — | — |
| After Phase 9 | — | — | target ~8 | — |

---

## Defect burndown

| Severity | Total | Fixed | Remaining |
|---|---|---|---|
| P0 | 7 | 6 | 1 *(SSLCommerz sandbox creds — no live risk, deferred to Phase 3/4)* |
| P1 (security) | 6 | 0 | 6 |
| P1 (correctness) | 9 | 1 | 8 *(withTransaction now exists and is proven correct; wiring it into the 16 controllers that still use bare `query()` is Phase 3's job — P1-6 is "primitive built", not "fully resolved")* |
| P2 | 28 | 7 | 21 *(+P2-8 migrations, P2-11 precheck trigger recovered & applied, P2-17 graceful shutdown)* |
| **Total** | **50** | **14** | **36** |

P0 total rose from 5 to 7: P0-6 (uninstalled deps) and P0-7 (empty `PG_PASSWORD`, no database)
were only discoverable by running the code. P0-3 (`.env` in git history) is resolved via **rotation**,
not history purge — see the Phase 0 decision note. The remaining leaked SSLCommerz sandbox
credentials carry no real risk (test money only) and are deferred, not urgent.

---

## Changelog

### 2026-07-28
- Read all 26 source files; skipped re-running graphify (`graphify-out/` already present — 278 nodes, 506 edges, 26 communities).
- Live web research on the 2026 tool landscape across 8 queries.
- **Confirmed the backend cannot boot:** `tokenBlacklist.js:7` SyntaxError (verified via `node --check`), `routes.js:46` undefined handler.
- **Confirmed secret leak:** `backend/.env` tracked since `6749d1d`, pushed publicly. 1,145 `node_modules` files also tracked.
- Registered 48 defects across P0/P1/P2.
- Authored `ULTIMATE_REFINEMENT_PLAN.md`, `plan.md`, `progress.md`.
- Locked decisions D1–D7.

**Phase 0 executed (same day):**
- Fixed P0-1 (`tokenBlacklist.js:7` SyntaxError) and P0-2 (`routes.js:4` missing import). All 32 routes register.
- Fixed P0-5: removed the hardcoded DB password fallback, added a fail-fast guard.
- **Discovered P0-6** — `socket.io` and `sslcommerz-lts` declared but never installed. Ran `npm install`.
- **Discovered P0-7** — `PG_PASSWORD` empty and no Postgres anywhere; the app had been living on the
  hardcoded fallback. Pulled `docker-compose.yml` forward from Phase 1.
- Untracked 1,149 files (`node_modules`, `.DS_Store`, stray logs) + staged `.env` removal: **1213 → 61** tracked.
- Hardened `.gitignore`; added `backend/.env.example`; deleted dead `public/index.html` and its static middleware.
- Rotated the Postgres password; stood up Postgres 17 + PostGIS and Valkey 8 via Compose; applied
  `schema.sql` + `functions.sql` (11 tables, 2 functions, 1 trigger, 1 procedure).
- **Verified: the backend boots for the first time in its committed history.** `/db-health` → 200.
  Full E2E confirmed: register → login → authorized request → logout → token correctly blacklisted.
- **Rotated `JWT_SECRET` and `ADMIN_LEVEL1/2`**, generated and written directly to `backend/.env`
  without ever displaying the values. **Proved the rotation live**: captured a token signed under the
  old (leaked) secret — confirmed it worked (403, valid signature, no role yet) — swapped the secret,
  restarted, replayed the *same token* — got 401 "invalid signature". Fresh login under the new secret
  still succeeds. This is the strongest evidence Phase 0 needed.
- **User decision: descoped the git history purge.** Correctly pushed back that rotation, not history
  rewriting, is what neutralizes the actual risk — purging is hygiene with real cost (SHA rewrite,
  force-push, breaks existing clones) and little benefit once secrets are dead. Deferred indefinitely.
- **User decision: no SSLCommerz sandbox account access.** Deferred fresh registration to Phase 3/4
  when payment work actually begins — old leaked sandbox creds are inert (test money only).
- **Phase 0 is functionally complete.** Only the teaching checkpoint remains before Phase 1.
- Committed as `5f91bb9` — 1,162 files changed. Nothing pushed; local `main` only.

**Phase 1 executed (same day, user said "lets go"):**
- Added `backend/config.js` — single Zod-validated source of truth for the whole environment,
  replacing scattered `process.env.X` reads and the Phase-0-era ad hoc `required()` check in `db.js`.
  Proved aggregated error reporting: two simultaneously broken vars produced one combined error
  listing both, not a serial one-crash-at-a-time discovery.
- Rewrote `database/db.js`: pool now built from `config`, added `withTransaction()` (retry on
  `40001`/`40P01` with full jitter, isolation-level support, `actorId` hook for Phase 5's RLS).
  Proved rollback-on-throw, proved a genuine `40001` under manually forced contention, proved the
  retry loop recovers 10/10 real concurrent conflicts with zero lost updates.
- Set up `node-pg-migrate`: 3 migrations porting `schema.sql` + `functions.sql` + the never-applied
  `precheck_info` trigger verbatim (no redesign — that's Phase 2). Proved full down→empty→up
  round-trip against the real database, not just a dry run.
- **Recovered and applied `precheck_info_trigger` for the first time in this project's history** —
  it existed as an orphaned, never-sourced file. Functionally tested: correctly rejects a non-Gmail
  email and a malformed BD phone number, accepts valid data.
- Deleted `schema.sql`, `functions.sql`, `func precheck_info.sql` — fully superseded by migrations,
  content preserved in migration files and git history.
- Wrote `database/seed.js` — idempotent (proven: ran twice, zero duplication), replaces the 170
  commented-out lines that used to sit dead in `schema.sql`. Proved seeded credentials work through
  a real login → ride-history round trip against the running API.
- Added `pino`/`pino-http` structured logging with per-request correlation IDs; fixed `shutdown()`
  to actually drain (`server.close()` → `io.close()` → `closePool()` → exit), with a 10s force-exit
  safety timeout. Proved the drain works with a deterministic synthetic-slow-route test.
- **Found and fixed two new bugs while building this**: `dotenv.config()` resolving against CWD
  instead of `__dirname` (same bug class as Phase 0's `express.static` fix), and `node-pg-migrate`
  failing silently via `npx.cmd` on Windows (fixed by invoking its entry script with `node` directly).
- **All 6 Phase 1 exit criteria proven with real, falsifiable tests** — see the Phase 1 section above.
- **Status: no controllers touched yet.** `query()` still works exactly as before; `withTransaction`
  is a tested, standalone primitive. Migrating the 16 controllers onto it is Phase 3's explicit job.
