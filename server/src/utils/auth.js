import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'evara_fallback_dev_secret_key_change_in_production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

/**
 * Validate email format with regex.
 */
export function validateEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

/**
 * Validate password requirements:
 * At least 8 characters, containing both letters and numbers.
 */
export function validatePassword(password) {
  if (!password || typeof password !== 'string') return false;
  if (password.length < 8) return false;
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasDigit = /[0-9]/.test(password);
  return hasLetter && hasDigit;
}

/**
 * Hash password with bcrypt.
 */
export async function hashPassword(plainPassword) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(plainPassword, salt);
}

/**
 * Compare plain password with bcrypt hash.
 */
export async function comparePassword(plainPassword, hash) {
  return bcrypt.compare(plainPassword, hash);
}

/**
 * Generate signed JWT containing only userId for privacy.
 */
export function generateToken(userId) {
  return jwt.sign({ userId }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });
}

/**
 * Verify JWT token.
 */
export function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

/**
 * Set secure, httpOnly cookie for authentication.
 */
export function setAuthCookie(res, token) {
  const isProduction = process.env.NODE_ENV === 'production';
  res.cookie('token', token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
    path: '/',
  });
}

/**
 * Clear authentication cookie.
 */
export function clearAuthCookie(res) {
  const isProduction = process.env.NODE_ENV === 'production';
  res.clearCookie('token', {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/',
  });
}
