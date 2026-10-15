import express from 'express';
import pool from '../db/connection.js';
import {
  validateEmail,
  validatePassword,
  hashPassword,
  comparePassword,
  generateToken,
  setAuthCookie,
  clearAuthCookie,
} from '../utils/auth.js';
import { authRequired } from '../middleware/auth.js';
import { authLimiter } from '../middleware/authLimiter.js';

const router = express.Router();

/**
 * POST /api/auth/register
 * Registers a new user account.
 * Body: { email, password, displayName?, preferredLanguage? }
 */
router.post('/register', authLimiter, async (req, res, next) => {
  try {
    const { email, password, displayName = null, preferredLanguage = 'en' } = req.body || {};

    // 1. Validate email
    if (!validateEmail(email)) {
      return res.status(400).json({
        error: 'ValidationError',
        message: 'Please provide a valid email address.',
      });
    }

    // 2. Validate password strength
    if (!validatePassword(password)) {
      return res.status(400).json({
        error: 'ValidationError',
        message: 'Password must be at least 8 characters long and contain both letters and numbers.',
      });
    }

    const trimmedEmail = email.trim().toLowerCase();
    const cleanDisplayName = displayName && typeof displayName === 'string' ? displayName.trim() : null;

    // 3. Check for existing email
    const [existing] = await pool.query(
      'SELECT id FROM users WHERE email = ?',
      [trimmedEmail]
    );

    if (existing.length > 0) {
      return res.status(409).json({
        error: 'Conflict',
        message: 'This email is already registered. Please log in or use another email.',
      });
    }

    // 4. Hash password and insert user
    const passwordHash = await hashPassword(password);
    const [result] = await pool.query(
      'INSERT INTO users (email, password_hash, display_name, preferred_language, last_login_at) VALUES (?, ?, ?, ?, NOW())',
      [trimmedEmail, passwordHash, cleanDisplayName, preferredLanguage]
    );

    const userId = result.insertId;

    // 5. Generate token and set httpOnly cookie
    const token = generateToken(userId);
    setAuthCookie(res, token);

    const user = {
      id: userId,
      email: trimmedEmail,
      displayName: cleanDisplayName,
      preferredLanguage,
      createdAt: new Date().toISOString(),
    };

    res.status(201).json({
      message: 'Account registered successfully.',
      user,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/auth/login
 * Authenticates user credentials and sets httpOnly cookie.
 * Body: { email, password }
 */
router.post('/login', authLimiter, async (req, res, next) => {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({
        error: 'ValidationError',
        message: 'Email and password are required.',
      });
    }

    const trimmedEmail = email.trim().toLowerCase();

    // 1. Fetch user by email
    const [users] = await pool.query(
      'SELECT id, email, password_hash, display_name AS displayName, preferred_language AS preferredLanguage, created_at AS createdAt FROM users WHERE email = ?',
      [trimmedEmail]
    );

    // 2. Constant-time security check against user enumeration:
    // If user not found, perform dummy hash comparison to prevent timing discrepancy
    if (users.length === 0) {
      await comparePassword(password, '$2a$10$abcdefghijklmnopqrstuvwxyz0123456789ABCDEF');
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid email or password.',
      });
    }

    const user = users[0];

    // 3. Compare password
    const isMatch = await comparePassword(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid email or password.',
      });
    }

    // 4. Update last_login_at
    await pool.query(
      'UPDATE users SET last_login_at = NOW() WHERE id = ?',
      [user.id]
    );

    // 5. Generate token and set httpOnly cookie
    const token = generateToken(user.id);
    setAuthCookie(res, token);

    res.json({
      message: 'Logged in successfully.',
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        preferredLanguage: user.preferredLanguage,
        createdAt: user.createdAt,
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/auth/logout
 * Clears the httpOnly authentication cookie.
 */
router.post('/logout', (req, res) => {
  clearAuthCookie(res);
  res.json({
    message: 'Logged out successfully.',
  });
});

/**
 * GET /api/auth/me
 * Returns current authenticated user information without password hash.
 */
router.get('/me', authRequired, (req, res) => {
  res.json({
    user: req.user,
  });
});

/**
 * PATCH /api/auth/profile
 * Updates display name or preferred language for current user.
 */
router.patch('/profile', authRequired, async (req, res, next) => {
  try {
    const { displayName, preferredLanguage } = req.body || {};
    const updates = [];
    const params = [];

    if (displayName !== undefined) {
      updates.push('display_name = ?');
      params.push(displayName ? displayName.trim() : null);
    }

    if (preferredLanguage !== undefined) {
      updates.push('preferred_language = ?');
      params.push(preferredLanguage);
    }

    if (updates.length > 0) {
      params.push(req.user.id);
      await pool.query(
        `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
        params
      );
    }

    const [updatedUsers] = await pool.query(
      'SELECT id, email, display_name AS displayName, preferred_language AS preferredLanguage, created_at AS createdAt FROM users WHERE id = ?',
      [req.user.id]
    );

    res.json({
      message: 'Profile updated successfully.',
      user: updatedUsers[0],
    });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/auth/account
 * Completely deletes the user account and all associated health data.
 */
router.delete('/account', authRequired, async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Delete user (foreign key cascading removes sessions, messages, symptom reports, red flags)
    await pool.query('DELETE FROM users WHERE id = ?', [userId]);

    clearAuthCookie(res);

    res.json({
      message: 'Your account and all associated symptom records have been permanently deleted.',
    });
  } catch (err) {
    next(err);
  }
});

export default router;
