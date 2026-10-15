import { describe, it, expect } from 'vitest';
import { checkRedFlags, RED_FLAG_CATEGORIES } from '../src/services/redFlags.js';

describe('SakhiGuide Rule-Based Red Flag Detector', () => {
  describe('Heavy Bleeding Detection', () => {
    it('detects English soaking pad every hour', () => {
      const res = checkRedFlags('I am bleeding heavily and soaking a pad every hour');
      expect(res.isRedFlag).toBe(true);
      expect(res.category).toBe(RED_FLAG_CATEGORIES.HEAVY_BLEEDING);
    });

    it('detects Hinglish heavy bleeding phrase', () => {
      const res = checkRedFlags('har ghante pad change karna pad raha hai bohot zyada bleeding');
      expect(res.isRedFlag).toBe(true);
      expect(res.category).toBe(RED_FLAG_CATEGORIES.HEAVY_BLEEDING);
    });

    it('detects Hindi Devanagari heavy bleeding', () => {
      const res = checkRedFlags('मुझे हर घंटे पैड बदलना पड़ रहा है बहुत ज्यादा खून आ रहा है');
      expect(res.isRedFlag).toBe(true);
      expect(res.category).toBe(RED_FLAG_CATEGORIES.HEAVY_BLEEDING);
    });

    it('detects Kannada heavy bleeding', () => {
      const res = checkRedFlags('ಪ್ರತಿ ಗಂಟೆಗೆ ಪ್ಯಾಡ್ ನೆನೆಯುತ್ತಿದೆ ಅತಿಯಾದ ರಕ್ತಸ್ರಾವ');
      expect(res.isRedFlag).toBe(true);
      expect(res.category).toBe(RED_FLAG_CATEGORIES.HEAVY_BLEEDING);
    });

    it('detects Telugu heavy bleeding', () => {
      const res = checkRedFlags('నాకు గంటకో ప్యాడ్ తడుస్తోంది అధిక రక్తస్రావం');
      expect(res.isRedFlag).toBe(true);
      expect(res.category).toBe(RED_FLAG_CATEGORIES.HEAVY_BLEEDING);
    });
  });

  describe('Severe Pelvic Pain Detection', () => {
    it('detects English severe sudden pelvic pain', () => {
      const res = checkRedFlags('I have severe sudden pelvic pain and cannot stand');
      expect(res.isRedFlag).toBe(true);
      expect(res.category).toBe(RED_FLAG_CATEGORIES.SEVERE_PELVIC_PAIN);
    });

    it('detects Hinglish acute pelvic pain', () => {
      const res = checkRedFlags('achanak pet ke nichle hisse me tez dard ho raha hai');
      expect(res.isRedFlag).toBe(true);
      expect(res.category).toBe(RED_FLAG_CATEGORIES.SEVERE_PELVIC_PAIN);
    });

    it('detects Kannada severe hotte novu', () => {
      const res = checkRedFlags('ತೀವ್ರವಾದ ಹೊಟ್ಟೆ ನೋವು ತಡೆಯಲು ಆಗುತ್ತಿಲ್ಲ');
      expect(res.isRedFlag).toBe(true);
      expect(res.category).toBe(RED_FLAG_CATEGORIES.SEVERE_PELVIC_PAIN);
    });
  });

  describe('Fainting & Syncope Detection', () => {
    it('detects fainting in English', () => {
      const res = checkRedFlags('I had dizziness and then passed out on the floor');
      expect(res.isRedFlag).toBe(true);
      expect(res.category).toBe(RED_FLAG_CATEGORIES.FAINTING);
    });

    it('detects behosh in Hindi', () => {
      const res = checkRedFlags('subah chakkar aakar gir gayi aur behosh ho gayi');
      expect(res.isRedFlag).toBe(true);
      expect(res.category).toBe(RED_FLAG_CATEGORIES.FAINTING);
    });

    it('detects moorche in Kannada', () => {
      const res = checkRedFlags('ನನಗೆ ಪ್ರಜ್ಞೆ ತಪ್ಪಿ ಮೂರ್ಛೆ ಬಂದಿತ್ತು');
      expect(res.isRedFlag).toBe(true);
      expect(res.category).toBe(RED_FLAG_CATEGORIES.FAINTING);
    });
  });

  describe('Pregnancy Bleeding & Prolonged Amenorrhea', () => {
    it('detects bleeding while pregnant', () => {
      const res = checkRedFlags('I am 6 weeks pregnant and bleeding today');
      expect(res.isRedFlag).toBe(true);
      expect(res.category).toBe(RED_FLAG_CATEGORIES.PREGNANCY_BLEEDING);
    });

    it('detects 3 months no period with pregnancy risk', () => {
      const res = checkRedFlags('I have had no period for 3 months and might be pregnant');
      expect(res.isRedFlag).toBe(true);
      expect(res.category).toBe(RED_FLAG_CATEGORIES.PROLONGED_AMENORRHEA_PREGNANCY_RISK);
    });
  });

  describe('Cardiopulmonary Emergencies', () => {
    it('detects chest pain', () => {
      const res = checkRedFlags('seene me dard ho raha hai aur chakkar aa rahe');
      expect(res.isRedFlag).toBe(true);
      expect(res.category).toBe(RED_FLAG_CATEGORIES.CHEST_PAIN);
    });

    it('detects shortness of breath', () => {
      const res = checkRedFlags('I have shortness of breath and trouble breathing');
      expect(res.isRedFlag).toBe(true);
      expect(res.category).toBe(RED_FLAG_CATEGORIES.SHORTNESS_OF_BREATH);
    });
  });

  describe('Self-Harm and Mental Health Crisis with Helpline Triggers', () => {
    it('detects self-harm expressions and provides compassionate helpline details', () => {
      const res = checkRedFlags('I feel so hopeless and want to end my life');
      expect(res.isRedFlag).toBe(true);
      expect(res.isSelfHarm).toBe(true);
      expect(res.category).toBe(RED_FLAG_CATEGORIES.SELF_HARM);
      expect(res.supportMessage).toContain('Tele-MANAS');
      expect(res.supportMessage).toContain('14416');
      expect(res.supportMessage).toContain('KIRAN');
    });

    it('detects Hindi self-harm phrase', () => {
      const res = checkRedFlags('ab bilkul jeena nahi chahti khud ko khatam karna hai');
      expect(res.isRedFlag).toBe(true);
      expect(res.isSelfHarm).toBe(true);
    });
  });

  describe('Safe Non-Red-Flag Everyday Symptom Inputs', () => {
    it('does not trigger on ordinary irregular period reports', () => {
      const res = checkRedFlags('periods late aate hain, baal jhad rahe hain, face pe pimples');
      expect(res.isRedFlag).toBe(false);
      expect(res.category).toBeNull();
    });

    it('does not trigger on general Kannada symptom description', () => {
      const res = checkRedFlags('ತಿಂಗಳು ಸರಿಯಾಗಿ ಬರ್ತಿಲ್ಲ ಮುಖದ ಮೇಲೆ ಮೊಡವೆ ಮತ್ತು ತೂಕ ಹೆಚ್ಚುತ್ತಿದೆ');
      expect(res.isRedFlag).toBe(false);
      expect(res.category).toBeNull();
    });

    it('does not trigger on mild menstrual cramps', () => {
      const res = checkRedFlags('mild menstrual cramps on the first day of period');
      expect(res.isRedFlag).toBe(false);
    });
  });
});
