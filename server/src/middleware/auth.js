import pool from '../db/connection.js';
import { verifyToken } from '../utils/auth.js';

/**
 * Middleware: Requires valid authentication.
 * Used for protected routes (history, account settings, etc.).
 */
export async function authRequired(req, res, next) {
  try {
    const token = req.cookies?.token;

    if (!token) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required. Please log in.',
      });
    }

    let decoded;
    try {
      decoded = verifyToken(token);
    } catch (err) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid or expired session token. Please log in again.',
      });
    }

    if (!decoded || !decoded.userId) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Malformed token payload.',
      });
    }

    const [users] = await pool.query(
      'SELECT id, email, display_name AS displayName, preferred_language AS preferredLanguage, created_at AS createdAt FROM users WHERE id = ?',
      [decoded.userId]
    );

    if (users.length === 0) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'User account not found.',
      });
    }

    req.user = users[0];
    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Middleware: Optional authentication.
 * Used for chat & session routes so guest mode remains 100% usable,
 * while logged-in users get their sessions automatically tied to their account.
 */
export async function authOptional(req, res, next) {
  try {
    const token = req.cookies?.token;

    if (!token) {
      req.user = null;
      return next();
    }

    try {
      const decoded = verifyToken(token);
      if (decoded && decoded.userId) {
        const [users] = await pool.query(
          'SELECT id, email, display_name AS displayName, preferred_language AS preferredLanguage, created_at AS createdAt FROM users WHERE id = ?',
          [decoded.userId]
        );
        req.user = users.length > 0 ? users[0] : null;
      } else {
        req.user = null;
      }
    } catch {
      // If token is invalid or expired, gracefully continue as guest without throwing
      req.user = null;
    }

    next();
  } catch (err) {
    next(err);
  }
}
