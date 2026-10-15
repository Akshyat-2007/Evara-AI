import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import pool from '../db/connection.js';
import { authOptional } from '../middleware/auth.js';

const router = express.Router();

/**
 * POST /api/sessions
 * Creates a new session with UUID (optionally associated with logged-in user).
 * Body: { language?: string }
 */
router.post('/', authOptional, async (req, res, next) => {
  try {
    const { language = 'auto' } = req.body || {};
    const sessionId = uuidv4();
    const userId = req.user?.id || null;

    await pool.query(
      'INSERT INTO sessions (id, language, user_id) VALUES (?, ?, ?)',
      [sessionId, language, userId]
    );

    res.status(201).json({
      sessionId,
      language,
      userId,
      message: userId ? 'Authenticated user session established' : 'Anonymous session established',
    });
  } catch (err) {
    next(err);
  }
});

export default router;
