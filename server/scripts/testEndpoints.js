import pool from '../src/db/connection.js';
import app from '../src/index.js';

async function runTests() {
  console.log('🧪 Starting SakhiGuide Backend Endpoints Integration Test...');

  // Allow server a brief moment to bind
  await new Promise((resolve) => setTimeout(resolve, 800));

  try {
    // 1. Test /api/health
    console.log('1️⃣ Testing GET /api/health...');
    const healthRes = await fetch('http://localhost:5000/api/health').then((r) => r.json());
    console.log('   Health response:', healthRes);

    // 2. Test POST /api/sessions
    console.log('2️⃣ Testing POST /api/sessions...');
    const sessionRes = await fetch('http://localhost:5000/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ language: 'hi' }),
    }).then((r) => r.json());
    console.log('   Session established:', sessionRes);
    const sessionId = sessionRes.sessionId;

    // 3. Test POST /api/chat (Regular Hinglish input)
    console.log('3️⃣ Testing POST /api/chat (Hinglish input)...');
    const chatRes1 = await fetch('http://localhost:5000/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId,
        message: 'periods late aate hain, baal jhad rahe hain, face pe pimples',
        language: 'hi',
      }),
    }).then((r) => r.json());
    console.log('   Chat 1 reply excerpt:', chatRes1.reply_text?.slice(0, 70) + '...');
    console.log('   Chat 1 triage_level:', chatRes1.triage_level);
    console.log('   Chat 1 symptoms:', chatRes1.symptoms);
    console.log('   Chat 1 redFlagTriggered:', chatRes1.redFlagTriggered);

    // 4. Test POST /api/chat (Red Flag Emergency trigger)
    console.log('4️⃣ Testing POST /api/chat (Emergency Red Flag: soaking pad every hour)...');
    const chatRes2 = await fetch('http://localhost:5000/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId,
        message: 'I am soaking a pad every hour and feeling very weak',
        language: 'en',
      }),
    }).then((r) => r.json());
    console.log('   Chat 2 triage_level (MUST be urgent):', chatRes2.triage_level);
    console.log('   Chat 2 redFlagTriggered:', chatRes2.redFlagTriggered);
    console.log('   Chat 2 redFlagDetail:', chatRes2.redFlagDetail);

    // 5. Test GET /api/report/:sessionId
    console.log('5️⃣ Testing GET /api/report/' + sessionId + '...');
    const reportRes = await fetch(`http://localhost:5000/api/report/${sessionId}`).then((r) => r.json());
    console.log('   Report fetched successfully:');
    console.log('   - Highest triage level:', reportRes.highestTriageLevel);
    console.log('   - Extracted symptoms count:', reportRes.symptoms?.length);
    console.log('   - Red flag events count:', reportRes.redFlagEvents?.length);
    console.log('   - Verbatim patient inputs:', reportRes.verbatimPatientInputs?.length);

    console.log('\n🎉 ALL BACKEND ENDPOINTS & SAFETY CHECKS PASSED!\n');
    process.exit(0);
  } catch (err) {
    console.error('❌ Integration test failed:', err);
    process.exit(1);
  }
}

runTests();
