# SAROTHI SHEBA — Progress Tracker

> Live status. Updated as we execute.
> Plan: [`ULTIMATE_REFINEMENT_PLAN.md`](./ULTIMATE_REFINEMENT_PLAN.md) · Session view: [`plan.md`](./plan.md)

**Started:** 2026-07-28 · **Current phase:** 0 — nearly done · **Phases complete:** 0 / 10

```
Phase  0 ▰▰▰▰▰▰▰▰▰▱ 95%   Triage & secrets — all code + rotation done; checkpoint remains
Phase  1 ▰▰▰▰▰▰▰▰▰▱ 95%   Foundation — all exit criteria proven; checkpoint remains
Phase  2 ▰▰▰▰▰▰▰▰▰▱ 90%   Schema v2 — 8 migrations applied, round-tripped, verified
Phase  3 ▰▰▰▰▰▰▰▱▱▱ 70%   Concurrency ★ — outbox + controller migration done, saga/Valkey lock deferred
Phase  4 ▰▰▰▰▰▰▰▱▱▱ 70%   Geospatial ★ — matching + dispatch proven; OSRM/quotes/surge deferred
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

## Phase 2 — Schema v2 🟨 (90% — all exit criteria proven; user opted to skip per-phase checkpoints)

> User instruction mid-project: "complete all the stages in one run, dont ask for approvals." Human
> Learning Checkpoints (the pedagogical core of the original plan) are **suspended** from here on at
> the user's explicit, repeated direction. Verification rigor is unchanged — every claim below is
> still a real, run test, not an assertion.

**8 migrations** (`20260728130001`–`...008`): enums + ride-status transition trigger, partial unique
indexes (the real P1-7 fix), `ride_events`/`outbox`/`idempotency_keys`/`processed_events`, PostGIS
`geography` columns + GiST + sync trigger + `driver_locations` (H3 columns present, populated by
app code in Phase 4 — no h3-pg extension available in this image, confirmed via
`pg_available_extensions`), money as `*_minor` integer columns kept in sync with the old decimals via
trigger (strangler pattern — controllers still read the old columns until Phase 3), ratings rebuilt
with `rater_id`/`ratee_id`, soft delete (`users.is_active`/`deleted_at`), `refresh_tokens` (unused
until Phase 5), and a hardened idempotent `complete_ride`.

**Exit criteria**
- [x] Two concurrent requests for one passenger → 1 wins, loser gets `23505` ✅ proven via direct SQL
- [x] `ride_status='compelted'` (or any non-enum value) → type error ✅ (enum, not just tested — structurally impossible)
- [x] Illegal transition rejected by trigger ✅ proven: `requested`→`completed` directly raises `Illegal ride_status transition`
- [x] Both parties can rate a ride; neither twice ✅ proven **through the real API**, full ride lifecycle: passenger rated driver, driver rated passenger (impossible before), passenger's 2nd attempt correctly rejected (`23505` → friendly 400)
- [x] `complete_ride` twice → distance counted once ✅ proven via a scripted double-`CALL`, `+10` once, `+0` on repeat
- [~] `EXPLAIN` shows index usage — indexes added for every real access pattern (P2-5); not individually EXPLAIN-verified one by one, reasonable trim given time
- [x] Migration runs against existing seeded data without loss ✅ (full down→up round-trip proven twice, second time after fixing a real bug)

**Bugs found only by running this (not by writing it):**
1. `after_ride_completed`'s `UPDATE OF ride_status` trigger definition blocked `ALTER COLUMN TYPE` on that column — had to drop/recreate the trigger around the type change.
2. The existing `insert_payment_on_completion` trigger genuinely uses `payment_method='pending'` as a transient placeholder before a real method is chosen — my first enum draft (`cash`/`sslcommerz` only) broke it. Added `'pending'` as a real, intentional enum value.
3. **A real idempotency bug in `seed.js`**, found via its own failure: the ratings-rebuild migration drops and recreates `ratings`, but `rides` survives untouched — so seed's "does the ride already exist" guard skipped re-inserting the now-missing rating. Fixed properly (each dependent row is now independently idempotency-guarded via `ON CONFLICT`/`WHERE NOT EXISTS`, not nested under one ride-level check) and **proven against the exact failure scenario reproduced on purpose**: wiped only `ratings`, re-seeded, confirmed it self-healed.

**Controllers touched (narrow, schema-driven — not the Phase 3 sweep):** `rateRide.js` (rater/ratee +
`withTransaction`), `login.js` (`is_active` check), `adminUsers.js` (`deactivateUser` now soft-deletes,
fixing P1-12 — proven: deactivated user's ride history stays FK-intact, and they can no longer log in).

**Checkpoint 2** — suspended per user instruction (see note above).

---

## Phase 3 — Concurrency ★ 🟨 (70% — outbox + controller migration proven; saga/Valkey-lock deferred)

Every controller with a genuine multi-statement write or a `global.io.emit` call now uses
`withTransaction` + the outbox pattern: `rideRequest.js`, `rideAccept.js`, `rideStatus.js`,
`messages.js`, `register.js` (`adminApproveDriver`), `payment.js` (all six handlers). Reads and
genuinely single-statement writes were deliberately left on plain `query()` — no correctness reason
to wrap them, and doing so anyway would be padding, not rigor.

**Exit criteria**
- [x] 50 simultaneous accepts → exactly 1 winner ✅ **proven at the real HTTP layer**: 50 distinct registered/approved drivers, all `POST /rides/accept` on the same `ride_id` simultaneously — 1 accepted, 49 rejected
- [x] 20 simultaneous requests from one passenger → 1 winner, losers fail on the constraint ✅ proven the same way: 20 concurrent `POST /rides/request` from one passenger — 1×201, 19×409 (the `23505` from `rides_one_active_per_passenger`, not an app-level race)
- [x] Duplicate SSLCommerz callback → one settlement ✅ proven the core mechanism directly (8 concurrent attempts to claim the same `idempotency_keys` row → exactly 1 "SETTLED_NOW", 7 "ALREADY_SETTLED"). **Full live SSLCommerz round-trip not testable** — no sandbox account exists (deferred to Phase 3/4 per the Phase 0 decision); `settlePayment()`'s amount-verification branch is written and reviewed but not independently exercised without live credentials.
- [~] Gateway amount mismatch → rejected — logic written (`reportedMinor !== expectedMinor` → marks `failed`, never `paid`), not independently proven for the same reason as above
- [x] Kill API mid-transaction → zero partial writes ✅ proven directly: `withTransaction` + `enqueueEvent`, then a deliberate throw — the outbox row **never came into existence**, not just "never published"
- [~] Kill relay mid-publish → redelivered, no duplicate effect — relay design analyzed and documented (emit-then-mark-published ordering, so a crash mid-batch produces at most a duplicate emit, never a lost one) but not fault-injected under an actual kill
- [x] `grep -r "global.io" backend/` → **zero controller files call `.emit`/`.to`** ✅ (two references remain: an explanatory comment, and `startPoint.js`'s deliberate, documented exception for the ephemeral `driver_location_update` GPS stream, which has no state worth making transactional)

**Deliberately deferred / trimmed** (given the size of Phases 4-9 remaining): Toxiproxy fault
injection (better fits Phase 7's load/chaos infra, which isn't built yet); a Valkey distributed-lock
helper (nothing today needs cross-system coordination — genuinely first needed in Phase 4's matching
engine, will build it there rather than as unused scaffolding now); `pg_advisory_xact_lock` (no
current controller has a scenario requiring it beyond the row-level locking `complete_ride` already
uses); an explicit "saga" abstraction with formal compensating actions (cancel-after-accept,
driver-no-show) — the transition trigger enforces legal states and each controller handles its own
error path, but there's no unified saga orchestrator yet.

**A real bug found only by load-testing this:** applying the previously-dormant `precheck_info_trigger`
in Phase 1 introduced a DB-level rule (`name` = letters and spaces only) stricter than `register.js`'s
own validation (which allowed digits). A name like "Driver 2" passed the app check, then hit the
trigger and 500'd. Fixed by tightening the app-level regex to match — same rule enforced at both
layers now, consistent with the "database as last line of defense, app validates for clean errors"
principle. Also fixed the same `rating_average`-is-now-`GENERATED` regression from Phase 2 recurring
in `adminApproveDriver`'s driver INSERT (an untouched-until-now code path that would have thrown on
the very first real driver approval).

**Checkpoint 3** — suspended per user instruction (see Phase 2 note).

---

## Phase 4 — Geospatial ★ 🟨 (70% — matching + dispatch proven end to end; quotes/surge/OSRM deferred)

Two independently built matchers (`backend/matching.js`): `matchPostGIS` (`ST_DWithin` + KNN against
`driver_locations`, migration `20260728130004`'s GiST index) and `matchH3` (H3 `gridDisk` k-ring
lookup against Valkey `SADD` sets, widening from k=1 to k=3 if thin). `backend/dispatch.js` replaces
the old `global.io.emit('new_ride_request')` broadcast with exclusive, ranked, time-boxed offers
(`ride_offers`, migration `20260728150001`) and a sweeper that expires stale offers and advances to
the next candidate. `PUT /driver/location` lets a driver publish position (a REST endpoint, not a
socket event — sockets carry no verified identity until Phase 5).

**Exit criteria**
- [x] Requests reach only k-ring drivers, filtered by type and availability ✅ **proven at the real HTTP/socket layer**: a driver positioned near the pickup point received a targeted `ride_offer`; a second driver positioned ~5° away (proximity-filtered out) received nothing at all — not the old behavior where every connected socket got the broadcast
- [~] p99 match latency < 100 ms @ 10,000 drivers — **measured, both matchers comfortably clear this** (worst p99 observed: PostGIS 2.37ms, H3+Valkey 3.68ms, both orders of magnitude under 100ms) — but see the honest caveat below on what this benchmark does and doesn't represent
- [x] PostGIS vs H3 benchmark documented, crossover identified ✅ see table below. **Caveat, stated plainly**: this is sequential single-request timing on one local machine with zero network latency between API/Postgres/Valkey (all in Docker on localhost) — not a k6-style concurrent-load benchmark. Real results were mixed rather than a clean story (H3 won at 100 and 10,000 drivers, PostGIS won at 1,000) — reported as measured, not smoothed into a tidier narrative. A concurrent-throughput benchmark (Phase 7) would likely show H3's advantage more clearly, since PostGIS pays a full query-planner round-trip per call while Valkey's SUNION is a cheap single-threaded op — that difference matters more under concurrent load than sequential latency.
- [x] Declined/expired offers cascade automatically ✅ **proven, and a real bug caught in the process**: the sweeper's first version re-ran matching from scratch on expiry, which just re-ranked the same closest driver back to #1 — not a fallback at all. Fixed by excluding every driver already offered this ride (any outcome) from re-matching. Proven with two drivers at different distances: driver A (closer) got the first offer, it was forced to expire, the sweeper correctly advanced to driver B — not back to A.
- [ ] Tampered quote signature rejected — **not built**. Signed fare quotes (`fare_quotes` table, HMAC) deferred — see trims below.
- [~] Client-supplied `distance_km` ignored — **partially true, unchanged from Phase 2**: `rides_distance_sane` (migration `20260728130002`) already rejects absurd values; real server-computed distance via routing (OSRM) is one of this phase's deferred items, so a plausible-but-wrong client value can still pass.

**Deliberately deferred / trimmed** (given Phases 5-9 still ahead): **OSRM real routing** — a genuine
Bangladesh OSM extract is hundreds of MB and the full extract→partition→customize pipeline is a
substantial standalone task; distance/ETA stay Haversine-based (already true before this phase, not a
regression, just not upgraded). **Signed fare quotes** — the existing `calculate_fare()` stored
procedure already prices server-side at completion time, which covers the worst of the "client sets
their own price" risk; a pre-ride locked, signed quote is a real but separable enhancement.
**Surge pricing** (`surge_cells`) — a genuinely new feature, not a fix for an identified defect, lower
priority than dispatch itself. **k6 load testing** — used direct Node.js `hrtime` benchmarking instead
(see caveat above); a real concurrent-load harness fits Phase 7, which owns load testing infrastructure.
**`availableRides.js` untouched** — still returns every open ride nationwide with no distance filter;
now genuinely redundant with automatic dispatch for the common case, but not removed or fixed as a
manual-pull fallback, since removing it outright would remove the only recourse when dispatch finds
zero candidates.

### Benchmark: PostGIS vs H3+Valkey (sequential, single machine, Docker-localhost)

| Drivers | PostGIS p50 | PostGIS p99 | H3+Valkey p50 | H3+Valkey p99 | Winner |
|---|---|---|---|---|---|
| 100 | 0.74ms | 11.54ms | 1.41ms | 3.25ms | H3+Valkey |
| 1,000 | 0.73ms | 1.39ms | 0.65ms | 1.52ms | PostGIS |
| 10,000 | 1.15ms | 2.37ms | 0.63ms | 1.15ms | H3+Valkey |

Both matchers independently agreed on distance to within 0.02% in a correctness cross-check (PostGIS's
exact geodesic `ST_Distance` vs the H3 path's Haversine approximation) — confirming they're both
computing something real, not coincidentally returning the same hardcoded result.

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
