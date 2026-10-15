# SakhiGuide 🌸 — Hackathon Demo Script

This script walks through 3 realistic test scenarios covering English, Hindi (colloquial Hinglish), and Kannada (native script + colloquial Kannada), demonstrating regional language understanding, rule-based red flag safety detection, clinical triage classification, voice interactions, and the one-page printable doctor summary.

---

## Scenario 1: Hindi (Colloquial Hinglish) — Classic Triad of PCOS

### User Persona
**Pooja, 23**, college student in Delhi experiencing unpredictable cycles, severe breakouts, and distressing hair shedding.

### Input
- **Language Selected:** `हिन्दी (Hindi)` or `Auto-Detect`
- **Method:** Type or speak via microphone
- **User Message:**
  ```text
  periods late aate hain, baal jhad rahe hain, face pe pimples
  ```

### What Happens
1. **Rule-Based Red Flag Check:** Passes safely (no acute emergency keywords).
2. **LLM / Mock Service:** Detects Hindi context, extracts `irregular menstrual cycles`, `hair thinning / hair fall`, and `facial acne / skin breakouts`.
3. **Response:**
   - Plain-language explanation in warm Hindi:
     > *"नमस्ते सखी। आपने जो लक्षण साझा किए हैं—जैसे पीरियड्स में अनियमितता, बालों का झड़ना या चेहरे पर पिंपल्स—ये अक्सर शरीर में हार्मोनल बदलाव या पीसीओएस (PCOS) से जुड़े हो सकते हैं। कृपया याद रखें कि यह केवल शैक्षणिक जानकारी है और कोई चिकित्सीय निदान नहीं है..."*
   - **Triage Card:** Amber badge (`routine_visit`: डॉक्टर से सामान्य परामर्श की सलाह).
   - **Specialist:** Gynecologist (गायनेकोलॉजिस्ट).
   - **Commonly Discussed Tests:** Pelvic ultrasound (pelvic sonogram), Hormone blood panel (LH, FSH, Total Testosterone, TSH, Fasting Insulin).
   - **Questions to Ask Doctor:** *"Could my irregular cycles and symptoms be pointing toward PCOS or insulin resistance?"*
   - **Gentle Follow-Up Question:** *"क्या आपके पीरियड्स हमेशा से ऐसे रहे हैं, या यह बदलाव पिछले कुछ महीनों में ज्यादा हुआ है?"*
4. **Voice:** Tap the "Listen" (सुनें) button on the bubble to hear the response read aloud with browser `speechSynthesis`.

---

## Scenario 2: Kannada (Native Script) — Cycle Delay & Weight Gain

### User Persona
**Kavya, 28**, working professional in Bengaluru noticing weight gain and missed periods over two months.

### Input
- **Language Selected:** `ಕನ್ನಡ (Kannada)`
- **Method:** Type or speak via microphone
- **User Message:**
  ```text
  ತಿಂಗಳು ಸರಿಯಾಗಿ ಬರ್ತಿಲ್ಲ ಮುಖದ ಮೇಲೆ ಮೊಡವೆ ಮತ್ತು ತೂಕ ಹೆಚ್ಚುತ್ತಿದೆ
  ```

### What Happens
1. **Rule-Based Red Flag Check:** Verified clean.
2. **Response:**
   - Plain-language explanation in respectful Kannada:
     > *"ನಮಸ್ಕಾರ ಸಖಿ. ನೀವು ತಿಳಿಸಿದ ಲಕ್ಷಣಗಳು—ಮುಟ್ಟು ತಡವಾಗುವುದು, ಮೊಡವೆಗಳು ಅಥವಾ ತೂಕ ಹೆಚ್ಚಾಗುವುದು—ದೇಹದಲ್ಲಿ ಹಾರ್ಮೋನ್ ಏರುಪೇರು ಅಥವಾ ಪಿಸಿಒಎಸ್ (PCOS) ಸಾಧ್ಯತೆಗಳಿಗೆ ಸಂಬಂಧಿಸಿರಬಹುದು. ದಯವಿಟ್ಟು ಗಮನಿಸಿ: ಇದು ಯಾವುದೇ ವೈದ್ಯಕೀಯ ರೋಗನಿರ್ಣಯವಲ್ಲ..."*
   - **Triage Card:** Amber badge (`routine_visit`: ಸಾಮಾನ್ಯ ವೈದ್ಯಕೀಯ ತಪಾಸಣೆ ಶಿಫಾರಸು ಮಾಡಲಾಗಿದೆ).
   - **Specialist:** Gynecologist / Endocrinologist.
   - **Discussed Tests:** Pelvic ultrasound scan, Thyroid & Metabolic screening.
   - **Gentle Follow-Up:** *"ನಿಮ್ಮ ಋತುಚಕ್ರದ ನಡುವಿನ ಅಂತರ ಸಾಮಾನ್ಯವಾಗಿ ಎಷ್ಟು ದಿನಗಳಿರುತ್ತದೆ ಎಂದು ಹೇಳಬಲ್ಲಿರಾ?"*

---

## Scenario 3: English Emergency Red Flag — Acute Heavy Bleeding

### User Persona
User experiencing an acute hemorrhage during menstruation.

### Input
- **Language Selected:** `English`
- **User Message:**
  ```text
  I am soaking a pad every hour and feeling very dizzy
  ```

### What Happens
1. **Rule-Based Red Flag Triggered:** Pattern `soaking a pad every hour` triggers the pre-LLM safety guard in `server/src/services/redFlags.js`.
2. **Safety Enforcement:** Bypasses standard lower-tier triage and **forces `triage_level = "urgent"`**.
3. **Response:**
   - Red emergency triage card displayed with pulsing alert icon.
   - Immediate directive:
     > *"Warning: The symptoms mentioned (soaking a pad every hour) require prompt in-person emergency evaluation. Please visit an urgent care center or hospital immediately. This tool gives information only and does not diagnose."*
   - Specialist: Emergency Care Physician / Gynecologist.
   - Logged to `red_flag_events` table in MySQL for clinical audit.

---

## Scenario 4: Creating the One-Page Doctor Summary

1. In any scenario, tap the **"Create Doctor Summary 📄"** button.
2. The view smoothly transitions to the **Clinical Discussion Summary**:
   - Header with session timestamp, anonymous session ID, and prominent clinical disclaimer.
   - **Triage Priority** badge and suggested specialist.
   - **Clinical Intake Summary (English)**: Concise, professional clinical summary ready for doctor intake.
   - **Patient Verbatim Descriptions**: The user's exact words in Hindi, Kannada, or English so the physician can see the patient's own phrasing.
   - **Suggested Diagnostic Tests & Clinician Questions**.
3. Tap **"Download / Print Summary 🖨️"**:
   - The browser opens the native print dialog (`window.print()`).
   - Clean print CSS strips away UI navigation, backgrounds, and buttons, producing an elegant, single-sheet clinical PDF with Indic fonts intact.
