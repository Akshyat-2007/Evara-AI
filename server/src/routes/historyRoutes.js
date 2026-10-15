import express from 'express';
import pool from '../db/connection.js';
import { authRequired } from '../middleware/auth.js';

const router = express.Router();

/**
 * GET /api/history
 * Returns the authenticated user's consultation sessions and symptom reports.
 */
router.get('/', authRequired, async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Fetch user's sessions with the latest symptom report and red flag count
    const [rows] = await pool.query(`
      SELECT 
        s.id AS sessionId,
        s.language,
        s.created_at AS sessionDate,
        sr.triage_level AS triageLevel,
        sr.suggested_specialist AS suggestedSpecialist,
        sr.symptoms_json AS symptomsJson,
        sr.summary_en AS summaryEn,
        (SELECT COUNT(*) FROM messages m WHERE m.session_id = s.id) AS messageCount,
        (SELECT COUNT(*) FROM red_flag_events rf WHERE rf.session_id = s.id) AS redFlagCount
      FROM sessions s
      LEFT JOIN (
        SELECT sr1.*
        FROM symptom_reports sr1
        INNER JOIN (
          SELECT session_id, MAX(id) AS max_id
          FROM symptom_reports
          GROUP BY session_id
        ) sr2 ON sr1.id = sr2.max_id
      ) sr ON s.id = sr.session_id
      WHERE s.user_id = ?
      ORDER BY s.created_at DESC
    `, [userId]);

    const sessions = rows.map((row) => {
      let symptoms = [];
      if (row.symptomsJson) {
        try {
          symptoms = typeof row.symptomsJson === 'string'
            ? JSON.parse(row.symptomsJson)
            : row.symptomsJson;
        } catch {
          symptoms = [];
        }
      }

      return {
        sessionId: row.sessionId,
        language: row.language,
        sessionDate: row.sessionDate,
        triageLevel: row.triageLevel || 'self_care',
        suggestedSpecialist: row.suggestedSpecialist || 'Gynecologist',
        symptoms: Array.isArray(symptoms) ? symptoms : [],
        summaryEn: row.summaryEn || '',
        messageCount: Number(row.messageCount || 0),
        redFlagCount: Number(row.redFlagCount || 0),
      };
    });

    res.json({
      sessions,
      totalCount: sessions.length,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
