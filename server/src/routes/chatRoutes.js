import express from 'express';
import pool from '../db/connection.js';
import checkRedFlags from '../services/redFlags.js';
import { queryLLM } from '../services/llm.js';
import { authOptional } from '../middleware/auth.js';

const router = express.Router();

/**
 * POST /api/chat
 * Handles user symptom descriptions in any regional language or English.
 * 
 * Body: { sessionId: string, message: string, language?: string }
 * Returns: Structured response according to LLM contract + redFlagTriggered
 */
router.post('/', authOptional, async (req, res, next) => {
  try {
    const { sessionId, message, language = 'auto' } = req.body || {};

    if (!sessionId || typeof sessionId !== 'string') {
      return res.status(400).json({
        error: 'ValidationError',
        message: 'A valid sessionId is required.',
      });
    }

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({
        error: 'ValidationError',
        message: 'Message cannot be empty.',
      });
    }

    const trimmedMessage = message.trim();
    const userId = req.user?.id || null;

    // 1. Ensure session exists (or create if missing)
    const [existingSessions] = await pool.query(
      'SELECT id, language, user_id FROM sessions WHERE id = ?',
      [sessionId]
    );

    if (existingSessions.length === 0) {
      await pool.query(
        'INSERT INTO sessions (id, language, user_id) VALUES (?, ?, ?)',
        [sessionId, language, userId]
      );
    } else {
      if (language && language !== 'auto') {
        await pool.query(
          'UPDATE sessions SET language = ? WHERE id = ?',
          [language, sessionId]
        );
      }
      // If user is logged in and session was not previously linked, link it now
      if (userId && existingSessions[0].user_id === null) {
        await pool.query(
          'UPDATE sessions SET user_id = ? WHERE id = ?',
          [userId, sessionId]
        );
      }
    }

    // 2. Fetch recent conversation history (up to last 10 messages for context)
    const [rawHistory] = await pool.query(
      'SELECT role, content FROM messages WHERE session_id = ? ORDER BY id ASC LIMIT 10',
      [sessionId]
    );

    // 3. STEP 1 SAFETY: Execute Rule-Based Red-Flag Detector BEFORE the LLM
    const redFlagResult = checkRedFlags(trimmedMessage);

    if (redFlagResult.isRedFlag) {
      console.warn(
        `🚨 Red Flag Detected for session ${sessionId}: [${redFlagResult.category}] "${redFlagResult.matchedTerm}"`
      );

      // Log red flag event
      try {
        await pool.query(
          'INSERT INTO red_flag_events (session_id, matched_term) VALUES (?, ?)',
          [sessionId, `${redFlagResult.category}: ${redFlagResult.matchedTerm}`]
        );
      } catch (logErr) {
        console.error('Failed to log red flag event:', logErr.message);
      }
    }

    // 4. STEP 2: Call LLM Service (with history, language hint, and red-flag result)
    const llmResponse = await queryLLM({
      message: trimmedMessage,
      conversationHistory: rawHistory,
      language,
      redFlagResult,
    });

    // 5. Hard rule: If red flag was detected, enforce triage_level = urgent
    if (redFlagResult.isRedFlag) {
      llmResponse.triage_level = 'urgent';
    }

    // 6. Persist to database
    // Record user message
    await pool.query(
      'INSERT INTO messages (session_id, role, content) VALUES (?, ?, ?)',
      [sessionId, 'user', trimmedMessage]
    );

    // Record assistant message
    await pool.query(
      'INSERT INTO messages (session_id, role, content) VALUES (?, ?, ?)',
      [sessionId, 'assistant', llmResponse.reply_text]
    );

    // Record structured symptom report
    await pool.query(
      'INSERT INTO symptom_reports (session_id, symptoms_json, triage_level, suggested_specialist, summary_en) VALUES (?, ?, ?, ?, ?)',
      [
        sessionId,
        JSON.stringify(llmResponse.symptoms || []),
        llmResponse.triage_level || 'self_care',
        llmResponse.suggested_specialist || 'gynecologist',
        llmResponse.doctor_summary_en || '',
      ]
    );

    // 7. Return payload to client
    res.json({
      ...llmResponse,
      redFlagTriggered: redFlagResult.isRedFlag,
      redFlagDetail: redFlagResult.isRedFlag
        ? {
            category: redFlagResult.category,
            matchedTerm: redFlagResult.matchedTerm,
            labelEn: redFlagResult.labelEn,
            isSelfHarm: redFlagResult.isSelfHarm,
            urgencyReason: redFlagResult.urgencyReason,
          }
        : null,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
