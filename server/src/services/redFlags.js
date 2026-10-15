/**
 * SakhiGuide Red Flag Safety Detector
 * 
 * Non-negotiable rule-based clinical safety layer executed BEFORE the LLM.
 * Scans for critical red-flag emergency symptoms across English, transliterated,
 * and native-script Indic languages (Hindi, Kannada, Tamil, Telugu, Marathi, Bengali).
 * 
 * If ANY red flag matches, triage_level MUST be forced to "urgent".
 */

export const RED_FLAG_CATEGORIES = {
  HEAVY_BLEEDING: 'HEAVY_BLEEDING',
  SEVERE_PELVIC_PAIN: 'SEVERE_PELVIC_PAIN',
  FAINTING: 'FAINTING',
  PREGNANCY_BLEEDING: 'PREGNANCY_BLEEDING',
  PROLONGED_AMENORRHEA_PREGNANCY_RISK: 'PROLONGED_AMENORRHEA_PREGNANCY_RISK',
  CHEST_PAIN: 'CHEST_PAIN',
  SHORTNESS_OF_BREATH: 'SHORTNESS_OF_BREATH',
  SELF_HARM: 'SELF_HARM',
};

const PATTERNS = [
  // 1. Heavy bleeding / soaking pad hourly
  {
    category: RED_FLAG_CATEGORIES.HEAVY_BLEEDING,
    regex: /(soak(ing)?\s+(a\s+)?pad\s+(every|per|in\s+an?)\s+hour|pad\s+(soak(ing)?|full)\s+(every|each|in\s+an?)\s+hour|heavy\s+bleeding\s+with\s+(large|huge)?\s*clots|bleeding\s+through\s+clothes|flooding\s+(and|with)\s+clots|हर\s*घंटे\s*(में\s*)?पैड|पैड\s*(पूरी\s*तरह\s*)?भीग|बहुत\s*ज्यादा\s*खून|भारी\s*रक्तस्राव|खून\s*के\s*बड़े\s*थक्के|har\s+ghant[ea]\s+(me\s+)?pad|pad\s+bheeg\s+raha|bohot\s+zyada\s+khoon|bahut\s+zyada\s+bleeding|khoon\s+ke\s+(bade\s+)?thakke|ಪ್ರತಿ\s*ಗಂಟೆಗೆ\s*ಪ್ಯಾಡ್|ಅತಿಯಾದ\s*ರಕ್ತಸ್ರಾವ|ಪ್ಯಾಡ್\s*ನೆನೆಯುತ್ತಿದೆ|prati\s+ghante\s+pad|gantege\s+ondu\s+pad|athiyada\s+rakthasrava|ஒவ்வொரு\s*மணி\s*நேரமும்\s*பேட்|அதிக\s*இரத்தப்போக்கு|rathapokku\s+athigam|గంటకో\s*ప్యాడ్|అధిక\s*రక్తస్రావం|gantako\s+pad|ekkuva\s+rakthasravam|दर\s*तासाला\s*पॅड|खूप\s*जास्त\s*रक्तस्त्राव|প্রতি\s*ঘন্টায়\s*প্যাড|অতিরিক্ত\s*রক্তপাত)/i,
    labelEn: 'Very heavy bleeding (soaking through pads hourly or passing large clots)',
    urgencyReason: 'Excessive acute blood loss requires prompt emergency medical attention to prevent severe anemia or hemodynamic compromise.',
  },

  // 2. Severe sudden pelvic pain
  {
    category: RED_FLAG_CATEGORIES.SEVERE_PELVIC_PAIN,
    regex: /(severe\s+(sudden\s+)?pelvic\s+pain|sudden\s+(excruciating|unbearable|severe)\s+(pelvic|stomach|abdominal|belly)\s+pain|unbearable\s+(stomach|pelvic|lower\s+belly)\s+pain|doubled\s+over\s+in\s+pain|excruciating\s+lower\s+(belly|pelvic|abdominal)\s+pain|अचानक\s*तेज\s*(पेट|पेड़ू)\s*दर्द|पेड़ू\s*में\s*(असहनीय|तेज)\s*दर्द|असहनीय\s*(पेट\s*)?दर्द|sudden\s+pelvic\s+pain|tez\s+pet\s+dard|asahniye\s+pet\s+dard|pet\s+ke\s+nichle\s+hisse\s+me\s+tez\s+dard|ತೀವ್ರವಾದ\s*ಹೊಟ್ಟೆ\s*ನೋವು|ಹಠಾತ್\s*(ಸೊಂಟ|ಹೊಟ್ಟೆ)\s*ನೋವು|teevravada\s+hotte\s+novu|sudden\s+hotte\s+novu|கடுமையான\s*திடீர்\s*இடுப்பு\s*வலி|அடிவயிற்றில்\s*கடுமையான\s*வலி|kadumaiyana\s+iduppu\s+vali|తీవ్రమైన\s*కడుపు\s*నొప్పి|అకస్మాత్తుగా\s*కడుపు\s*నొప్పి|teevramaina\s+kadupu\s+noppi|अचानक\s*तीव्र\s*ओटीपोटात\s*दुखणे|তীব্র\s*তলপেটে\s*ব্যথা|হঠাৎ\s*মারাত্মক\s*পেটে\s*ব্যথা)/i,
    labelEn: 'Severe sudden pelvic / lower abdominal pain',
    urgencyReason: 'Sudden, severe pelvic pain can signal acute conditions such as ovarian torsion, ruptured ovarian cyst, or ectopic pregnancy that demand immediate emergency evaluation.',
  },

  // 3. Fainting / Syncope / Loss of consciousness
  {
    category: RED_FLAG_CATEGORIES.FAINTING,
    regex: /(faint(ed|ing)?|blackout|blacked\s+out|passed\s+out|pass\s+out|loss\s+of\s+consciousness|collaps(ed|ing)|बेहोश|बेहोशी|चक्कर\s*आकर\s*गिर|behosh|behoshi|chakkar\s+aakar\s+gir|chakkar\s+khakar\s+gir|ಪ್ರಜ್ಞೆ\s*ತಪ್ಪ|ಮೂರ್ಛೆ|pragne\s+thappi|moorche|moorcha|மயக்கம்|மயங்கி\s*விழு|mayakkam|mayangi\s+vizhun|స్పృహ\s*తప్ప|కళ్ళు\s*తిరిగి\s*పడి|spruha\s+thappadam|kallu\s+thirigi\s+padi|भोवळ\s*येणे|অজ্ঞান\s*হয়ে|বেহুঁশ)/i,
    labelEn: 'Fainting, syncope, or loss of consciousness',
    urgencyReason: 'Loss of consciousness combined with gynecological symptoms may indicate sudden blood loss, hypovolemia, or severe autonomic dysfunction.',
  },

  // 4. Bleeding during pregnancy or suspected pregnancy
  {
    category: RED_FLAG_CATEGORIES.PREGNANCY_BLEEDING,
    regex: /(pregnant.*(bleed|spotting|blood)|bleed.*pregnant|positive\s+pregnancy\s+test.*(bleed|blood)|spotting\s+while\s+pregnant|प्रेग्नेंट.*(खून|रक्त|ब्लीडिंग)|गर्भावस्था\s*में\s*(खून|रक्त)|pregnant.*(khoon|bleeding)|garbh.*(khoon|bleeding)|ಗರ್ಭಿಣಿ.*ರಕ್ತಸ್ರಾವ|pregnant.*(rakthasrava|bleeding)|கர்ப்ப.*(ரத்தம்|இரத்தப்போக்கு)|గర్భధారణ.*రక్తస్రావం|pregnant.*(rakthasravam|bleeding)|गरोदर.*रक्तस्त्राव|গর্ভবতী.*রক্তপাত)/i,
    labelEn: 'Bleeding during pregnancy or suspected pregnancy',
    urgencyReason: 'Any bleeding during known or suspected pregnancy requires immediate in-person obstetric evaluation to rule out ectopic pregnancy, miscarriage, or complications.',
  },

  // 5. Prolonged amenorrhea (3+ months) with potential pregnancy
  {
    category: RED_FLAG_CATEGORIES.PROLONGED_AMENORRHEA_PREGNANCY_RISK,
    regex: /(no\s+period\s+(for\s+)?(3|three|\d+)\s+months.*(pregnant|pregnancy)|missed\s+period\s+(for\s+)?(3|three|\d+)\s+months.*pregnant|periods?\s+stopped\s+(3|three|\d+)\s+months.*pregnant|3\s*महीने\s*से\s*पीरियड\s*नहीं.*प्रेग्नेंट|3\s*mahine\s*se\s*period\s*nahi.*pregnant|3\s*ತಿಂಗಳು\s*ಮುಟ್ಟು\s*ಆಗಿಲ್ಲ.*ಗರ್ಭಿಣಿ|3\s*tingalu\s*period\s*aagilla.*pregnant)/i,
    labelEn: 'Absence of periods for 3+ months with possibility of pregnancy',
    urgencyReason: 'Extended absence of menstruation in an individual with possible pregnancy requires timely clinical assessment and testing.',
  },

  // 6. Chest pain
  {
    category: RED_FLAG_CATEGORIES.CHEST_PAIN,
    regex: /(chest\s+pain|pain\s+in\s+chest|chest\s+pressure|tightness\s+in\s+chest|सीने\s*में\s*दर्द|छाती\s*में\s*दर्द|chhati\s+me\s+dard|seene\s+me\s+dard|ಎದೆ\s*ನೋವು|ede\s+novu|நெஞ்சு\s*வலி|nenju\s+vali|ఛాతీ\s*నొప్పి|chati\s+noppi|छातीत\s*दुखणे|বুকে\s*ব্যথা)/i,
    labelEn: 'Chest pain or chest pressure',
    urgencyReason: 'Chest pain may represent a cardiopulmonary emergency that takes precedence over outpatient endocrine evaluation.',
  },

  // 7. Shortness of breath
  {
    category: RED_FLAG_CATEGORIES.SHORTNESS_OF_BREATH,
    regex: /(shortness\s+of\s+breath|cannot\s+breathe|can't\s+breathe|trouble\s+breathing|difficulty\s+breathing|gasping\s+for\s+(air|breath)|सांस\s*लेने\s*में\s*(तकलीफ|दिक्कत)|सांस\s*फूल|saans\s+lene\s+me\s+takleef|saans\s+phool\s+rahi|ಉಸಿರಾಟದ\s*ತೊಂದರೆ|ಉಸಿರು\s*ಕಟ್ಟು|usiratada\s+thondare|usiru\s+katt|சுவாசிப்பதில்\s*சிரமம்|swasam\s+vida\s+mudiyala|శ్వాస\s*తీసుకోవడంలో\s*ఇబ్బంది|swasa\s+theesukovadam\s+kashtam|श्वास\s*घेण्यास\s*त्रास|শ্বাসকষ্ট|নিশ্বাস\s*নিতে\s*কষ্ট)/i,
    labelEn: 'Shortness of breath or acute breathing distress',
    urgencyReason: 'Acute breathing difficulty is a critical respiratory or cardiovascular sign necessitating urgent in-person medical care.',
  },

  // 8. Thoughts of self-harm or severe emotional distress
  {
    category: RED_FLAG_CATEGORIES.SELF_HARM,
    regex: /(suicid(e|al)|kill\s+myself|want\s+to\s+die|end\s+my\s+life|harming\s+myself|hurt\s+myself|self-harm|take\s+my\s+life|dont\s+want\s+to\s+live|don't\s+want\s+to\s+live|आत्महत्या|मरना\s*चाहती\s*हूं|जान\s*देना\s*चाहती\s*हूं|खुद\s*को\s*नुकसान|खुद\s*को\s*खत्म|khudkushi|marna\s+chahti\s+hu|jaan\s+dena\s+chahti\s+hu|khud\s+ko\s+khatam|suicide|ಆತ್ಮಹತ್ಯೆ|ಸಾಯಬೇಕು\s*ಅನಿಸುತ್ತಿದೆ|saayabeku|jeevana\s+mugisabeku|aatmahathye|தற்கொலை|சாக\s*வேண்டும்|uyirai\s+maaikka|tharkolai|ఆత్మహత్య|చనిపోవాలని\s*ఉంది|pranam\s+theesukovalani|aathmahatya|आत्महत्या|जीव\s*द्यावा\s*वाटतो|aatmahatya|আত্মহত্যা|মরতে\s*ইচ্ছা\s*করছে)/i,
    labelEn: 'Thoughts of self-harm or acute emotional crisis',
    urgencyReason: 'Emotional distress and thoughts of self-harm require immediate compassionate support and professional mental health intervention.',
  },
];

/**
 * Checks a user message against red-flag rules.
 * Runs BEFORE the LLM call.
 * 
 * @param {string} text - User message input
 * @returns {object} Safety assessment result
 */
export function checkRedFlags(text) {
  if (!text || typeof text !== 'string') {
    return {
      isRedFlag: false,
      category: null,
      matchedTerm: null,
      isSelfHarm: false,
      urgencyReason: null,
      supportMessage: null,
    };
  }

  const cleanText = text.trim();

  for (const item of PATTERNS) {
    const match = cleanText.match(item.regex);
    if (match) {
      const isSelfHarm = item.category === RED_FLAG_CATEGORIES.SELF_HARM;
      
      let supportMessage = null;
      if (isSelfHarm) {
        supportMessage = 
          'You are deeply valued, and please know that you do not have to carry this distress alone. ' +
          'Help and understanding are available right now. Please reach out to someone you trust or call the ' +
          'Tele-MANAS national 24/7 mental health helpline at 14416 (toll-free) or 1800-891-4416, ' +
          'or the KIRAN helpline at 1800-599-0019. These services are free, confidential, and available in regional languages.';
      }

      return {
        isRedFlag: true,
        category: item.category,
        matchedTerm: match[0],
        labelEn: item.labelEn,
        isSelfHarm,
        urgencyReason: item.urgencyReason,
        supportMessage,
      };
    }
  }

  return {
    isRedFlag: false,
    category: null,
    matchedTerm: null,
    isSelfHarm: false,
    urgencyReason: null,
    supportMessage: null,
  };
}

export default checkRedFlags;
