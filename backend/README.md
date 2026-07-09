# 2048 Backend

Express.js server with Turso/libSQL database, deployed to Vercel as serverless functions.

## Setup

### Installation

```bash
cd backend
npm install
```

### Environment Variables

For local development, the backend uses a local libSQL file at `file:./local.db`. If you want to use a Turso-hosted database instead, set:

```bash
export TURSO_DATABASE_URL=libsql://your-database-url
```

On Windows PowerShell:
```powershell
$env:TURSO_DATABASE_URL = "libsql://your-database-url"
```

## Local Development

Start the local development server:

```bash
npm start
```

The server will start on `http://localhost:3000`. The database schema is automatically applied to `./local.db` on first run.

To test the actual Vercel serverless function shape locally (requires the Vercel CLI installed globally), you can optionally run:

```bash
npm install -g vercel
vercel dev
```

For normal development iteration, `npm start` is sufficient and requires no additional global tools.

### Testing

Run the test suite:

```bash
npm test
```

Tests run against a temporary local libSQL file, no network required.

## Project Structure

```
backend/
├── app.js              — Express app configuration, CORS, error handling
├── db.js               — libSQL client and schema initialization
├── server.js           — Local development entry point (plain Node.js)
├── api/index.js        — Vercel serverless handler
├── routes/
│   ├── profiles.js     — Profile endpoints (stubs)
│   └── games.js        — Game recording endpoints (stubs)
├── tests/
│   └── smoke.test.js   — Smoke tests for setup verification
├── schema.sql          — Database schema (profiles, games, rate_limits)
├── vercel.json         — Vercel serverless function routing
├── vitest.config.js    — Vitest test runner configuration
└── README.md           — This file
```

## Database Schema

The backend automatically initializes three tables from `schema.sql`:

- `profiles`: Player identities (id, name, created_at)
- `games`: Completed game records (id, profile_id, score, played_at, result)
- `rate_limits`: Fixed-window rate limiting (ip, window_start, count)

## CORS Policy

The backend responds with `Access-Control-Allow-Origin: *` and no credentials requirement. This allows the frontend to call the API from `file://` origins during local development and from any origin during deployment.

## Frontend Integration

The frontend calls the backend API via `fetch()`. The API base URL is configured in the frontend's `api.js`:
- Local dev: `http://localhost:3000`
- Production: `https://<project>.vercel.app`

Endpoints (to be implemented):
- `POST /api/profiles` — Create a new profile
- `GET /api/profiles/:id` — Fetch a single profile
- `GET /api/profiles?ids=1,2,3` — Batch fetch known profiles
- `POST /api/profiles/:id/games` — Record a completed game
- `GET /api/profiles/:id/games` — Fetch game history
- `GET /api/profiles/:id/leaderboard` — Fetch personal leaderboard (top 10)

## Deployment

Deployed on Vercel Hobby tier. Push to the repository and Vercel will automatically deploy. Database is managed by Turso.

### Pre-deployment Checklist (DevOps Engineer)

Before creating Vercel/Turso accounts:

1. Confirm Vercel Hobby tier applies to non-commercial personal projects
2. Confirm Turso free-tier limits (storage, rows read/written per month)
3. Confirm backup/point-in-time recovery availability
4. Verify no credit-card requirement for this workload

If any step implies a cost, report to the Director before proceeding.
