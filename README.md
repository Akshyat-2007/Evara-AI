# Evara AI 🌸
### Regional-Language PCOS Symptom Understanding Companion

Evara AI is an empathetic, privacy-first full-stack web application built to help women articulate and understand symptoms that may correlate with Polycystic Ovary Syndrome (PCOS) and related endocrine/reproductive concerns.

It specifically supports regional languages (**Hindi, Kannada, Tamil, Telugu, Marathi, Bengali, and English**) including colloquial and mixed-language phrasing (e.g., Hinglish, Kanglish).

> **Safety Notice:** Evara AI provides informational guidance only. It **never diagnoses** and **never prescribes medications or dosages**. A persistent medical disclaimer is maintained at all times, and rule-based red flag detection prioritizes emergency intervention when critical symptoms are detected.

---

## 🌟 Key Features

1. **Multilingual Symptom Translation & Understanding**
   - Natural language input in 7 Indian languages (Hindi, Kannada, Tamil, Telugu, Marathi, Bengali, English) and mixed colloquial forms (e.g., Hinglish, Kanglish).
   - Warm, reassuring explanations tailored to a ~6th-grade reading level.
   
2. **Rule-Based Red Flag Detection (Pre-LLM Safety Guardrail)**
   - Hardcoded, non-negotiable regex safety layer checking for emergency indicators (e.g., soaking a pad every hour, severe sudden pelvic pain, fainting, bleeding during pregnancy, chest pain, shortness of breath, self-harm).
   - Bypasses standard triage and immediately forces `urgent` care.
   - For severe emotional distress or self-harm keywords, provides compassionate empathy and immediate connection to national helplines: **Tele-MANAS (14416 / 1800-891-4416)** and **KIRAN (1800-599-0019)**.

3. **Clinician & Specialist Guidance**
   - Color-coded triage classification (`self_care` in green, `routine_visit` in amber, `urgent` in red).
   - Specialist recommendations (Gynecologist, Endocrinologist, Dermatologist).
   - "Questions to Ask Your Doctor" and commonly discussed clinical investigations (e.g., pelvic ultrasound, hormone panel: LH, FSH, Total Testosterone, TSH, Fasting Insulin).

4. **Speech Input & Output (Web Speech API)**
   - Regional speech recognition (`SpeechRecognition` / `webkitSpeechRecognition`) with BCP-47 locale support (`hi-IN`, `kn-IN`, `ta-IN`, `te-IN`, `mr-IN`, `bn-IN`, `en-IN`).
   - Native audio playback (`speechSynthesis`) on each assistant bubble in the user's selected language.
   - If browser does not support Speech Recognition, gracefully hides the mic and displays an informative note.

5. **Printable Doctor Summary**
   - Dual-language report: concise clinical English for medical practitioners alongside the patient's verbatim regional-language descriptions and extracted timeline.
   - Built-in `window.print()` styles formatted for clean PDF export.

6. **Privacy-by-Design & Guest First Philosophy**
   - **Full Guest Mode**: Complete access to AI symptom guidance, triage evaluation, voice interaction, and printable doctor summaries without creating an account.
   - **Optional User Accounts**: Users can register with an email and password to securely sync and revisit their past symptom timelines and doctor summaries across devices.
   - **Zero PII Collection**: No phone numbers, real names, or home addresses collected.
   - **Data Sovereignty (Account Purge)**: Users can permanently delete their account and wipe all associated messages and symptom reports at any time.

---

## 🔐 User Accounts & Privacy Design

| Feature | Design Implementation |
| :--- | :--- |
| **Password Security** | Passwords hashed using `bcrypt` (10 salt rounds); plain text is never logged or stored. |
| **Session Security** | Signed JWT stored exclusively in secure, `httpOnly`, `sameSite: 'lax'` Cookies; never exposed to `localStorage` (XSS-safe). |
| **Token Minimalism** | JWT payload contains *only* `{ userId }`; zero health or symptom data is embedded in the token. |
| **Brute-Force Guard** | Strict rate limiting on `/api/auth/register` and `/api/auth/login` (max 10 requests / 15 minutes / IP). |
| **Enumeration Defense** | Constant-time password check with uniform `"Invalid email or password"` feedback. |
| **Guest Parity** | `authOptional` middleware allows anonymous consultation while auto-binding sessions for authenticated users. |

---

## 🏗️ Project Architecture & Tech Stack

- **Monorepo Root**: Orchestrated with `concurrently` for seamless multi-tier development.
- **Backend (`/server`)**: Node.js, Express, `mysql2` connection pool, `express-rate-limit`, Anthropic Claude 3.5 Sonnet SDK (`@anthropic-ai/sdk`) with an intelligent offline mock mode fallback.
- **Frontend (`/client`)**: React (plain JavaScript, Vite), Vanilla CSS design system, Lucide icons, Google Fonts (Inter + Noto Sans Indic scripts).
- **Database (MySQL)**: Anonymous session tracking, chat history, structured symptom summaries, and red-flag audit logs.
- **Testing**: Vitest test suites for red-flag safety patterns and LLM schema validation.

```
pravruti/
├── package.json               # Root scripts (dev, db:init, test, install:all)
├── .env.example               # Root template for environment configuration
├── .gitignore                 # Standard git ignores (node_modules, .env, dist, logs)
├── README.md                  # Project documentation
├── docs/
│   └── demo-script.md         # 3 Hackathon demo scenarios (English, Hindi, Kannada)
├── server/
│   ├── .env                   # Server environment configuration
│   ├── package.json           # Server dependencies (Express, mysql2, Anthropic, Vitest)
│   ├── sql/
│   │   └── schema.sql         # Database schema (sessions, messages, reports, redflags)
│   ├── scripts/
│   │   ├── initDb.js          # DB creation & migration script (npm run db:init)
│   │   └── testEndpoints.js   # Integration test script for API endpoints
│   ├── src/
│   │   ├── index.js           # Express app entry point
│   │   ├── db/
│   │   │   └── connection.js  # mysql2 connection pool
│   │   ├── prompts/
│   │   │   └── system.js      # Anthropic Claude system prompt & JSON contract
│   │   ├── services/
│   │   │   ├── redFlags.js    # Rule-based multilingual red flag detector
│   │   │   └── llm.js         # Unified LLM provider + intelligent mock engine + JSON validator
│   │   ├── routes/
│   │   │   ├── sessionRoutes.js # POST /api/sessions
│   │   │   ├── chatRoutes.js    # POST /api/chat
│   │   │   └── reportRoutes.js  # GET /api/report/:sessionId
│   │   └── middleware/
│   │       ├── rateLimiter.js   # express-rate-limit
│   │       └── errorHandler.js  # Central error handler
│   └── test/
│       ├── redFlags.test.js     # Vitest tests for red-flag triggers & helplines
│       └── llmValidation.test.js# Vitest tests for JSON validation & fallbacks
└── client/
    ├── index.html             # HTML entry point with Noto Sans Indic Google Fonts
    ├── package.json           # Vite + React + Lucide dependencies
    ├── vite.config.js         # Vite configuration
    └── src/
        ├── main.jsx           # React root
        ├── App.jsx            # Main app shell, state, view management
        ├── index.css          # Design system & @media print styles
        ├── i18n/
        │   └── translations.js# Multilingual dictionary (7 languages + BCP-47 locales)
        ├── hooks/
        │   └── useSpeechRecognition.js # Web Speech recognition hook
        └── components/
            ├── DisclaimerBanner.jsx  # Persistent non-diagnostic disclaimer
            ├── LanguageSelector.jsx  # Regional language dropdown
            ├── ChatWindow.jsx        # Message bubbles, starter prompts, input form
            ├── TriageCard.jsx        # Color-coded triage level & specialist card
            ├── VoiceInput.jsx        # Accessible mic button with pulse animation
            ├── SpeakButton.jsx       # speechSynthesis playback on assistant bubbles
            └── DoctorSummary.jsx     # Dual-language printable doctor report
```

---

## 📡 API Overview

| Method | Endpoint | Protection | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/health` | Public | Health check returning DB status and LLM mode |
| `POST` | `/api/auth/register` | Rate-limited (10/15m) | Register with email & password, sets httpOnly cookie |
| `POST` | `/api/auth/login` | Rate-limited (10/15m) | Authenticate user, constant-time verification |
| `POST` | `/api/auth/logout` | Public | Clear httpOnly session cookie |
| `GET` | `/api/auth/me` | `authRequired` | Get authenticated user info (no password hash) |
| `PATCH` | `/api/auth/profile` | `authRequired` | Update display name or preferred language |
| `DELETE` | `/api/auth/account` | `authRequired` | Permanently wipe account and all associated health data |
| `GET` | `/api/history` | `authRequired` | Return user's saved consultations & symptom summaries |
| `POST` | `/api/sessions` | `authOptional` | Create session (associates user_id if authenticated) |
| `POST` | `/api/chat` | `authOptional` | Symptom input (rule-based red flags + LLM response) |
| `GET` | `/api/report/:sessionId` | Public | Dual-language printable doctor intake summary |

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- Node.js (v18+)
- MySQL Server (running on localhost:3306)

### 2. Installation
Install all root, server, and client dependencies:
```bash
npm run install:all
```

### 3. Environment Variables
Copy `.env.example` to `server/.env`:
```bash
cp .env.example server/.env
```
Ensure your MySQL credentials are set in `server/.env`.
*(If `ANTHROPIC_API_KEY` is omitted, the application will automatically run in intelligent **Mock Mode** using realistic regional responses).*

```env
PORT=5000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=sakhiguide
ANTHROPIC_API_KEY=
LLM_MODEL=claude-3-5-sonnet-20241022
CLIENT_ORIGIN=http://localhost:5173
```

### 4. Database Setup
Initialize the database tables:
```bash
npm run db:init
```

### 5. Running Automated Unit Tests
Run Vitest to verify all 33 safety checks and validation tests:
```bash
npm test
```

### 6. Running the Application
Launch both the backend API (`localhost:5000`) and the Vite client (`localhost:5173`) concurrently:
```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🧪 Demo Scenarios

See [docs/demo-script.md](file:///c:/Users/akshy/OneDrive/Desktop/pravruti/docs/demo-script.md) for full walkthroughs:
1. **Hindi / Hinglish**: *"periods late aate hain, baal jhad rahe hain, face pe pimples"* (PCOS triad)
2. **Kannada**: *"ತಿಂಗಳು ಸರಿಯಾಗಿ ಬರ್ತಿಲ್ಲ ಮುಖದ ಮೇಲೆ ಮೊಡವೆ ಮತ್ತು ತೂಕ ಹೆಚ್ಚುತ್ತಿದೆ"* (Cycle delay & weight gain)
3. **Emergency Red Flag**: *"I am soaking a pad every hour and feeling very dizzy"* (Urgent care priority)
4. **Doctor Summary PDF**: One-click print-ready clinical report export.
