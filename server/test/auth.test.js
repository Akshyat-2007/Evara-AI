import { describe, it, expect } from 'vitest';
import {
  validateEmail,
  validatePassword,
  hashPassword,
  comparePassword,
  generateToken,
  verifyToken,
} from '../src/utils/auth.js';
import { authRequired, authOptional } from '../src/middleware/auth.js';

describe('Evara AI Authentication Utilities & Security Tests', () => {
  describe('Email Format Validation', () => {
    it('accepts valid standard email addresses', () => {
      expect(validateEmail('priya@example.com')).toBe(true);
      expect(validateEmail('ananya.sharma@health.org.in')).toBe(true);
      expect(validateEmail('user_123@sub.domain.co')).toBe(true);
    });

    it('rejects invalid or malformed email addresses', () => {
      expect(validateEmail('not-an-email')).toBe(false);
      expect(validateEmail('missing-at-sign.com')).toBe(false);
      expect(validateEmail('@missingusername.com')).toBe(false);
      expect(validateEmail('user@missing-tld')).toBe(false);
      expect(validateEmail('')).toBe(false);
      expect(validateEmail(null)).toBe(false);
      expect(validateEmail(undefined)).toBe(false);
    });
  });

  describe('Password Strength Validation', () => {
    it('accepts secure passwords with 8+ chars and letters + numbers', () => {
      expect(validatePassword('PcosCare2026')).toBe(true);
      expect(validatePassword('health1234')).toBe(true);
      expect(validatePassword('StrongPass9!')).toBe(true);
    });

    it('rejects passwords shorter than 8 characters', () => {
      expect(validatePassword('Short1')).toBe(false);
      expect(validatePassword('a1b2c3')).toBe(false);
      expect(validatePassword('')).toBe(false);
    });

    it('rejects passwords without numbers', () => {
      expect(validatePassword('AllLettersOnly')).toBe(false);
      expect(validatePassword('passwordwithoutnumbers')).toBe(false);
    });

    it('rejects passwords without letters', () => {
      expect(validatePassword('1234567890')).toBe(false);
      expect(validatePassword('9876543210')).toBe(false);
    });
  });

  describe('Bcrypt Password Hashing & Verification', () => {
    it('hashes plain text into secure bcrypt hash and verifies match', async () => {
      const plain = 'ConfidentialPassword2026';
      const hash = await hashPassword(plain);

      expect(hash).not.toBe(plain);
      expect(hash.startsWith('$2a$') || hash.startsWith('$2b$')).toBe(true);

      const isMatch = await comparePassword(plain, hash);
      expect(isMatch).toBe(true);

      const isWrong = await comparePassword('IncorrectPassword123', hash);
      expect(isWrong).toBe(false);
    });
  });

  describe('JWT Token Privacy & Verification', () => {
    it('generates token containing ONLY userId for health privacy', () => {
      const userId = 42;
      const token = generateToken(userId);
      expect(typeof token).toBe('string');

      const decoded = verifyToken(token);
      expect(decoded.userId).toBe(userId);
      // Ensure health/symptom details are never embedded in the token
      expect(decoded.symptoms).toBeUndefined();
      expect(decoded.diagnosis).toBeUndefined();
      expect(decoded.email).toBeUndefined();
    });

    it('throws error when verifying tampered or invalid token', () => {
      expect(() => verifyToken('invalid.tampered.token')).toThrow();
    });
  });

  describe('Authentication Middlewares', () => {
    it('authRequired returns 401 when authentication cookie is missing', async () => {
      const req = { cookies: {} };
      let statusCalled = null;
      let jsonCalled = null;
      const res = {
        status: (code) => {
          statusCalled = code;
          return {
            json: (payload) => {
              jsonCalled = payload;
            },
          };
        },
      };
      let nextCalled = false;
      const next = () => {
        nextCalled = true;
      };

      await authRequired(req, res, next);

      expect(statusCalled).toBe(401);
      expect(jsonCalled.error).toBe('Unauthorized');
      expect(nextCalled).toBe(false);
    });

    it('authOptional allows guests through when cookie is missing', async () => {
      const req = { cookies: {} };
      const res = {};
      let nextCalled = false;
      const next = () => {
        nextCalled = true;
      };

      await authOptional(req, res, next);

      expect(req.user).toBeNull();
      expect(nextCalled).toBe(true);
    });

    it('authOptional gracefully falls back to guest if token is invalid', async () => {
      const req = { cookies: { token: 'corrupted-token-xyz' } };
      const res = {};
      let nextCalled = false;
      const next = () => {
        nextCalled = true;
      };

      await authOptional(req, res, next);

      expect(req.user).toBeNull();
      expect(nextCalled).toBe(true);
    });
  });
});
