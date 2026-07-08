## ADR-2048-001 — Backend Technology Selection for Player Profiles

**Date:** 2026-07-08
**Status:** Proposed
**Author:** Software Architect (AI Employee)
**Approved by:** [Pending — Director]
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

Three options were evaluated. A fourth option — direct-from-frontend BaaS (Supabase/Firebase) — was considered but rejected before formal evaluation and is discussed in the Rationale.

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
- **Fly.io free hobby tier fits.** A single small VM with a mounted volume for the SQLite file is enough. The app can scale-to-zero when idle if desired (though a persistent process is simpler here since we're already at ~free cost).
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

**Rejected without full evaluation — Backend-as-a-Service (Supabase/Firebase):** Skipping a custom backend entirely by having the frontend call a managed Postgres/Firestore directly is tempting for a hobby project. It was rejected because (a) the Director-approved roster (`CLAUDE.md`) explicitly activates Backend Engineer, Database Engineer, and DevOps Engineer for this scope change, indicating a real backend is expected; (b) Supabase's row-level-security model is designed to be paired with an auth system, and this project explicitly has none — securing writes without auth would require either a public anon key (score-injection risk) or reintroducing auth via the back door; (c) the strongest BaaS pitch is "no backend code", but our backend is a handful of CRUD endpoints against two tables — the savings are marginal.

---

### Decision

**We will build the backend as a Node.js + Express server persisting to SQLite via `better-sqlite3`, hosted on Fly.io's hobby tier, and the frontend will integrate over HTTP with permissive CORS (`Access-Control-Allow-Origin: *`, no credentials) so that `index.html` can continue to be opened directly from disk during development.**

For production, the same Node process will also serve the static frontend files via `express.static('./')`, giving the deployed game a single canonical URL (e.g., `https://2048-<slug>.fly.dev`). Local `file://` access is retained for the Frontend Engineer's iteration loop.

---

### Rationale

Three factors were decisive.

**First, language and tooling cohesion.** Option 1 keeps the entire project inside JavaScript and Vitest. The frontend already lives there; a Node backend inherits the Frontend Engineer's existing skill set and the project's existing test framework rather than doubling it. The Testing Standard's "Standards First" clause and the Code Quality Standard's "one consistent coding style" clause both favor this cohesion. Option 2 (Python) would add a second language and a second test framework with no operational benefit at 0-10 concurrent users.

**Second, portability and boring-tech risk profile.** Option 1 is a boring Node + Express + SQLite stack that runs anywhere that runs Node — Fly.io today, Render or Railway or a $5 VPS tomorrow if free-tier terms change. Option 3's Cloudflare Workers+D1 is genuinely elegant operationally, but its handlers and D1 client are Cloudflare-shaped code that does not port cleanly to any other provider. For a portfolio project whose lifetime is measured in years and whose maintainer is the Director alone, "runs anywhere Node runs" is a stronger property than "scales to zero on Cloudflare."

**Third, right-sizing to actual workload.** All three options can handle this workload with orders of magnitude to spare. That equality makes the differentiator the option with the least ceremony: Option 1's `node server.js` against a local `.sqlite` file is the lowest-friction local development story. Option 3 adds `wrangler` and D1 emulation for no daily-use benefit; Option 2 adds a Python toolchain for the same non-benefit. Simplicity here is a real feature, not a compromise.

The frontend's file:// property is preserved by responding to API calls with `Access-Control-Allow-Origin: *`. Because the API is public-read by design (no auth, no cookies, no sensitive data), credentialed CORS is not needed and `*` is safe — the security concern is not "who can read" but "who can spam writes", which is addressed at the request layer with server-side score sanity checks and simple rate limiting, not at the CORS layer.

---

### Consequences

**Positive:**
- Backend and frontend share one language, one test framework (Vitest), one linter target, and one formatter — the Code Quality Standard's "one consistent coding style" clause is naturally satisfied.
- SQLite as a single file makes backup/restore trivial (copy one file), and local development against a real database is as easy as local development against a mock — there is no reason to mock the DB in tests.
- The frontend's "just open index.html" development property is preserved. The `game-logic.js` UMD pattern stays untouched. No build step is introduced on either side.
- Hosting is expected to fit inside Fly.io's free hobby tier for this scale; no paid infrastructure commitment is triggered by this decision.
- Portability is preserved — the stack runs on any Node-capable host, so future hosting-provider migrations (should Fly.io change terms) are ops-only changes, not code changes.
- Reusing pure functions from `game-logic.js` server-side becomes possible if we ever want a server-authoritative move-log/replay validation. Not planned now, but the door is not closed.

**Negative:**
- The project acquires operational surface it did not previously have: a live process, a persistent volume, a hosting account, and free-tier terms subject to change. The DevOps Engineer now owns this and must define at minimum: (a) how the app is deployed, (b) how the SQLite file is backed up, (c) how downtime is detected. This is a real recurring responsibility that did not exist in the static-file era.
- Node's ecosystem tempts dependency sprawl. Discipline is required to keep runtime dependencies to `express` and `better-sqlite3`. Any additional runtime dependency should be justified in review by the Code Reviewer.
- SQLite's single-file design couples the app to a single host. Horizontal scale is not free — it would require migrating to Turso, libsql, or Postgres. For this project's scale this is a theoretical concern, but it should not be silently forgotten if the scope changes again.
- Lock-in to Fly.io specifically is low but non-zero (Fly-specific CLI, `fly.toml`). Not a critical risk since the underlying stack is portable, but real friction if migration is ever needed.
- If Fly.io's free-tier terms change materially, this could produce a small recurring cost (roughly the price of a small VPS or Render's starter plan — flagged explicitly to the Director per the Escalation section of the Software Architect Employee definition). No commitment is being made to a paid tier today; but the possibility of one in the future is not zero.

**Neutral:**
- The frontend gains a small networking layer (a thin API client module, e.g., `api.js`) and an entry-point change: on page load, before `newGame()`, the frontend now resolves an active profile (auto-select from `localStorage`-stored profile ID, or show the profile selector). This is required by the functional spec regardless of backend choice — it is not a cost of *this* ADR.
- CORS is configured permissively (`Access-Control-Allow-Origin: *`, no credentials). This is safe for this project's threat model (no auth, no cookies, no sensitive data, sanity-checked writes) but is a decision worth being explicit about — if the project ever adds authentication, this must be revisited.
- Score sanity-checking becomes the backend's responsibility: implausibly large scores must be rejected. Exact bounds are a Backend Engineer implementation decision (a reasonable ceiling is well below 10⁶, since realistic 2048 scores are in the low-tens-of-thousands range).
- Deployed production use will move the game from `file://index.html` to a URL (`https://<app>.fly.dev`). This is an intentional consequence of having a backend at all — the frontend must be online for profiles to work, so a URL is no worse UX than a local file, and it's better for sharing. The "open a local file" model is preserved only for the Frontend Engineer's development loop.

---

### Standards Applied

- **Standards First** (`ia-engineering/Standards/STANDARDS_FIRST.md`) — the official JavaScript style, Node.js conventions, HTTP/REST conventions, and SQL conventions are the authoritative references. No project-invented alternatives.
- **Code Quality Standard** (`ia-engineering/Standards/CODE_QUALITY_STANDARD.md`) — backend code will be formatted (Prettier), linted (ESLint recommended config), and kept to one consistent style with the frontend.
- **Testing Standard** (`ia-engineering/Standards/TESTING_STANDARD.md`) — backend tests use Vitest (already the project's official test framework per `package.json`). Definition-of-Done requires backend tests to pass before a Work Unit is closed.
- **Documentation Standard** — every endpoint's request/response shape is documented (either as JSDoc on the handler, an OpenAPI/JSON schema file, or a `docs/api.md` — Engineering Manager to choose in Work Unit decomposition).
- **Official documentation** consulted for this decision: Node.js (nodejs.org), Express (expressjs.com), SQLite (sqlite.org), `better-sqlite3` (npm), Fly.io (fly.io/docs), Vitest (vitest.dev). Backend and DevOps Engineers must confirm current hosting-provider terms before signup — this ADR does not commit to specific free-tier quotas that may have changed.

---

### Implementation Notes

- **Repository layout.** A new top-level directory `backend/` holds the server code, its own `package.json` (separate from the frontend's — the frontend's is dev-only for Vitest), server tests, and hosting config. Suggested files: `backend/server.js`, `backend/db.js`, `backend/routes/profiles.js`, `backend/routes/games.js`, `backend/tests/*.test.js`, `backend/fly.toml`, `backend/.dockerignore` (if we containerize).
- **Frontend integration.** A single `api.js` module in the frontend root exposes `createProfile`, `getProfile`, `getKnownProfiles`, `recordGame`, `getHistory`, `getLeaderboard`. Uses `fetch()`. No build step. `script.js` calls into `api.js` in place of the current `localStorage` calls. The API base URL is a constant in `api.js` — one value for local dev (`http://localhost:PORT`), one for production (`https://<app>.fly.dev`). A simple `window.location`-based switch is sufficient; a real config system is over-engineering at this scale.
- **CORS.** The backend responds with `Access-Control-Allow-Origin: *` and no `Access-Control-Allow-Credentials`. The `Origin: null` header from `file://` is accepted (it matches `*`).
- **Score sanity check.** `POST /api/profiles/:id/games` must reject `score` values that are negative, non-integer, or above a hard ceiling (Backend Engineer to pick — recommendation: 10⁶). Rejected scores return HTTP 400 with a machine-readable error code.
- **Rate limiting.** A minimal in-process rate limiter on `POST /api/profiles/:id/games` (e.g., 10 games/minute per IP) is sufficient at this scale. No Redis, no external service.
- **Local development.** `cd backend && npm install && npm start`. The frontend still opens via double-clicking `index.html`. This must be documented in `README.md` (or a new `backend/README.md`) as a Documentation Standard deliverable of the Work Unit that adds the backend.
- **Backup.** Fly.io persistent volumes support snapshots. The DevOps Engineer must configure at minimum a daily snapshot; loss of the SQLite file is loss of all profile history.
- **What this ADR does *not* decide.** Exact endpoint URL shapes, exact error-response schema, exact retry strategy for NFR-002 (backend unreachable), exact rate-limit thresholds, exact CI/CD pipeline. These are Backend/DevOps Engineer implementation decisions inside Work Units downstream of this ADR.

Related Work Units:
- WU-2048-006 (or next available) — Scaffold `backend/` (Node + Express + SQLite skeleton, empty routes, Vitest wired, README).
- Subsequent Work Units — one per endpoint / feature slice, per the Feature Development Workflow.
