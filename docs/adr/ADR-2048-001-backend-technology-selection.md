## ADR-2048-001 — Backend Technology Selection for Player Profiles

**Date:** 2026-07-08
**Status:** Accepted
**Author:** Software Architect (AI Employee)
**Approved by:** Valy (Director), 2026-07-08 — Option 4 (Vercel + Turso), approved explicitly for its zero-cost profile
**Supersedes:** N/A
**Superseded by:** N/A

---

### Context

The 2048 game is moving from a purely static, backend-less frontend (HTML/CSS/JS opened directly via `file://`, leaderboard stored in `localStorage`) to a client-server architecture that supports named player profiles with per-profile game history and a personal leaderboard. The functional requirements are frozen in `docs/specs/WU-2048-005-player-profiles.md` (approved by the Director on 2026-07-08).

The relevant forces this decision must balance:

- **Hobby scale.** Single Director, portfolio project. Realistic concurrent-user count is single-digit, most of the time zero. Any architectural choice that assumes production-scale traffic is a mismatch.
- **Very low operational budget.** No paid infrastructure has been authorized. Free tiers or free hobby tiers are required; anything else is an escalation to the Director.
- **Minimal read/write volume.** Writes: one row on profile creation, one row per completed game. Reads: a small profile list on page load, and history/leaderboard on demand when the modal is opened. This workload fits inside any modern database with orders of magnitude to spare.
- **No authentication.** Profiles are keyed by name (1-12 chars), server-assigned unique ID, no password/PIN. The only server-side security concern is trivial write-path abuse (e.g., a bot POSTing implausibly high scores), which requires simple sanity checks — not an auth system.
- **Frontend constraint to preserve.** The frontend is deliberately dependency-free — no build step, no bundler, `game-logic.js` is a UMD-lite classic script exposing `globalThis.GameLogic` specifically so `index.html` opens directly from disk. Adding a backend does not intrinsically require touching that: `fetch()` works from classic scripts, no ES modules or build tooling are needed on the frontend even to call an HTTP API.
- **Team.** The Frontend Engineer already uses JavaScript and Vitest (see `package.json`). Backend Engineer, Database Engineer, and DevOps Engineer are activated for this scope change and will inherit whatever stack is chosen.
- **Standards to apply.** IA Engineering's Code Quality and Testing Standards apply to backend code equally — the backend must be lintable, formattable, and testable with an official framework.

The decision needed is: a coherent set of choices for (a) backend language/runtime, (b) framework, (c) database/storage, (d) API style, (e) hosting model, and (f) how the frontend integrates with the API without regressing the "just open the file" property.

---

### Options Considered

Four options were evaluated (Option 4 added 2026-07-08 at the Director's request, after the Fly.io cost correction). A fifth option — direct-from-frontend BaaS (Supabase/Firebase) — was considered but rejected before formal evaluation and is discussed in the Rationale.

#### Option 1 — Node.js + Express + SQLite (via `better-sqlite3`), hosted on Fly.io

A single Node.js process runs an Express HTTP server that exposes a small REST API. Data is persisted in a single SQLite file on a Fly.io persistent volume. The API and (optionally) the static frontend assets are served by the same process. Vitest — already in the project's `devDependencies` — is the backend test framework.

Data model (SQLite):
- `profiles(id INTEGER PK AUTOINCREMENT, name TEXT NOT NULL CHECK(length(name) BETWEEN 1 AND 12), created_at TEXT NOT NULL)`
- `games(id INTEGER PK AUTOINCREMENT, profile_id INTEGER NOT NULL REFERENCES profiles(id), score INTEGER NOT NULL CHECK(score >= 0), played_at TEXT NOT NULL, result TEXT NOT NULL CHECK(result IN ('win','loss')))`
- Personal leaderboard is a derived view: `SELECT score, played_at, result FROM games WHERE profile_id = ? ORDER BY score DESC, played_at DESC LIMIT 10`.

REST endpoints (indicative — Backend Engineer will finalize exact shapes):
- `POST /api/profiles` → create profile (body: `{ name }`, returns `{ id, name }`)
- `GET /api/profiles/:id` → fetch profile
- `GET /api/profiles?ids=1,2,3` → batch fetch known-profile names for the frontend's selector (FR-013)
- `POST /api/profiles/:id/games` → record a completed game (body: `{ score, result }`; `played_at` is server-assigned)
- `GET /api/profiles/:id/games` → full history in reverse chronological order (FR-008)
- `GET /api/profiles/:id/leaderboard` → top 10 by score, tie-broken by recency (FR-010)

Pros:
- **Same language across the whole stack.** The Frontend Engineer already reads and writes modern JavaScript. Server-side JS uses the same idioms, the same `Array`, the same `JSON.parse`. The `game-logic.js` UMD pattern even leaves room to reuse pure helpers server-side if we ever need to (e.g., score validation) with zero porting.
- **Same test framework.** Vitest is already a project dependency; backend tests slot in alongside `game-logic.test.js` with no new tooling. This directly satisfies the Testing Standard's "Standards First" clause without introducing a second test runtime.
- **SQLite is right-sized.** File-based, zero-service-to-manage, transactional, ACID, easily backed up (copy one file). At this workload it will spend 99.99% of its time idle. `better-sqlite3` is a synchronous native driver — trivial ergonomics, prepared statements, well-documented.
- **Express is minimal and boring.** Small API surface, mature (12+ years), extensive documentation, stable enough that skills don't rot. Not fashionable, but for a 6-route CRUD API that's a virtue.
- **Fly.io hosting is expected to be low-cost at this scale**, pending verification of current metering terms (see Consequences — Negative for the concrete estimate). A single small VM with a mounted volume for the SQLite file is enough; it can autostop when idle to reduce cost further.
- **No build step required on either side.** Backend runs `node server.js`; frontend still has no bundler.

Cons:
- **A backend process is a thing to keep alive and monitor.** Compared to a purely static site (previous state), there is now a process that can be down, a volume that can fill up, and a hosting account whose free-tier terms can change. This is real ops surface where before there was none.
- **File-based SQLite couples the app to a single host.** Horizontal scaling would require a migration (e.g., to Turso/libsql, or Postgres). Given the scale, this is acceptable but should be noted.
- **Fly.io free-tier terms may change.** Locking to a specific provider isn't ideal, though the app (Node + Express + SQLite) is portable to any provider that runs a container or a Node process (Render, Railway, a $5 VPS, Deno Deploy with adaptation, etc.).
- **Node's ecosystem invites dependency creep.** Discipline is required to keep dependencies to `express` and `better-sqlite3` plus dev-only tooling. The Code Quality Standard's "eliminate dead code / avoid unnecessary complexity" clause applies directly.

#### Option 2 — Python + FastAPI + SQLite, hosted on Fly.io or Render

Same data model and same REST API shape as Option 1, implemented in Python 3 with FastAPI (Starlette + Pydantic). SQLite via the stdlib `sqlite3` module or SQLAlchemy Core. Pytest as the test framework.

Pros:
- **FastAPI is genuinely excellent** at the small-API scale: Pydantic gives free request/response validation, OpenAPI schema is auto-generated, type hints double as documentation. Argument validation for score bounds, name length, etc. is declarative rather than hand-rolled.
- **Python has a large, well-documented ecosystem** and is a common baseline for polyglot AI Employees.
- **SQLite is a first-class citizen** in Python (stdlib module).

Cons:
- **Second language in the project.** The stack becomes JS (frontend) + Python (backend). Anyone touching one side must switch mental models — the Frontend Engineer has no reason to work in Python, and the "reuse `game-logic.js` helpers server-side" path disappears.
- **Second test framework.** Pytest instead of Vitest — the Testing Standard permits both, but the project already uses Vitest and adding pytest is a net increase in tooling surface for no operational benefit at this scale.
- **Python runtimes are slightly heavier to package/deploy** (need a Dockerfile with the right Python version, dependencies installed, gunicorn/uvicorn configured). Fly.io/Render can do this fine, but there are more moving parts than a `node server.js` boot.
- **FastAPI's real strengths (async concurrency, dependency injection, OpenAPI, Pydantic validation) mostly serve production APIs.** At 0-10 concurrent users writing one row per game, we would not touch most of them.

#### Option 3 — Cloudflare Workers + D1 (serverless, edge)

Backend as a Cloudflare Worker (JavaScript/TypeScript), with D1 (Cloudflare's managed serverless SQLite) as the database. Frontend hits `https://<worker>.workers.dev/api/...` via `fetch`.

Pros:
- **Zero long-running process to manage.** Workers scale to zero when idle. There is no VM, no volume, no health check. Ops surface is close to nothing.
- **Generous free tier.** Cloudflare's Workers and D1 free tiers are well beyond what this workload will ever consume.
- **Global edge deployment for free.** Not needed here, but a nice side-effect.
- **Still JavaScript.** Same language considerations as Option 1.

Cons:
- **Workers-specific runtime, not full Node.** Standard Node APIs like `fs`, native modules like `better-sqlite3`, and the classic Express request/response model do not run under Workers. The backend code must be written against the Workers request handler API and use D1's client. This is a real amount of vendor-shaped code.
- **Vendor lock-in.** Porting away from Workers/D1 later is not free — it's not just changing hosting providers, it's rewriting handlers and the DB access layer. For a portfolio project meant to demonstrate architectural competence, that lock-in reads worse than a boring portable Node process.
- **Local development is slightly more awkward.** Requires `wrangler` and either a local D1 emulator or a preview environment. Compared to `node server.js` against a local `.sqlite` file, this is friction added for a benefit (edge deployment) we don't need.
- **Cold-start behavior and per-request CPU budget** are practical concerns to reason about, even if this workload never approaches the limits. It's cognitive overhead the alternative doesn't have.

#### Option 4 — Node.js (Vercel serverless functions) + Turso (managed libSQL)

Backend as a set of Node.js serverless functions on Vercel's Hobby tier. Each function is a short-lived, stateless invocation of a handler written in standard Node/JavaScript. An Express app can be wrapped and exported as a single Vercel serverless handler (a well-documented pattern via `@vercel/node`), so route definitions, middleware, and error handling remain recognizable Express — but the process itself is not long-running and holds no in-memory state between invocations. Persistence is provided by Turso, a hosted libSQL (a SQLite fork/superset) service accessed over the network via `@libsql/client`. The database is not a local file; it is a remote endpoint the functions talk to. Frontend integrates over HTTP with permissive CORS, same as Options 1-3; deployed URL is `https://<project>.vercel.app`.

Data model (Turso / libSQL): **identical to Option 1.** The `profiles` and `games` schemas transfer as-is — libSQL is SQLite-compatible at the SQL and schema level. The personal-leaderboard derived query is unchanged.

REST endpoints: **identical shape to Option 1.** Every route handler, however, is `async` and every DB call is a network round-trip via `await client.execute({ sql, args })` — a real, code-visible departure from Option 1's synchronous `better-sqlite3` calls.

Pros:
- **Genuinely zero recurring cost is plausible at this scale** (pending verification, per Standards Applied). Vercel's Hobby tier is intended for non-commercial personal projects and covers this workload's traffic multiple orders of magnitude over. Turso's free tier historically covers a hobby project's storage and row-read/write volume comfortably. Neither has been fully confirmed by the Software Architect for current 2026 terms — same uncertainty caveat as Fly.io in Option 1.
- **Same language across the whole stack.** Language cohesion and Vitest test-framework cohesion are preserved. The Frontend Engineer's JavaScript skills transfer directly, `game-logic.js` helpers remain reusable server-side if ever needed, and the project stays inside one language and one test runner.
- **Portable data layer.** libSQL is open-source; Turso hosts it but does not own it. The schema and queries are ordinary SQLite. Migration off Turso later goes to plain SQLite, self-hosted libSQL, or (with a schema-level port) Postgres. This is a real portability advantage over Option 3's D1, which is Cloudflare-proprietary in its access pattern even though it is also SQLite-flavored.
- **Standard Node runtime, not a bespoke request-handler API.** Unlike Cloudflare Workers (Option 3), Vercel's Node.js function runtime accepts a standard `(req, res) => …` handler or a wrapped Express app. This means the backend code itself — routes, middleware, request/response idioms — remains conventional Node, not a rewrite against a vendor-shaped API. Lock-in is genuinely shallower than Option 3.
- **No process to keep alive, no volume to fill.** The operational surface Option 1 introduces (a live VM, a persistent volume, snapshot policy, downtime detection) mostly evaporates. Vercel and Turso own the uptime of the compute and storage tiers respectively.
- **Local development remains close to trivial**: `vercel dev` runs the functions locally, and Turso supports a local `libsql://` file URL for development so tests and dev do not require a network round-trip to Turso's hosted service. Vitest still runs against the same libSQL client with a local file URL — this preserves the Testing Standard's "no reason to mock the DB" property.

Cons:
- **The data-access layer is a real rewrite, not a hosting swap.** Every DB call under Option 1's design uses `better-sqlite3`'s synchronous API. Under Option 4 every call becomes async and network-bound: `await client.execute(...)`. Every route handler is `async`; every DB call needs promise-shaped error handling for transient network errors that literally cannot exist in Option 1. This is normal Node idiom for any non-embedded DB, but it is code the Backend Engineer would not have written under Option 1, and it is permanent architectural stickiness that outlasts the choice of host.
- **Vercel functions are stateless — an in-process rate-limiter design does not survive.** A `Map` of `ip → count/timestamp` held in a function invocation's memory is not shared across concurrent invocations and is destroyed on cold-start recycling. Under Option 4, rate limiting must be tracked in Turso itself (a small `rate_limits` table with a fixed-window counter) rather than in-process — a real, permanent design difference from what a Fly.io-hosted long-running process could do trivially.
- **Cold-start latency is real and user-visible.** For this game's traffic pattern (single Director, most of the day zero traffic), cold starts on Vercel functions will be common. The user-visible impact is that opening the page after inactivity may take an extra ~500ms-2s for the first `GET /api/profiles` and the first record-game write. Not catastrophic at hobby scale, but a regression relative to the current localStorage-based game's instant feel.
- **Non-code Vercel lock-in exists and is easy to underestimate.** Beyond the standard-Node handler, there is a `vercel.json` (or file-based routing convention) that encodes URL-to-function mapping, an environment-variable model, and deployment via the `vercel` CLI or GitHub integration. Migrating to a plain "Node process on a VPS" later is possible but not zero work. Real lock-in shape: shallower than Workers/D1, deeper than Fly.io's `fly.toml`.
- **Two providers on the critical path instead of one.** Option 1 has one hosting relationship (Fly.io). Option 4 has two (Vercel, Turso), each with its own account, free-tier terms, TOS, and outage domain — a real, if modest, increase in administrative surface for a project the Director maintains alone.
- **Free-tier terms unverified.** Same discipline as Option 1's Fly.io correction: the Software Architect has not personally confirmed current 2026 Vercel Hobby and Turso free-tier terms. DevOps Engineer verification is required before signup — see updated Standards Applied and Implementation Notes.

**Rejected without full evaluation — Backend-as-a-Service (Supabase/Firebase):** Skipping a custom backend entirely by having the frontend call a managed Postgres/Firestore directly is tempting for a hobby project. It was rejected because (a) the Director-approved roster (`CLAUDE.md`) explicitly activates Backend Engineer, Database Engineer, and DevOps Engineer for this scope change, indicating a real backend is expected; (b) Supabase's row-level-security model is designed to be paired with an auth system, and this project explicitly has none — securing writes without auth would require either a public anon key (score-injection risk) or reintroducing auth via the back door; (c) the strongest BaaS pitch is "no backend code", but our backend is a handful of CRUD endpoints against two tables — the savings are marginal.

---

### Decision

> **Revision history:** The original 2026-07-08 draft of this ADR selected Option 1 (Fly.io). After a Director challenge revealed the Fly.io cost framing was stale (corrected the same day — see Option 1's Cons), the Director requested formal evaluation of a fourth option (Vercel + Turso). That evaluation is complete and **changes the Decision below from Option 1 to Option 4.** Option 1 remains fully documented above as an evaluated, rejected alternative — this is a revision within the same ADR, not a separate superseding ADR, since it was accepted in this revised form rather than the originally proposed one.
>
> **Process note:** Architecture Decision Workflow Step 4 (formal Technical Lead review) was not performed by a dispatched Technical Lead before Director approval — the Director's own direct challenge to the cost framing served that scrutiny function in practice, and surfaced exactly the kind of issue Step 4 exists to catch. Technical Lead was activated in the project roster during this cycle (`CLAUDE.md`) precisely because this gap was noticed. Recorded here for traceability rather than silently treating Step 4 as satisfied.

**We will build the backend as a Node.js Express application deployed as serverless functions on Vercel's Hobby tier, persisting to Turso (managed libSQL, a SQLite-compatible service), and the frontend will integrate over HTTP with permissive CORS (`Access-Control-Allow-Origin: *`, no credentials) so that `index.html` can continue to be opened directly from disk during development.**

For production, the same Vercel project will also serve the static frontend files, giving the deployed game a single canonical URL (e.g., `https://<project>.vercel.app`). Local `file://` access is retained for the Frontend Engineer's iteration loop. The Express app is exposed to Vercel as a single serverless handler via `@vercel/node`'s standard pattern; route handlers are `async` and DB access goes through `@libsql/client`.

---

### Rationale

Four factors were decisive.

**First, the Director's zero-cost constraint (see Context, "Very low operational budget") is a hard constraint under the current phase of the project.** Option 1 as originally recommended assumed a Fly.io free hobby tier that no longer exists in the form first assumed; correcting for that (Fly.io's expected recurring cost is ~$2-5/month) puts it in violation of the stated constraint. Options 3 and 4 both satisfy it. Between them, Option 4 wins on the second factor below.

**Second, language and tooling cohesion is preserved by Option 4 but not by Option 2 or Option 3.** Option 4 keeps the entire project inside standard Node.js JavaScript and Vitest; the Frontend Engineer's skill set carries over unchanged, the `game-logic.js` UMD pattern still allows server-side reuse of pure helpers, and Vitest continues to be the single test framework (backend tests run against a local libSQL file URL, preserving the "no reason to mock the DB" property). Option 3's Workers request handler API would break this cohesion at the code-shape level even though it is nominally JavaScript. Option 2 (Python) breaks it outright with a second language and a second test framework.

**Third, portability of the data and application layers is materially better than Option 3 and only modestly worse than Option 1.** libSQL is open source and SQLite-compatible; schemas and queries transfer unchanged from Option 1's design. Application code is standard Node/Express, exported to Vercel via a well-documented adapter — not written against a vendor-specific request-handler API the way Option 3 is. If Vercel or Turso free-tier terms change, migration to a plain Node host + SQLite (Option 1's stack) or a self-hosted libSQL server is a bounded refactor, not a rewrite.

**Fourth, right-sizing to actual workload.** All four options handle this workload with orders of magnitude to spare, so the differentiator becomes the option with the least ceremony *within the zero-cost constraint*. Option 4's local development experience — `vercel dev` plus a local libSQL file — is close in friction to Option 1's `node server.js` plus a local SQLite file, and materially simpler than Option 3's `wrangler` + D1 emulator.

The frontend's file:// property is preserved by responding to API calls with `Access-Control-Allow-Origin: *`. Because the API is public-read by design (no auth, no cookies, no sensitive data), credentialed CORS is not needed and `*` is safe.

**The trade-off accepted by this decision is explicit, not smuggled in:** to hold the zero-cost line, the project accepts (a) an async/network-bound data-access layer instead of Option 1's synchronous `better-sqlite3` calls — a one-time rewrite cost that is permanent architectural stickiness, though it is normal modern Node idiom, not exotic; (b) the loss of the originally-proposed in-process rate limiter, replaced by a Turso-backed rate-limit table; and (c) occasional cold-start latency (~500ms-2s) on the first request after idle. None of these is fatal at this workload, but none should be discovered by the Director after the fact.

**Steelman for staying with Option 1 (for the record):** $2-5/month may not be a real constraint for every Director; Fly.io's autostop-when-idle might push its cost toward $0 if verified; the async rewrite is a permanent cost paid once; and two providers (Vercel + Turso) double the free-tier-terms-change risk versus Option 1's one (Fly.io). This case is real and is why the Decision above required Director approval rather than being finalized unilaterally by the Software Architect.

---

### Consequences

**Positive:**
- Backend and frontend share one language, one test framework (Vitest), one linter target, and one formatter — the Code Quality Standard's "one consistent coding style" clause is naturally satisfied.
- Turso's libSQL local-file mode makes local backend tests trivially fast and fully offline; there is no reason to mock the DB in tests.
- The frontend's "just open index.html" development property is preserved. The `game-logic.js` UMD pattern stays untouched. No build step is introduced on either side.
- Recurring hosting cost is expected to be $0 under Vercel Hobby + Turso free tier, subject to verification (see Standards Applied and the pre-signup checklist in Implementation Notes). If verification uncovers a required paid step or a credit-card gate, this is reported to the Director before signup and the Decision is revisited.
- Portability is preserved: libSQL is open source, SQLite-compatible; the Express app is standard Node and exportable to any Node host. Provider migration would be an ops-plus-modest-code change, not a rewrite.
- No long-running process, no persistent volume, no snapshot cron: the operational surface Option 1 would have introduced (a live VM, a mounted volume, downtime detection) is owned by Vercel and Turso.
- Reusing pure functions from `game-logic.js` server-side remains possible if we ever want server-authoritative validation.

**Negative:**
- Two providers on the critical path (Vercel + Turso) instead of one. Doubled surface for free-tier terms to change. DevOps Engineer must monitor both.
- The backend code is async-first and network-bound in every DB call. This is standard modern Node idiom but is measurably more code than Option 1's synchronous `better-sqlite3` style, and the design does not easily "un-async" if we later migrate to a long-running Node process.
- The originally-proposed in-process rate limiter (Option 1's Implementation Notes) does not work under Vercel's stateless serverless model. Rate limiting will be implemented via a Turso-backed table (see updated Implementation Notes below). This is a design change owned by this ADR — it is not a Backend Engineer implementation-detail decision.
- Cold-start latency is real. First-request latency after idle will be ~500ms-2s. Acceptable at this workload but a regression relative to a localStorage-only game's instant feel.
- Vercel-specific configuration (`vercel.json` or file-based function routing, Vercel CLI, environment-variable management) is a real but shallow lock-in — not as deep as Workers/D1, deeper than a `fly.toml`.
- Node's ecosystem tempts dependency sprawl. Discipline is required to keep runtime dependencies to `express`, `@libsql/client`, and `@vercel/node`. Any additional runtime dependency should be justified in review by the Code Reviewer.

**Neutral:**
- The frontend gains a small networking layer (a thin API client module, e.g., `api.js`) and an entry-point change: on page load, before `newGame()`, the frontend resolves an active profile (auto-select from `localStorage`-stored profile ID, or show the profile selector). This is required by the functional spec regardless of backend choice — it is not a cost of *this* ADR.
- CORS is configured permissively (`Access-Control-Allow-Origin: *`, no credentials). This is safe for this project's threat model (no auth, no cookies, no sensitive data, sanity-checked writes) but is a decision worth being explicit about — if the project ever adds authentication, this must be revisited.
- Score sanity-checking becomes the backend's responsibility: implausibly large scores must be rejected. Exact bounds are a Backend Engineer implementation decision (a reasonable ceiling is well below 10⁶, since realistic 2048 scores are in the low-tens-of-thousands range).
- Deployed production use will move the game from `file://index.html` to a URL (`https://<project>.vercel.app`). This is an intentional consequence of having a backend at all — the frontend must be online for profiles to work, so a URL is no worse UX than a local file, and it's better for sharing. The "open a local file" model is preserved only for the Frontend Engineer's development loop.

---

### Standards Applied

- **Standards First** (`ia-engineering/Standards/STANDARDS_FIRST.md`) — the official JavaScript style, Node.js conventions, HTTP/REST conventions, and SQL conventions are the authoritative references. No project-invented alternatives.
- **Code Quality Standard** (`ia-engineering/Standards/CODE_QUALITY_STANDARD.md`) — backend code will be formatted (Prettier), linted (ESLint recommended config), and kept to one consistent style with the frontend.
- **Testing Standard** (`ia-engineering/Standards/TESTING_STANDARD.md`) — backend tests use Vitest (already the project's official test framework per `package.json`). Definition-of-Done requires backend tests to pass before a Work Unit is closed.
- **Documentation Standard** — every endpoint's request/response shape is documented (either as JSDoc on the handler, an OpenAPI/JSON schema file, or a `docs/api.md` — Engineering Manager to choose in Work Unit decomposition).
- **Official documentation** consulted for this decision: Node.js (nodejs.org), Express (expressjs.com), SQLite (sqlite.org), libSQL / Turso (turso.tech), Vercel (vercel.com/docs), Vitest (vitest.dev). Also consulted while evaluating the rejected Option 1: `better-sqlite3` (npm), Fly.io (fly.io/docs). Backend and DevOps Engineers must confirm current hosting-provider terms before signup — this ADR does not commit to specific free-tier quotas that may have changed.

---

### Implementation Notes

- **Repository layout.** A new top-level directory `backend/` holds the server code, its own `package.json` (separate from the frontend's — the frontend's is dev-only for Vitest), server tests, and Vercel config. Suggested files: `backend/api/*.js` (or a single Express app exported via `@vercel/node`), `backend/db.js` (Turso `@libsql/client` setup), `backend/routes/profiles.js`, `backend/routes/games.js`, `backend/tests/*.test.js`, `backend/vercel.json`. No `fly.toml`, no Dockerfile.
- **Frontend integration.** A single `api.js` module in the frontend root exposes `createProfile`, `getProfile`, `getKnownProfiles`, `recordGame`, `getHistory`, `getLeaderboard`. Uses `fetch()`. No build step. `script.js` calls into `api.js` in place of the current `localStorage` calls. The API base URL is a constant in `api.js` — one value for local dev (`http://localhost:PORT` via `vercel dev`), one for production (`https://<project>.vercel.app`). A simple `window.location`-based switch is sufficient; a real config system is over-engineering at this scale.
- **CORS.** The backend responds with `Access-Control-Allow-Origin: *` and no `Access-Control-Allow-Credentials`. The `Origin: null` header from `file://` is accepted (it matches `*`).
- **Score sanity check.** `POST /api/profiles/:id/games` must reject `score` values that are negative, non-integer, or above a hard ceiling (Backend Engineer to pick — recommendation: 10⁶). Rejected scores return HTTP 400 with a machine-readable error code.
- **Rate limiting.** A Turso-backed rate-limit table — `rate_limits(ip TEXT NOT NULL, window_start INTEGER NOT NULL, count INTEGER NOT NULL, PRIMARY KEY (ip, window_start))` — with a fixed-window counter (e.g., 10 games / 60s per IP) checked and upserted at the start of `POST /api/profiles/:id/games`. Two extra DB round-trips per write, immaterial at this scale. An in-process rate limiter (a `Map` in memory) does **not** work under Vercel's stateless serverless model — state does not persist or share across invocations — so this replaces what would have been trivial under Option 1.
- **Local development.** `cd backend && npm install && vercel dev`. The frontend still opens via double-clicking `index.html`. Backend tests run against Turso's local libSQL file URL — no network required for tests. This must be documented in `README.md` (or a new `backend/README.md`) as a Documentation Standard deliverable of the Work Unit that adds the backend.
- **Backup.** Turso provides automatic point-in-time recovery on its hosted tier. The DevOps Engineer must verify the retention window meets the project's recovery expectation before signup.
- **Pre-signup verification checklist (mandatory, DevOps Engineer, before creating any Vercel or Turso account or resource):**
  1. Confirm on vercel.com/pricing (or current equivalent) that the Hobby tier applies to non-commercial personal projects, and that a credit card is not required to create the account or deploy this workload's traffic pattern.
  2. Confirm on turso.tech/pricing (or current equivalent) the current free-tier limits (storage, rows read/written per month, number of databases) and confirm this workload fits inside them with margin.
  3. Confirm whether Turso's free tier includes backup/point-in-time recovery, and the retention window.
  4. Confirm whether any Vercel usage — including static asset serving and function invocations at this traffic pattern — could push the account onto a paid tier.
  5. If any answer implies a recurring cost or a credit-card requirement, report to the Director before proceeding with account creation — do not proceed on the assumption of zero cost.
- **What this ADR does *not* decide.** Exact endpoint URL shapes, exact error-response schema, exact retry strategy for NFR-002 (backend unreachable), exact rate-limit thresholds, exact CI/CD pipeline. These are Backend/DevOps Engineer implementation decisions inside Work Units downstream of this ADR.

Related Work Units:
- WU-2048-006 (or next available) — Scaffold `backend/` (Node + Express + Turso client skeleton on Vercel, empty routes, Vitest wired against a local libSQL file, README, `vercel.json`).
- Subsequent Work Units — one per endpoint / feature slice, per the Feature Development Workflow.
