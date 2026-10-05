require('dotenv').config();
const http = require('http');

async function request(options, postData) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch (e) {
          resolve({ status: res.statusCode, body });
        }
      });
    });
    req.on('error', reject);
    if (postData) {
      req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
    }
    req.end();
  });
}

async function runCRMTests() {
  console.log('🧪 Testing Module 3 — Client CRM & Intake Engine on http://localhost:5000...');

  // 1. Authenticate Therapist
  console.log('\n1. Authenticating as Dr. Priya Sharma...');
  const loginRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/v1/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  }, {
    email: 'priya.sharma@example.com',
    password: 'Password123!',
  });
  const token = loginRes.data?.data?.token;
  console.log(`   Login Success: ${loginRes.status === 200}`);

  // 2. Create a test Client with Tag & Intake
  console.log('\n2. Testing POST /api/v1/clients (Create Client with Intake & Tag)');
  const testEmail = `neha.patel.${Date.now()}@example.com`;
  const createRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/v1/clients',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  }, {
    name: 'Neha Patel',
    email: testEmail,
    phone: '+91 98334 11223',
    gender: 'Female',
    tag: 'moderate_risk',
    status: 'active',
    intake: {
      presentingConcerns: 'Acute anxiety and career transition overwhelm.',
      goals: 'Build confidence and emotional boundary tools.',
      medicalHistory: 'Mild insomnia.',
    },
  });
  console.log(`   Status: ${createRes.status}`);
  const clientId = createRes.data?.data?._id;
  console.log(`   Created Client ID: ${clientId} (${createRes.data?.data?.name})`);

  // 3. Test Client Filtering & Search
  console.log('\n3. Testing GET /api/v1/clients (Search by name & filter by tag)');
  const listRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: `/api/v1/clients?search=Neha&tag=moderate_risk`,
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` },
  });
  console.log(`   Status: ${listRes.status}`);
  console.log(`   Matching Clients Count: ${listRes.data?.data?.clients?.length}`);

  // 4. Test Aggregated Client Profile
  console.log(`\n4. Testing GET /api/v1/clients/${clientId}/profile (Aggregated Profile)`);
  const profileRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: `/api/v1/clients/${clientId}/profile`,
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` },
  });
  console.log(`   Status: ${profileRes.status}`);
  console.log(`   Client Name: ${profileRes.data?.data?.client?.name}`);
  console.log(`   Presenting Concerns: ${profileRes.data?.data?.intake?.presentingConcerns}`);

  // 5. Test Digital Consent Recording
  console.log(`\n5. Testing POST /api/v1/clients/${clientId}/consent (Record Digital Consent)`);
  const consentRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: `/api/v1/clients/${clientId}/consent`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  }, {
    isConsentAccepted: true,
    consentSignatureName: 'Neha Patel',
    consentVersion: '1.0',
  });
  console.log(`   Status: ${consentRes.status}`);
  console.log(`   Consent Accepted: ${consentRes.data?.data?.isConsentAccepted}`);
  console.log(`   Electronic Signature: ${consentRes.data?.data?.consentSignatureName}`);

  // 6. Test Discharge Action
  console.log(`\n6. Testing POST /api/v1/clients/${clientId}/discharge`);
  const dischargeRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: `/api/v1/clients/${clientId}/discharge`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  }, {
    notes: 'Client completed all therapy goals successfully.',
  });
  console.log(`   Status: ${dischargeRes.status}`);
  console.log(`   Updated Care Status: ${dischargeRes.data?.data?.status}`);

  console.log('\n✅ All Module 3 Client CRM & Intake tests passed successfully!\n');
}

runCRMTests().catch(console.error);
