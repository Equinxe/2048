import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import request from 'supertest';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const testDbPath = path.join(__dirname, '../test-local.db');

// Set test database URL before importing db.js so it uses the test DB
process.env.TURSO_DATABASE_URL = `file:${testDbPath}`;

describe('Backend Smoke Tests', () => {
  let app;
  let db;

  beforeAll(async () => {
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
    // Dynamic import after env var is set, so db.js reads the correct URL
    const dbModule = await import('../db.js');
    db = dbModule.default;
    const appModule = await import('../app.js');
    app = appModule.default;
  });

  it('should create an Express app', () => {
    expect(app).toBeDefined();
    expect(typeof app).toBe('function');
  });

  it('should initialize schema in a local libSQL file', async () => {
    await db.initializeSchema();

    const { createClient } = await import('@libsql/client');
    const testClient = createClient({
      url: `file:${testDbPath}`,
    });

    const result = await testClient.execute(
      "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
    );

    const tableNames = result.rows.map((row) => row.name);
    expect(tableNames).toContain('profiles');
    expect(tableNames).toContain('games');
    expect(tableNames).toContain('rate_limits');

    await testClient.close();
  });

  it('should respond with CORS headers', async () => {
    const res = await request(app).options('/api/profiles/ping');
    expect(res.headers['access-control-allow-origin']).toBe('*');
  });
});
