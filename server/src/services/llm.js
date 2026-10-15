/**
 * SakhiGuide LLM Service
 * 
 * Provides unified interface for LLM completions.
 * Supports:
 *  1. Google Gemini API (gemini-3.8-flash) via GOOGLE_API_KEY / GEMINI_API_KEY
 *  2. Anthropic Claude SDK via ANTHROPIC_API_KEY
 *  3. Intelligent Multilingual Mock Engine as offline fallback with category-specific differentiation
 * 
 * Dynamically adapts output according to user search to avoid repetitive results.
 */

import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import SYSTEM_PROMPT from '../prompts/system.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.8-flash';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const LLM_MODEL = process.env.LLM_MODEL || 'claude-3-5-sonnet-20241022';

let anthropicClient = null;
if (ANTHROPIC_API_KEY && ANTHROPIC_API_KEY.trim().length > 0) {
  try {
    anthropicClient = new Anthropic({ apiKey: ANTHROPIC_API_KEY });
    console.log(`🤖 Anthropic Claude client initialized with model: ${LLM_MODEL}`);
  } catch (err) {
    console.warn('⚠️ Failed to initialize Anthropic client:', err.message);
  }
}

if (GOOGLE_API_KEY && GOOGLE_API_KEY.trim().length > 0) {
  console.log(`✨ Google Gemini LLM active with model: ${GEMINI_MODEL} (Query-specific completions enabled)`);
} else if (!anthropicClient) {
  console.log('💡 No API key found. SakhiGuide running in Intelligent Multilingual Mock Mode.');
}

/**
 * Validates output according to the required SakhiGuide LLM Contract schema.
 */
export function validateLLMOutput(data) {
  if (!data || typeof data !== 'object') return false;

  const validTriage = ['self_care', 'routine_visit', 'urgent'];
  
  const hasValidFields = 
    typeof data.detected_language === 'string' &&
    typeof data.reply_text === 'string' &&
    Array.isArray(data.symptoms) &&
    validTriage.includes(data.triage_level) &&
    typeof data.suggested_specialist === 'string' &&
    Array.isArray(data.commonly_discussed_tests) &&
    Array.isArray(data.questions_for_doctor) &&
    typeof data.follow_up_question === 'string' &&
    typeof data.doctor_summary_en === 'string';

  return Boolean(hasValidFields);
}

/**
 * Extracts and parses JSON from raw LLM text (handling potential markdown wrapping)
 */
export function extractAndParseJSON(rawText) {
  if (!rawText || typeof rawText !== 'string') return null;

  let cleaned = rawText.trim();
  // Strip markdown code fences if present
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/^```json\s*/i, '').replace(/```\s*$/i, '');
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```\s*/, '').replace(/```\s*$/, '');
  }

  try {
    return JSON.parse(cleaned);
  } catch (e) {
    // Attempt regex match for outer curly braces
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch (err) {
        return null;
      }
    }
    return null;
  }
}

/**
 * Invokes Google Gemini API with system instructions and JSON response schema.
 * Uses temperature: 0.65 to ensure fresh, query-distinct phrasing and test selection.
 */
async function queryGemini({ message, conversationHistory = [], language = 'auto', redFlagResult = null }) {
  const contents = [];

  // Add conversation history
  for (const turn of conversationHistory) {
    contents.push({
      role: turn.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: turn.content }],
    });
  }

  // Construct current prompt with system instructions
  let promptText = `${SYSTEM_PROMPT}\n\n`;
  if (language && language !== 'auto') {
    promptText += `[User selected language preference: ${language}]\n`;
  }
  if (redFlagResult?.isRedFlag) {
    promptText += `[SAFETY ALERT: A rule-based red flag was detected: "${redFlagResult.matchedTerm}" (${redFlagResult.labelEn}). You MUST mark triage_level as "urgent" and provide supportive urgent care guidance.]\n`;
  }
  promptText += `User Symptom Inquiry:\n"${message}"\n\nREMINDER: Tailor the explanation, specialist, tests, and doctor questions specifically to THIS inquiry. Do NOT use generic PCOS templates unless the user inquiry genuinely points to it. Return ONLY a single raw valid JSON object.`;

  contents.push({
    role: 'user',
    parts: [{ text: promptText }],
  });

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GOOGLE_API_KEY}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents,
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.65, // Higher temperature for query-distinct responses
      },
    }),
  });

  const data = await response.json();
  if (data.error) {
    throw new Error(data.error.message || 'Gemini API returned an error');
  }

  const rawJson = data.candidates?.[0]?.content?.parts?.[0]?.text;
  return extractAndParseJSON(rawJson);
}

/**
 * Generates a safe, non-diagnostic generic fallback response matching the user's language.
 */
export function getSafeFallbackReply(language = 'en', redFlagResult = null) {
  const isUrgent = redFlagResult?.isRedFlag;
  const triageLevel = isUrgent ? 'urgent' : 'routine_visit';
  const specialist = isUrgent ? 'emergency medical care / gynecologist' : 'gynecologist';

  const languageMap = {
    hi: {
      reply_text: isUrgent
        ? 'आपके द्वारा बताए गए लक्षणों को देखते हुए, कृपया तुरंत किसी नजदीकी डॉक्टर या अस्पताल से संपर्क करें। यह केवल सामान्य जानकारी है, कोई चिकित्सीय निदान नहीं।'
        : 'आपके द्वारा साझा किए गए लक्षण हार्मोनल बदलाव या स्वास्थ्य कारणों से जुड़े हो सकते हैं। कृपया ध्यान दें कि यह कोई निदान नहीं है। व्यक्तिगत जांच के लिए डॉक्टर से परामर्श लेना सबसे सुरक्षित रहेगा।',
      follow_up_question: 'क्या आप बता सकती हैं कि यह समस्या कितने समय से महसूस हो रही है?',
    },
    kn: {
      reply_text: isUrgent
        ? 'ನೀವು ತಿಳಿಸಿದ ಲಕ್ಷಣಗಳನ್ನು ಗಮನಿಸಿದರೆ, ದಯವಿಟ್ಟು ಕೂಡಲೇ ಹತ್ತಿರದ ಆಸ್ಪತ್ರೆ ಅಥವಾ ವೈದ್ಯರನ್ನು ಸಂಪರ್ಕಿಸಿ. ಇದು ಕೇವಲ ಮಾಹಿತಿ, ಯಾವುದೇ ರೋಗನಿರ್ಣಯವಲ್ಲ.'
        : 'ನೀವು ಹಂಚಿಕೊಂಡ ಲಕ್ಷಣಗಳು ಹಾರ್ಮೋನ್ ವ್ಯತ್ಯಾಸ ಅಥವಾ ಇತರ ಕಾರಣಗಳಿಗೆ ಸಂಬಂಧಿಸಿರಬಹುದು. ಇದು ಖಚಿತ ರೋಗನಿರ್ಣಯವಲ್ಲ. ಸೂಕ್ತ ತಪಾಸಣೆಗಾಗಿ ವೈದ್ಯರನ್ನು ಭೇಟಿ ಮಾಡುವುದು ಉತ್ತಮ.',
      follow_up_question: 'ಈ ತೊಂದರೆ ಎಷ್ಟು ತಿಂಗಳುಗಳಿಂದ ಕಾಣಿಸಿಕೊಳ್ಳುತ್ತಿದೆ ಎಂದು ತಿಳಿಸಬಹುದೇ?',
    },
    en: {
      reply_text: isUrgent
        ? 'Based on the concerning symptoms reported, please seek prompt in-person medical evaluation. This tool provides information only and does not diagnose.'
        : 'The symptoms you described may be associated with hormonal fluctuations or specific metabolic factors. Please note that this is informational and not a diagnosis. Consulting a physician is recommended for personalized evaluation.',
      follow_up_question: 'How long have you noticed these symptoms occurring?',
    },
  };

  const selected = languageMap[language] || languageMap.en;

  return {
    detected_language: language,
    reply_text: selected.reply_text,
    symptoms: [
      {
        name: 'Reported symptoms',
        detail: 'User discussed specific physical or menstrual concerns',
      },
    ],
    triage_level: triageLevel,
    suggested_specialist: specialist,
    commonly_discussed_tests: [
      'Comprehensive clinical history review',
      'Targeted baseline laboratory tests based on reported timeline',
    ],
    questions_for_doctor: [
      'What potential underlying factors could explain these specific symptoms?',
      'Are there specific initial blood tests or imaging recommended for my case?',
    ],
    follow_up_question: selected.follow_up_question,
    doctor_summary_en:
      'Patient reports ongoing health/cycle variations. Clinical evaluation recommended for targeted diagnostic assessment. (Non-diagnostic educational assessment).',
  };
}

/**
 * Intelligent multilingual mock engine with deep category-specific branching
 * to guarantee different results according to the user's specific search.
 */
export function generateMockResponse(userMessage, preferredLanguage = 'auto', redFlagResult = null) {
  const msgLower = (userMessage || '').toLowerCase();

  // Detect language if auto
  let lang = preferredLanguage;
  if (!lang || lang === 'auto') {
    if (/[\u0900-\u097F]/.test(userMessage)) lang = 'hi';
    else if (/[\u0C80-\u0CFF]/.test(userMessage)) lang = 'kn';
    else if (/[\u0B80-\u0BFF]/.test(userMessage)) lang = 'ta';
    else if (/[\u0C00-\u0C7F]/.test(userMessage)) lang = 'te';
    else if (/[\u0980-\u09FF]/.test(userMessage)) lang = 'bn';
    else if (/(hain|hai|aate|baal|pet|mahine|dard|wajan|chhidh|thakan)/i.test(msgLower)) lang = 'hi';
    else if (/(aagilla|agilla|hotte|tingalu|beku|novu|thooka)/i.test(msgLower)) lang = 'kn';
    else lang = 'en';
  }

  // Red Flag Urgent Override
  if (redFlagResult?.isRedFlag) {
    const isSelfHarm = redFlagResult.isSelfHarm;
    let replyText = '';
    
    if (isSelfHarm) {
      if (lang === 'hi') {
        replyText = 'आपकी सुरक्षा और मानसिक स्वास्थ्य सबसे महत्वपूर्ण है। आप अकेली नहीं हैं। कृपया अभी किसी अपने से बात करें या निःशुल्क टेली-मानस (Tele-MANAS) हेल्पलाइन 14416 या 1800-891-4416 पर कॉल करें। किरण (KIRAN) हेल्पलाइन 1800-599-0019 भी 24x7 उपलब्ध है।';
      } else if (lang === 'kn') {
        replyText = 'ನಿಮ್ಮ ಸುರಕ್ಷತೆ ಮತ್ತು ಮನಃಶಾಂತಿ ನಮಗೆ ಅತ್ಯಂತ ಮುಖ್ಯ. ನೀವು ಒಂಟಿಯಲ್ಲ. ದಯವಿಟ್ಟು ತಕ್ಷಣ ನಿಮ್ಮ ಆಪ್ತರೊಂದಿಗೆ ಮಾತನಾಡಿ ಅಥವಾ ಭಾರತ ಸರ್ಕಾರದ ಟೆಲಿ-ಮಾನಸ್ (Tele-MANAS) ಉಚಿತ ಸಹಾಯವಾಣಿ 14416 / 1800-891-4416 ಅಥವಾ ಕಿರಣ್ 1800-599-0019 ಗೆ ಕರೆ ಮಾಡಿ.';
      } else {
        replyText = redFlagResult.supportMessage || 'Please know you are not alone and support is available right now. Call Tele-MANAS toll-free at 14416 or 1800-891-4416, or KIRAN at 1800-599-0019 immediately.';
      }
    } else {
      if (lang === 'hi') {
        replyText = `सावधानी: आपने जिन लक्षणों का उल्लेख किया है (${redFlagResult.matchedTerm}), वे आपातकालीन संकेत हो सकते हैं। कृपया बिना देर किए किसी नजदीकी डॉक्टर या अस्पताल की इमरजेंसी में दिखाएं। यह केवल सूचनात्मक मार्गदर्शन है, निदान नहीं।`;
      } else if (lang === 'kn') {
        replyText = `ಎಚ್ಚರಿಕೆ: ನೀವು ತಿಳಿಸಿದ ಲಕ್ಷಣಗಳು (${redFlagResult.matchedTerm}) ತುರ್ತು ವೈದ್ಯಕೀಯ ನೆರವಿನ ಅಗತ್ಯವನ್ನು ಸೂಚಿಸುತ್ತವೆ. ದಯವಿಟ್ಟು ತಕ್ಷಣ ಹತ್ತಿರದ ಆಸ್ಪತ್ರೆ ಅಥವಾ ತುರ್ತು ಚಿಕಿತ್ಸಾ ಘಟಕಕ್ಕೆ ಭೇಟಿ ನೀಡಿ. ಇದು ಕೇವಲ ಮಾಹಿತಿ, ರೋಗನಿರ್ಣಯವಲ್ಲ.`;
      } else {
        replyText = `Warning: The symptoms mentioned (${redFlagResult.matchedTerm}) require prompt in-person emergency evaluation. Please visit an urgent care center or hospital immediately. This tool gives information only and does not diagnose.`;
      }
    }

    return {
      detected_language: lang,
      reply_text: replyText,
      symptoms: [
        {
          name: redFlagResult.labelEn || 'Critical Red Flag Symptom',
          detail: `User reported: "${redFlagResult.matchedTerm}" (${redFlagResult.urgencyReason || 'Acute symptom'})`,
        },
      ],
      triage_level: 'urgent',
      suggested_specialist: 'emergency care physician / gynecologist',
      commonly_discussed_tests: [
        'Urgent in-person clinical assessment',
        'Bedside pelvic ultrasound and hemodynamic monitoring',
      ],
      questions_for_doctor: [
        'Could these acute symptoms indicate an emergency complication requiring urgent intervention?',
      ],
      follow_up_question: lang === 'hi' 
        ? 'क्या आपके पास कोई इस समय अस्पताल जाने में मदद के लिए मौजूद है?' 
        : (lang === 'kn' ? 'ನಿಮ್ಮೊಂದಿಗೆ ಯಾರಾದರೂ ಆಸ್ಪತ್ರೆಗೆ ಬರಲು ಸಹಾಯಕ್ಕೆ ಇದ್ದಾರೆಯೇ?' : 'Is someone available right now to assist you in reaching medical care?'),
      doctor_summary_en: `EMERGENCY ALERT: Patient reported acute red-flag symptom (${redFlagResult.labelEn}: "${redFlagResult.matchedTerm}"). Immediate in-person medical evaluation advised.`,
    };
  }

  // QUERY-SPECIFIC BRANCHING: Categorize user's exact topic
  const isCrampsPain = /(cramp|pain|dard|dysmenorrhea|pet dard|pelvic|novu|vali|noppi)/i.test(msgLower);
  const isHairLoss = /(hair|baal|shedding|jhad|bald|scalp|koodalu|mudi|juttu)/i.test(msgLower);
  const isAcne = /(acne|pimple|breakout|cystic|face|modave|mugapparu|motimalu)/i.test(msgLower);
  const isMetabolic = /(sugar|cravings|dark|neck|wajan|weight|fatigue|thakan|ayasa|baruvu|thooka)/i.test(msgLower);
  const isMoodPMDD = /(mood|anxiety|depress|crying|irritab|gussa|chidhchidh|chinta)/i.test(msgLower);
  const isBloatingGut = /(bloat|gas|constipat|digestion|stomach upset|pet phool)/i.test(msgLower);

  // 1. CRAMPS & PERIOD PAIN
  if (isCrampsPain && !msgLower.includes('soak')) {
    const isHindi = lang === 'hi';
    const isKannada = lang === 'kn';
    return {
      detected_language: lang,
      reply_text: isHindi
        ? 'पीरियड्स के दौरान तेज दर्द या ऐंठन (Cramps) अक्सर गर्भाशय की मांसपेशियों में प्रोस्टाग्लैंडिंस के स्राव या एंडोमेट्रियोसिस/एडेनोमायोसिस जैसी स्थितियों से जुड़ा हो सकता है। कृपया ध्यान दें: यह कोई निदान नहीं है। एक गायनेकोलॉजिस्ट से जांच कराकर दर्द के सही कारण को समझना बहुत जरूरी है।'
        : (isKannada
          ? 'ಮುಟ್ಟಿನ ಸಮಯದಲ್ಲಿ ತೀವ್ರ ಹೊಟ್ಟೆ ನೋವು ಅಥವಾ ಸೆಳೆತ (Cramps) ಗರ್ಭಾಶಯದ ಪ್ರೊಸ್ಟಾಗ್ಲಾಂಡಿನ್ ಹಾರ್ಮೋನ್ ಅಥವಾ ಎಂಡೊಮೆಟ್ರಿಯೊಸಿಸ್ ಸಾಧ್ಯತೆಗೆ ಸಂಬಂಧಿಸಿರಬಹುದು. ಇದು ಯಾವುದೇ ಖಚಿತ ರೋಗನಿರ್ಣಯವಲ್ಲ. ಸ್ತ್ರೀರೋಗ ತಜ್ಞರನ್ನು ಸಂಪರ್ಕಿಸುವುದು ಸೂಕ್ತ.'
          : 'Menstrual cramping and pelvic pain can be related to primary dysmenorrhea (elevated prostaglandins), or conditions like endometriosis, adenomyosis, or fibroids. Please note: this is informative guidance and not a diagnosis. An evaluation with a gynecologist can help identify the root cause.'),
      symptoms: [{ name: 'menstrual cramps / pelvic discomfort', detail: 'User noted cyclic abdominal or pelvic pain' }],
      triage_level: 'routine_visit',
      suggested_specialist: 'gynecologist',
      commonly_discussed_tests: [
        'Transvaginal or pelvic ultrasound (evaluating for endometriomas, adenomyosis, or fibroids)',
        'Detailed menstrual pain and cycle calendar',
      ],
      questions_for_doctor: [
        'Does my pain pattern suggest secondary dysmenorrhea or conditions like endometriosis?',
        'What targeted pain management or hormonal therapies would be appropriate for my cycle?',
      ],
      follow_up_question: isHindi
        ? 'क्या यह दर्द पीरियड्स शुरू होने से पहले शुरू होता है, या केवल ब्लीडिंग के पहले दिन रहता है?'
        : (isKannada ? 'ಈ ನೋವು ಮುಟ್ಟು ಪ್ರಾರಂಭವಾಗುವ ಮೊದಲೇ ಬರುತ್ತದೆಯೇ ಅಥವಾ ಮೊದಲ ದಿನ ಮಾತ್ರ ಇರುತ್ತದೆಯೇ?' : 'Does your pain begin a couple of days before bleeding starts, or primarily on the first day?'),
      doctor_summary_en: 'Patient presents with significant menstrual cramping and pelvic pain. Clinical evaluation recommended to assess for primary dysmenorrhea vs. secondary causes (endometriosis, adenomyosis).',
    };
  }

  // 2. HAIR LOSS & SHEDDING
  if (isHairLoss && !isAcne && !msgLower.includes('period')) {
    const isHindi = lang === 'hi';
    const isKannada = lang === 'kn';
    return {
      detected_language: lang,
      reply_text: isHindi
        ? 'बालों का अत्यधिक झड़ना अक्सर शरीर में आयरन/फेरिटिन की कमी, थायरॉइड में बदलाव, तनाव (Telogen Effluvium) या हार्मोनल संवेदनशीलता से जुड़ा हो सकता है। यह कोई चिकित्सीय निदान नहीं है। एक डर्मेटोलॉजिस्ट या फिजिशियन से ब्लड टेस्ट कराना सबसे उचित रहेगा।'
        : (isKannada
          ? 'ಕೂದಲು ಅತಿಯಾಗಿ ಉದುರುವುದು ದೇಹದಲ್ಲಿ ಕಬ್ಬಿಣಾಂಶದ ಕೊರತೆ (Ferritin), ಥೈರಾಯ್ಡ್ ವ್ಯತ್ಯಾಸ ಅಥವಾ ಹಾರ್ಮೋನ್ ಅಸಮತೋಲನದಿಂದ ಇರಬಹುದು. ಇದು ಖಚಿತ ರೋಗನಿರ್ಣಯವಲ್ಲ. ಚರ್ಮ ಮತ್ತು ಕೇಶ ತಜ್ಞರನ್ನು (Dermatologist) ಭೇಟಿ ಮಾಡುವುದು ಉತ್ತಮ.'
          : 'Excessive hair shedding or scalp thinning can stem from low ferritin/iron reserves, thyroid variations, telogen effluvium, or androgen sensitivity. This is educational guidance, not a diagnosis. A dermatologist or primary physician can check foundational blood markers.'),
      symptoms: [{ name: 'scalp hair loss / shedding', detail: 'Increased hair fall or noticeable thinning' }],
      triage_level: 'self_care',
      suggested_specialist: 'dermatologist',
      commonly_discussed_tests: [
        'Serum Ferritin & Total Iron Binding Capacity (TIBC)',
        'Thyroid Stimulating Hormone (TSH, Free T4)',
        'Serum Vitamin D and Vitamin B12 levels',
        'Scalp trichoscopy examination',
      ],
      questions_for_doctor: [
        'Could my hair fall be related to iron stores, vitamin deficiencies, or thyroid function?',
        'Does the pattern of hair loss suggest hormonal or telogen shedding?',
      ],
      follow_up_question: isHindi
        ? 'क्या आपको पूरे सिर से बाल गिरते दिख रहे हैं, या मांग (center parting) चौड़ी हो रही है?'
        : (isKannada ? 'ಕೂದಲು ಎಲ್ಲಾ ಕಡೆಯಿಂದ ಉದುರುತ್ತಿದೆಯೇ ಅಥವಾ ನೆತ್ತಿಯ ಮಧ್ಯಭಾಗ ತೆಳುವಾಗುತ್ತಿದೆಯೇ?' : 'Is the hair shedding evenly all over, or are you noticing widening along your center part?'),
      doctor_summary_en: 'Patient reports progressive scalp hair shedding. Differential includes telogen effluvium, nutritional deficiency (iron/ferritin, vit D), thyroid dysfunction, or androgenic alopecia.',
    };
  }

  // 3. MOOD SWINGS / ANXIETY / PMDD
  if (isMoodPMDD) {
    const isHindi = lang === 'hi';
    const isKannada = lang === 'kn';
    return {
      detected_language: lang,
      reply_text: isHindi
        ? 'पीरियड्स से पहले चिड़चिड़ापन, चिंता या अत्यधिक उदासी महसूस होना पीएमडीडी (PMDD) या गंभीर पीएमएस (PMS) का संकेत हो सकता है, जो प्रोजेस्टेरोन और सेरोटोनिन के स्तर में संवेदनशीलता से जुड़ा होता है। यह कोई बीमारी की पुष्टि नहीं है। इसके बारे में डॉक्टर या मानसिक स्वास्थ्य विशेषज्ञ से चर्चा करना बहुत मददगार हो सकता है।'
        : (isKannada
          ? 'ಮುಟ್ಟಿನ ದಿನಗಳ ಮುಂಚೆ ವಿಪರೀತ ಕೋಪ, ದುಃಖ ಅಥವಾ ಆತಂಕ ಉಂಟಾಗುವುದು ಪಿಎಂಡಿಡಿ (PMDD) ಅಥವಾ ತೀವ್ರ ಪಿಎಂಎಸ್ ಲಕ್ಷಣವಾಗಿರಬಹುದು. ಇದು ಯಾವುದೇ ರೋಗನಿರ್ಣಯವಲ್ಲ. ವೈದ್ಯರನ್ನು ಭೇಟಿಯಾಗಿ ಸಮಾಲೋಚಿಸುವುದು ನಿಮ್ಮ ಮನಸ್ಸಿಗೆ ನೆಮ್ಮದಿ ನೀಡುತ್ತದೆ.'
          : 'Intense mood shifts, anxiety, or irritability in the days leading up to your period can be linked to Premenstrual Dysphoric Disorder (PMDD) or heightened sensitivity to normal luteal progesterone fluctuations. This is informative only. Discussing tracking with a gynecologist or mental health provider can bring great relief.'),
      symptoms: [{ name: 'premenstrual mood changes / anxiety', detail: 'Cyclic irritability, anxiety, or emotional distress' }],
      triage_level: 'routine_visit',
      suggested_specialist: 'gynecologist',
      commonly_discussed_tests: [
        'Daily Record of Severity of Problems (DRSP) prospective mood-cycle tracking chart',
        'Thyroid panel (TSH) to rule out underlying thyroid-mediated mood changes',
        'Serum Vitamin B6 and Vitamin D assessment',
      ],
      questions_for_doctor: [
        'Could my emotional symptoms before periods point toward PMDD rather than ordinary PMS?',
        'What evidence-based nutritional, psychological, or medical interventions can stabilize my mood during the luteal phase?',
      ],
      follow_up_question: isHindi
        ? 'क्या पीरियड्स शुरू होते ही यह उदासी और चिड़चिड़ापन अचानक कम हो जाता है?'
        : (isKannada ? 'ಮುಟ್ಟು ಪ್ರಾರಂಭವಾದ ತಕ್ಷಣ ನಿಮ್ಮ ಮನಸ್ಸಿನ ಆತಂಕ ಕಡಿಮೆಯಾಗುತ್ತದೆಯೇ?' : 'Do your mood symptoms noticeably lift within 1 to 2 days of your period bleeding starting?'),
      doctor_summary_en: 'Patient describes cyclic premenstrual mood changes, anxiety, and distress. Clinical intake warranted to evaluate for Premenstrual Dysphoric Disorder (PMDD) vs. severe PMS.',
    };
  }

  // 4. METABOLIC / WEIGHT / SUGAR CRAVINGS / DARK SKIN
  if (isMetabolic && !msgLower.includes('period')) {
    const isHindi = lang === 'hi';
    const isKannada = lang === 'kn';
    return {
      detected_language: lang,
      reply_text: isHindi
        ? 'अचानक वजन बढ़ना, मीठे की तेज तलब (sugar cravings), या गर्दन के पास की त्वचा का गहरा होना इंसुलिन रेजिस्टेंस (Insulin Resistance) या थायरॉइड में बदलाव से जुड़ा हो सकता है। कृपया याद रखें कि यह कोई निदान नहीं है। एंडोक्रिनोलॉजिस्ट या जनरल फिजिशियन से मिलकर जांच कराना सबसे सही रहेगा।'
        : (isKannada
          ? 'ತೂಕ ಹೆಚ್ಚಳ, ಸಿಹಿ ತಿನ್ನುವ ಅತಿಯಾದ ಬಯಕೆ ಅಥವಾ ಕುತ್ತಿಗೆಯ ಕಪ್ಪಾಗುವಿಕೆ ಇನ್ಸುಲಿನ್ ರೆಸಿಸ್ಟೆನ್ಸ್ ಅಥವಾ ಥೈರಾಯ್ಡ್ ವ್ಯತ್ಯಾಸದ ಸೂಚನೆಯಾಗಿರಬಹುದು. ಇದು ರೋಗನಿರ್ಣಯವಲ್ಲ. ಎಂಡೋಕ್ರೈನಾಲಜಿಸ್ಟ್ ಅಥವಾ ವೈದ್ಯರನ್ನು ಸಂಪರ್ಕಿಸುವುದು ಸೂಕ್ತ.'
          : 'Unexplained weight changes, pronounced sugar cravings, or darker velvety skin around body folds are often signs of how your body processes glucose—frequently related to insulin resistance or thyroid shifts. This is educational guidance, not a diagnosis. An endocrinologist can evaluate your metabolic profile.'),
      symptoms: [{ name: 'metabolic / weight fluctuations', detail: 'Noted weight difficulty, sweet cravings, or skin hyperpigmentation' }],
      triage_level: 'routine_visit',
      suggested_specialist: 'endocrinologist',
      commonly_discussed_tests: [
        'Fasting Blood Glucose and Fasting Insulin (HOMA-IR calculation)',
        'HbA1c test (3-month average blood glucose)',
        'Lipid Profile (Cholesterol, Triglycerides, HDL, LDL)',
        'Thyroid Stimulating Hormone (TSH, Free T4)',
      ],
      questions_for_doctor: [
        'Could my symptoms be pointing toward insulin resistance or metabolic slowdown?',
        'Would checking fasting insulin and glucose curves help determine how my body is handling carbohydrates?',
      ],
      follow_up_question: isHindi
        ? 'क्या आपको भोजन करने के कुछ देर बाद बहुत ज्यादा सुस्ती या कमजोरी महसूस होती है?'
        : (isKannada ? 'ಊಟದ ನಂತರ ನಿಮಗೆ ಅತಿಯಾದ ಆಲಸ್ಯ ಅಥವಾ ನಿದ್ದೆ ಬರುತ್ತದೆಯೇ?' : 'Do you experience intense energy crashes or brain fog shortly after carbohydrate-rich meals?'),
      doctor_summary_en: 'Patient reports metabolic symptoms including weight shifts, sugar cravings, and possible acanthosis nigricans. Workup for insulin resistance, metabolic syndrome, and thyroid function advised.',
    };
  }

  // 5. BLOATING / GUT HEALTH
  if (isBloatingGut) {
    const isHindi = lang === 'hi';
    return {
      detected_language: lang,
      reply_text: isHindi
        ? 'पेट का फूलना (bloating) और पाचन में परेशानी अक्सर मासिक चक्र के दौरान हार्मोन (विशेषकर प्रोजेस्टेरोन) के स्तर में उतार-चढ़ाव या आंतों की संवेदनशीलता (IBS) से जुड़ी हो सकती है। यह कोई निश्चित निदान नहीं है। डॉक्टर से मिलकर डाइट और लाइफस्टाइल पर चर्चा करना अच्छा रहेगा।'
        : 'Digestive bloating, sluggish transit, and abdominal fullness frequently fluctuate with hormonal phases (especially high progesterone in the luteal phase slowing smooth muscle motility) or underlying gut sensitivities like IBS. This is informational and not a diagnosis. Consulting a gastroenterologist or physician can clarify dietary vs. hormonal factors.',
      symptoms: [{ name: 'abdominal bloating and digestive variations', detail: 'Cyclic fullness or transit changes' }],
      triage_level: 'self_care',
      suggested_specialist: 'gastroenterologist',
      commonly_discussed_tests: [
        'Dietary and symptom diary correlated with menstrual cycle phases',
        'Abdominal pelvic ultrasound if pain accompanies bloating',
        'Celiac or fecal calprotectin screen if gastrointestinal distress persists',
      ],
      questions_for_doctor: [
        'Could my digestive bloating be cyclic and related to my menstrual hormone phases?',
        'Would gentle dietary changes (such as low-FODMAP guidance or magnesium) help my digestive transit?',
      ],
      follow_up_question: isHindi
        ? 'क्या यह पेट फूलने की समस्या पीरियड्स से 7-10 दिन पहले ज्यादा बढ़ जाती है?'
        : 'Does this bloating significantly peak in the week before your menstrual period?',
      doctor_summary_en: 'Patient describes cyclic abdominal bloating and gastrointestinal discomfort. Differential includes progesterone-mediated transit delay vs. functional bowel disorder.',
    };
  }

  // 6. DEFAULT / CLASSIC MENSTRUAL CYCLE & PCOS INQUIRIES
  const isHindi = lang === 'hi';
  const isKannada = lang === 'kn';
  return {
    detected_language: lang,
    reply_text: isHindi
      ? 'आपके द्वारा साझा किए गए लक्षण—जैसे पीरियड्स में अनियमितता या हार्मोनल बदलाव—अक्सर शरीर में ओव्यूलेशन की अनिश्चितता, तनाव, थायरॉइड या पीसीओएस (PCOS) से जुड़े हो सकते हैं। कृपया याद रखें कि यह केवल शैक्षणिक जानकारी है और कोई चिकित्सीय निदान नहीं है। गायनेकोलॉजिस्ट से मिलकर चेकअप कराना बहुत मददगार रहेगा।'
      : (isKannada
        ? 'ನೀವು ತಿಳಿಸಿದ ಲಕ್ಷಣಗಳು ಮುಟ್ಟು ತಡವಾಗುವುದು ಅಥವಾ ಹಾರ್ಮೋನ್ ಏರುಪೇರು ದೇಹದಲ್ಲಿ ಅಂಡೋತ್ಪತ್ತಿ ವ್ಯತ್ಯಾಸ ಅಥವಾ ಪಿಸಿಒಎಸ್ ಸಾಧ್ಯತೆಗಳಿಗೆ ಸಂಬಂಧಿಸಿರಬಹುದು. ಇದು ಯಾವುದೇ ವೈದ್ಯಕೀಯ ರೋಗನಿರ್ಣಯವಲ್ಲ. ಸ್ತ್ರೀರೋಗ ತಜ್ಞರನ್ನು (Gynecologist) ಭೇಟಿ ಮಾಡುವುದು ಒಳ್ಳೆಯದು.'
        : 'The patterns you described around your menstrual cycle are commonly associated with variations in ovulation, including conditions like PCOS (Polycystic Ovary Syndrome), thyroid health, or hypothalamic stress responses. Please note: this is informative guidance and never a clinical diagnosis. A routine checkup with a gynecologist is a very positive next step.'),
    symptoms: (() => {
      const detected = [];
      if (/(period|mahine|late|irregular|cycle|muṭṭu)/i.test(msgLower)) {
        detected.push({ name: 'irregular menstrual cycles', detail: 'Delayed or unpredictable cycles reported' });
      }
      if (/(hair|baal|jhad|koodalu|mudi)/i.test(msgLower)) {
        detected.push({ name: 'hair thinning / hair fall', detail: 'Excessive scalp hair shedding noted' });
      }
      if (/(acne|pimple|breakout|face|modave)/i.test(msgLower)) {
        detected.push({ name: 'facial acne / skin breakouts', detail: 'Persistent or hormonal breakouts' });
      }
      if (/(weight|wajan|moti|thooka)/i.test(msgLower)) {
        detected.push({ name: 'weight changes', detail: 'Unexplained weight changes noted' });
      }
      return detected.length > 0 ? detected : [{ name: 'reproductive health concerns', detail: 'Cycle or hormonal variations' }];
    })(),
    triage_level: 'routine_visit',
    suggested_specialist: 'gynecologist',
    commonly_discussed_tests: [
      'Pelvic ultrasound (evaluating ovarian follicular morphology and endometrial lining)',
      'Basal endocrine panel (LH, FSH, Total Testosterone, TSH, Fasting Insulin, Prolactin)',
    ],
    questions_for_doctor: [
      'Could my irregular cycles be pointing toward PCOS, anovulation, or thyroid involvement?',
      'Are pelvic imaging and hormonal blood tests recommended based on my cycle length?',
    ],
    follow_up_question: isHindi
      ? 'क्या आपके पीरियड्स हमेशा से ऐसे रहे हैं, या यह बदलाव हाल के महीनों में ज्यादा हुआ है?'
      : (isKannada ? 'ನಿಮ್ಮ ಋತುಚಕ್ರದ ನಡುವಿನ ಅಂತರ ಸಾಮಾನ್ಯವಾಗಿ ಎಷ್ಟು ದಿನಗಳಿರುತ್ತದೆ?' : 'Could you tell me approximately how many days typically elapse between your menstrual periods?'),
    doctor_summary_en: 'Patient reports menstrual cycle irregularities. Clinical evaluation recommended to assess for anovulatory cycles, polycystic ovarian morphology, thyroid function, or hyperandrogenism.',
  };
}

/**
 * Main LLM query interface.
 * Invokes Google Gemini API (gemini-3.8-flash) or Anthropic Claude API,
 * validates JSON schema, retries once on failure,
 * and falls back safely if parsing or network fails.
 */
export async function queryLLM({ message, conversationHistory = [], language = 'auto', redFlagResult = null }) {
  // 1. Primary: Google Gemini API (gemini-3.8-flash)
  if (GOOGLE_API_KEY && GOOGLE_API_KEY.trim().length > 0) {
    let attempts = 0;
    const maxAttempts = 2;

    while (attempts < maxAttempts) {
      attempts++;
      try {
        const parsed = await queryGemini({ message, conversationHistory, language, redFlagResult });

        if (parsed && validateLLMOutput(parsed)) {
          if (redFlagResult?.isRedFlag) {
            parsed.triage_level = 'urgent';
          }
          return parsed;
        }

        console.warn(`⚠️ Attempt ${attempts}: Gemini output failed JSON schema validation.`);
      } catch (err) {
        console.error(`❌ Gemini API error on attempt ${attempts}:`, err.message);
        if (attempts >= maxAttempts) break;
      }
    }
  }

  // 2. Secondary: Anthropic Claude API
  if (anthropicClient) {
    const formattedMessages = conversationHistory.map((m) => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: m.content,
    }));

    let userContent = message;
    if (language && language !== 'auto') {
      userContent = `[User selected language preference: ${language}]\n${message}`;
    }
    if (redFlagResult?.isRedFlag) {
      userContent += `\n[SAFETY ALERT: A rule-based red flag was detected: "${redFlagResult.matchedTerm}" (${redFlagResult.labelEn}). You MUST mark triage_level as "urgent" and provide supportive urgent care guidance.]`;
    }

    formattedMessages.push({
      role: 'user',
      content: userContent,
    });

    let attempts = 0;
    const maxAttempts = 2;

    while (attempts < maxAttempts) {
      attempts++;
      try {
        const response = await anthropicClient.messages.create({
          model: LLM_MODEL,
          max_tokens: 1200,
          temperature: 0.5,
          system: SYSTEM_PROMPT,
          messages: formattedMessages,
        });

        const replyContent = response.content?.[0]?.text;
        const parsed = extractAndParseJSON(replyContent);

        if (parsed && validateLLMOutput(parsed)) {
          if (redFlagResult?.isRedFlag) {
            parsed.triage_level = 'urgent';
          }
          return parsed;
        }

        console.warn(`⚠️ Attempt ${attempts}: Claude output failed JSON schema validation.`);
      } catch (err) {
        console.error(`❌ Claude API invocation error on attempt ${attempts}:`, err.message);
        if (attempts >= maxAttempts) break;
      }
    }
  }

  // 3. Fallback: Intelligent multilingual mock engine with deep category-specific branching
  console.log('ℹ️ Generating customized response via category-specific engine.');
  return generateMockResponse(message, language, redFlagResult);
}

export default {
  queryLLM,
  validateLLMOutput,
  extractAndParseJSON,
  getSafeFallbackReply,
  generateMockResponse,
};
