// Single source of truth for this app's environment. Validated once, here,
// at import time — every other module reads FROM this object, never from
// process.env directly. Two things that buys you:
//
//   1. One clear, complete error listing at boot instead of discovering
//      missing vars one crash at a time (PG_PASSWORD today, JWT_SECRET
//      tomorrow, each after you'd already fixed the last one).
//   2. Types. `config.PG_PORT` is a number, not the string '5432' that a
//      naive `process.env.PG_PORT` would hand you.
//
// See ULTIMATE_REFINEMENT_PLAN.md §1.3 (P0-5) for why silent fallbacks
// (the old `|| 'NewPassword123'`) are the thing this replaces.

const path = require('path');
// Resolve against __dirname, not the process cwd — otherwise this breaks
// depending on which directory a script was launched from (exactly the
// P2-15 bug already fixed once in startPoint.js's express.static call).
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { z } = require('zod');

const schema = z.object({
    // ── Server ──────────────────────────────────────────────────────
    PORT: z.coerce.number().int().positive().default(4000),

    // ── Auth ────────────────────────────────────────────────────────
    // 32 chars is a floor, not a target — a proper secret is 32+ random
    // bytes, base64-encoded. This just catches "forgot to set it" and
    // "set it to something trivial".
    JWT_SECRET: z.string().min(32,
        'JWT_SECRET must be at least 32 characters. Generate one with:\n' +
        '     node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'base64url\'))"'),

    // ⚠️ Deprecated shared-secret admin bootstrap — removed in Phase 5.
    // Required for now because register.js still reads them.
    ADMIN_LEVEL1: z.string().min(1, 'ADMIN_LEVEL1 is required (temporary — removed in Phase 5)'),
    ADMIN_LEVEL2: z.string().min(1, 'ADMIN_LEVEL2 is required (temporary — removed in Phase 5)'),

    // ── PostgreSQL ──────────────────────────────────────────────────
    PG_HOST: z.string().min(1).default('localhost'),
    PG_PORT: z.coerce.number().int().positive().default(5432),
    PG_DATABASE: z.string().min(1).default('postgres'),
    PG_USER: z.string().min(1).default('postgres'),
    // No default. A missing password must fail loudly, not fall back to
    // a guessable one — that silent-fallback bug is exactly what P0-5 was.
    PG_PASSWORD: z.string().min(1, 'PG_PASSWORD is required — there is deliberately no default'),

    // ── SSLCommerz ──────────────────────────────────────────────────
    // Optional for now: no sandbox account exists yet (deferred to
    // Phase 3/4, see progress.md). The app must still boot without one;
    // only the /payment/* routes would fail at request time.
    SSLCOMMERZ_STORE_ID: z.string().optional().default(''),
    SSLCOMMERZ_STORE_PASSWORD: z.string().optional().default(''),
    SSLCOMMERZ_IS_SANDBOX: z.enum(['true', 'false']).default('true'),

    // ── URLs ────────────────────────────────────────────────────────
    FRONTEND_URL: z.string().url().default('http://localhost:5173'),
    BACKEND_URL: z.string().url().default('http://localhost:4000'),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
    console.error('\n❌ Invalid environment configuration:\n');
    for (const issue of parsed.error.issues) {
        console.error(`   ${issue.path.join('.')}: ${issue.message}`);
    }
    console.error('\n   Copy backend/.env.example to backend/.env and fill in the missing values.\n');
    process.exit(1);
}

module.exports = parsed.data;
