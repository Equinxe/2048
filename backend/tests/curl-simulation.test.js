import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import request from 'supertest';
import app from '../app.js';
import db from '../db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const testDbPath = path.join(__dirname, '../test-curl-sim.db');

describe('Live Endpoint Verification (curl-like)', () => {
  let createdProfileId;

  beforeAll(async () => {
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
    await db.initializeSchema(`file:${testDbPath}`);
  });

  it('1. POST /api/profiles - Create profile "Alice"', async () => {
    console.log('\n=== Test 1: CREATE PROFILE ===');
    const res = await request(app)
      .post('/api/profiles')
      .set('Content-Type', 'application/json')
      .send({ name: 'Alice' })
      .expect(201);

    console.log('Request: POST /api/profiles');
    console.log('Body: { "name": "Alice" }');
    console.log(`Response: 201`);
    console.log(`Body: ${JSON.stringify(res.body, null, 2)}`);

    createdProfileId = res.body.id;
    expect(res.body.name).toBe('Alice');
    expect(typeof res.body.id).toBe('number');
  });

  it('2. POST /api/profiles - Create profile "Bob"', async () => {
    console.log('\n=== Test 2: CREATE ANOTHER PROFILE ===');
    const res = await request(app)
      .post('/api/profiles')
      .send({ name: 'Bob' })
      .expect(201);

    console.log('Request: POST /api/profiles');
    console.log('Body: { "name": "Bob" }');
    console.log(`Response: 201`);
    console.log(`Body: ${JSON.stringify(res.body, null, 2)}`);

    expect(res.body.name).toBe('Bob');
  });

  it('3. POST /api/profiles - Create profile "Charlie"', async () => {
    console.log('\n=== Test 3: CREATE THIRD PROFILE ===');
    const res = await request(app)
      .post('/api/profiles')
      .send({ name: 'Charlie' })
      .expect(201);

    console.log('Request: POST /api/profiles');
    console.log('Body: { "name": "Charlie" }');
    console.log(`Response: 201`);
    console.log(`Body: ${JSON.stringify(res.body, null, 2)}`);

    expect(res.body.name).toBe('Charlie');
  });

  it('4. GET /api/profiles/:id - Fetch profile by ID (HIT)', async () => {
    console.log('\n=== Test 4: GET PROFILE BY ID (HIT) ===');
    const res = await request(app)
      .get(`/api/profiles/${createdProfileId}`)
      .expect(200);

    console.log(`Request: GET /api/profiles/${createdProfileId}`);
    console.log(`Response: 200`);
    console.log(`Body: ${JSON.stringify(res.body, null, 2)}`);

    expect(res.body.id).toBe(createdProfileId);
    expect(res.body.name).toBe('Alice');
  });

  it('5. GET /api/profiles/:id - Fetch non-existent profile (404)', async () => {
    console.log('\n=== Test 5: GET PROFILE BY ID (MISS - 404) ===');
    const res = await request(app)
      .get('/api/profiles/99999')
      .expect(404);

    console.log('Request: GET /api/profiles/99999');
    console.log(`Response: 404`);
    console.log(`Body: ${JSON.stringify(res.body, null, 2)}`);

    expect(res.body.error).toContain('not found');
  });

  it('6. GET /api/profiles/:id - Invalid non-numeric ID (400)', async () => {
    console.log('\n=== Test 6: GET PROFILE BY ID (INVALID - 400) ===');
    const res = await request(app)
      .get('/api/profiles/abc')
      .expect(400);

    console.log('Request: GET /api/profiles/abc');
    console.log(`Response: 400`);
    console.log(`Body: ${JSON.stringify(res.body, null, 2)}`);

    expect(res.body.error).toContain('positive integer');
  });

  it('7. GET /api/profiles?ids=1,2,3 - Batch fetch (VALID IDS)', async () => {
    console.log('\n=== Test 7: BATCH FETCH (VALID IDS) ===');
    const res = await request(app)
      .get(`/api/profiles?ids=1,2,3`)
      .expect(200);

    console.log('Request: GET /api/profiles?ids=1,2,3');
    console.log(`Response: 200`);
    console.log(`Body: ${JSON.stringify(res.body, null, 2)}`);

    expect(res.body).toHaveLength(3);
    expect(res.body[0].id).toBe(1);
  });

  it('8. GET /api/profiles?ids=1,abc,3 - Batch fetch (MIXED VALID/INVALID)', async () => {
    console.log('\n=== Test 8: BATCH FETCH (MIXED VALID/INVALID IDS) ===');
    const res = await request(app)
      .get(`/api/profiles?ids=1,abc,3`)
      .expect(200);

    console.log('Request: GET /api/profiles?ids=1,abc,3');
    console.log(`Response: 200`);
    console.log(`Body: ${JSON.stringify(res.body, null, 2)}`);

    expect(res.body).toHaveLength(2);
    expect(res.body.map((p) => p.id)).toEqual(expect.arrayContaining([1, 3]));
  });

  it('9. GET /api/profiles (NO IDS) - Empty array', async () => {
    console.log('\n=== Test 9: BATCH FETCH (NO IDS PARAM) ===');
    const res = await request(app).get(`/api/profiles`).expect(200);

    console.log('Request: GET /api/profiles');
    console.log(`Response: 200`);
    console.log(`Body: ${JSON.stringify(res.body, null, 2)}`);

    expect(res.body).toEqual([]);
  });

  it('10. POST /api/profiles - Invalid input (non-string name)', async () => {
    console.log('\n=== Test 10: CREATE PROFILE (INVALID - NON-STRING) ===');
    const res = await request(app)
      .post('/api/profiles')
      .send({ name: 12345 })
      .expect(400);

    console.log('Request: POST /api/profiles');
    console.log('Body: { "name": 12345 }');
    console.log(`Response: 400`);
    console.log(`Body: ${JSON.stringify(res.body, null, 2)}`);

    expect(res.body.error).toContain('must be a string');
  });
});
