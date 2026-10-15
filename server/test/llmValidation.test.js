import { describe, it, expect } from 'vitest';
import {
  validateLLMOutput,
  extractAndParseJSON,
  getSafeFallbackReply,
  generateMockResponse,
} from '../src/services/llm.js';

describe('SakhiGuide LLM Service & JSON Validation', () => {
  const validPayload = {
    detected_language: 'hi',
    reply_text: 'नमस्ते सखी, यह सामान्य जानकारी है।',
    symptoms: [{ name: 'irregular periods', detail: 'late by 2 weeks' }],
    triage_level: 'routine_visit',
    suggested_specialist: 'gynecologist',
    commonly_discussed_tests: ['pelvic ultrasound', 'hormone panel'],
    questions_for_doctor: ['Could this be PCOS?'],
    follow_up_question: 'क्या आपका वजन भी बढ़ा है?',
    doctor_summary_en: 'Patient presents with delayed cycles.',
  };

  describe('validateLLMOutput Schema Validator', () => {
    it('accepts a fully compliant schema object', () => {
      expect(validateLLMOutput(validPayload)).toBe(true);
    });

    it('rejects null or non-object values', () => {
      expect(validateLLMOutput(null)).toBe(false);
      expect(validateLLMOutput('string')).toBe(false);
      expect(validateLLMOutput(123)).toBe(false);
    });

    it('rejects payload with invalid triage_level', () => {
      const invalid = { ...validPayload, triage_level: 'critical_emergency_unknown' };
      expect(validateLLMOutput(invalid)).toBe(false);
    });

    it('rejects payload when required array is missing or wrong type', () => {
      const invalid = { ...validPayload, symptoms: 'not an array' };
      expect(validateLLMOutput(invalid)).toBe(false);
    });

    it('rejects payload when doctor_summary_en is missing', () => {
      const invalid = { ...validPayload };
      delete invalid.doctor_summary_en;
      expect(validateLLMOutput(invalid)).toBe(false);
    });
  });

  describe('extractAndParseJSON Parser', () => {
    it('parses raw clean JSON string', () => {
      const jsonStr = JSON.stringify(validPayload);
      const res = extractAndParseJSON(jsonStr);
      expect(res).not.toBeNull();
      expect(res.triage_level).toBe('routine_visit');
    });

    it('parses markdown wrapped ```json ``` block', () => {
      const fenced = '```json\n' + JSON.stringify(validPayload) + '\n```';
      const res = extractAndParseJSON(fenced);
      expect(res).not.toBeNull();
      expect(res.suggested_specialist).toBe('gynecologist');
    });

    it('extracts embedded JSON surrounded by conversational text', () => {
      const surrounded = 'Here is the response:\n' + JSON.stringify(validPayload) + '\nHope this helps!';
      const res = extractAndParseJSON(surrounded);
      expect(res).not.toBeNull();
      expect(res.detected_language).toBe('hi');
    });

    it('returns null for unparseable garbage text', () => {
      expect(extractAndParseJSON('This is not json at all')).toBeNull();
      expect(extractAndParseJSON('{ broken json: true,')).toBeNull();
    });
  });

  describe('Safe Fallback & Mock Engine', () => {
    it('generates a valid fallback object adhering to schema in Hindi', () => {
      const fallback = getSafeFallbackReply('hi');
      expect(validateLLMOutput(fallback)).toBe(true);
      expect(fallback.detected_language).toBe('hi');
      expect(fallback.reply_text).toContain('निदान');
    });

    it('generates a valid fallback object in Kannada', () => {
      const fallback = getSafeFallbackReply('kn');
      expect(validateLLMOutput(fallback)).toBe(true);
      expect(fallback.detected_language).toBe('kn');
      expect(fallback.reply_text).toContain('ರೋಗನಿರ್ಣಯ');
    });

    it('generates a valid intelligent mock response for Hinglish symptom input', () => {
      const mock = generateMockResponse('periods late aate hain, baal jhad rahe hain, face pe pimples', 'hi');
      expect(validateLLMOutput(mock)).toBe(true);
      expect(mock.symptoms.length).toBeGreaterThanOrEqual(2);
      expect(mock.triage_level).toBe('routine_visit');
    });

    it('forces triage_level to urgent in mock engine if red flag is passed', () => {
      const redFlag = {
        isRedFlag: true,
        category: 'HEAVY_BLEEDING',
        matchedTerm: 'soaking a pad every hour',
        labelEn: 'Very heavy bleeding',
      };
      const mock = generateMockResponse('soaking a pad every hour', 'en', redFlag);
      expect(mock.triage_level).toBe('urgent');
    });
  });
});
