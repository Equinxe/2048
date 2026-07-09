import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import app from '../app.js';
import db from '../db.js';
import { createClient } from '@libsql/client';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const testDbPath = path.join(__dirname, '../test-local.db');

describe('Backend Smoke Tests', () => {
  let testClient;

  beforeAll(async () => {
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });

  afterAll(async () => {
    if (testClient && typeof testClient.close === 'function') {
      await testClient.close();
    }
  });

  it('should create an Express app', () => {
    expect(app).toBeDefined();
    expect(typeof app).toBe('function');
  });

  it('should initialize schema in a local libSQL file', async () => {
    testClient = createClient({
      url: `file:${testDbPath}`,
    });

    const schemaPath = path.join(__dirname, '../schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf-8');

    const statements = schema
      .split(';')
      .map((stmt) => stmt.trim())
      .filter((stmt) => stmt.length > 0);

    for (const statement of statements) {
      await testClient.execute(statement);
    }

    const result = await testClient.execute(
      "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
    );

    const tableNames = result.rows.map((row) => row.name);
    expect(tableNames).toContain('profiles');
    expect(tableNames).toContain('games');
    expect(tableNames).toContain('rate_limits');
  });

  it('should respond with CORS headers', async () => {
    const req = {
      method: 'OPTIONS',
      headers: {},
      url: '/api/test',
    };

    const res = {
      statusCode: 200,
      headers: {},
      header(key, value) {
        this.headers[key] = value;
      },
      sendStatus(code) {
        this.statusCode = code;
      },
    };

    const next = () => {};

    app._router.stack.forEach((layer) => {
      if (layer.name === '<anonymous>' && layer.handle.length === 3) {
        layer.handle(req, res, next);
      }
    });

    expect(res.headers['Access-Control-Allow-Origin']).toBe('*');
  });
});
