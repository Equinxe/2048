import express from 'express';
import db from '../db.js';

const router = express.Router();

// POST /api/profiles - Create a new profile
router.post('/', async (req, res, next) => {
  try {
    // Guard against missing/malformed request body
    if (!req.body || typeof req.body !== 'object') {
      const err = new Error('Request body is required');
      err.status = 400;
      return next(err);
    }

    const { name } = req.body;

    // Validate name is provided and is a string
    if (name === undefined) {
      const err = new Error('Request body is required');
      err.status = 400;
      return next(err);
    }

    if (typeof name !== 'string') {
      const err = new Error('name must be a string');
      err.status = 400;
      return next(err);
    }

    // Trim and validate length
    const trimmedName = name.trim();
    if (trimmedName.length < 1 || trimmedName.length > 12) {
      const err = new Error('name must be between 1 and 12 characters');
      err.status = 400;
      return next(err);
    }

    // Create profile with server-assigned timestamp
    const createdAt = new Date().toISOString();
    const result = await db.client.execute({
      sql: 'INSERT INTO profiles (name, created_at) VALUES (?, ?)',
      args: [trimmedName, createdAt],
    });

    // Get the inserted profile ID (convert BigInt to Number)
    const profileId = Number(result.lastInsertRowid);

    res.status(201).json({
      id: profileId,
      name: trimmedName,
      created_at: createdAt,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/profiles/:id - Fetch a single profile
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    // Validate id is a positive integer (reject decimals)
    if (!/^\d+$/.test(id)) {
      const err = new Error('id must be a positive integer');
      err.status = 400;
      return next(err);
    }
    const profileId = parseInt(id, 10);
    if (profileId <= 0) {
      const err = new Error('id must be a positive integer');
      err.status = 400;
      return next(err);
    }

    // Query for the profile
    const result = await db.client.execute({
      sql: 'SELECT id, name, created_at FROM profiles WHERE id = ?',
      args: [profileId],
    });

    if (result.rows.length === 0) {
      const err = new Error('Profile not found');
      err.status = 404;
      return next(err);
    }

    const profile = result.rows[0];
    res.status(200).json({
      id: Number(profile.id),
      name: profile.name,
      created_at: profile.created_at,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/profiles?ids=1,2,3 - Batch fetch profiles
router.get('/', async (req, res, next) => {
  try {
    const { ids } = req.query;

    // Parse ids from comma-separated list
    let profileIds = [];
    if (ids && typeof ids === 'string') {
      profileIds = ids
        .split(',')
        .map((id) => {
          const parsed = parseInt(id.trim(), 10);
          return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
        })
        .filter((id) => id !== null);
    }

    // If no valid ids, return empty array
    if (profileIds.length === 0) {
      return res.status(200).json([]);
    }

    // Build parameterized query for multiple ids
    const placeholders = profileIds.map(() => '?').join(',');
    const result = await db.client.execute({
      sql: `SELECT id, name, created_at FROM profiles WHERE id IN (${placeholders}) ORDER BY id`,
      args: profileIds,
    });

    res.status(200).json(
      result.rows.map((profile) => ({
        id: Number(profile.id),
        name: profile.name,
        created_at: profile.created_at,
      }))
    );
  } catch (error) {
    next(error);
  }
});

export default router;
