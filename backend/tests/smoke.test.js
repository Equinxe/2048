import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import request from 'supertest';
import app from '../app.js';
import db from '../db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const testDbPath = path.join(__dirname, '../test-local.db');

describe('Backend Smoke Tests', () => {
  beforeAll(async () => {
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });

  it('should create an Express app', () => {
    expect(app).toBeDefined();
    expect(typeof app).toBe('function');
  });

  it('should initialize schema in a local libSQL file', async () => {
    await db.initializeSchema(`file:${testDbPath}`);

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
