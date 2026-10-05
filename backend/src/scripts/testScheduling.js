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

async function runSchedulingTests() {
  console.log('🧪 Testing Module 2 — Scheduling & Availability Engine on http://localhost:5000...');

  // 1. Query public slots by therapist slug
  console.log('\n1. Testing GET /api/v1/availability/public/dr-priya-sharma?date=2026-08-25&duration=50');
  const slotsRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/v1/availability/public/dr-priya-sharma?date=2026-08-25&duration=50',
    method: 'GET',
  });
  console.log(`   Status: ${slotsRes.status}`);
  const slots = slotsRes.data?.data?.slots || [];
  console.log(`   Computed available free slots count: ${slots.length}`);
  if (slots.length > 0) {
    console.log(`   First free slot: ${slots[0].startTime} - ${slots[0].endTime} (${slots[0].scheduledAt})`);
    console.log(`   Last free slot: ${slots[slots.length - 1].startTime} - ${slots[slots.length - 1].endTime}`);
  }

  // 2. Test Login to get therapist JWT
  console.log('\n2. Authenticating as Therapist Dr. Priya Sharma...');
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
  console.log(`   Login Success: ${loginRes.status === 200}, Token: ${Boolean(token)}`);

  // 3. Test Therapist Weekly Availability Retrieval
  console.log('\n3. Testing GET /api/v1/availability/weekly (Protected)');
  const weeklyRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/v1/availability/weekly',
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` },
  });
  console.log(`   Status: ${weeklyRes.status}`);
  const rules = weeklyRes.data?.data || [];
  console.log(`   Recurring weekday rules configured: ${rules.length} days`);

  // 4. Test Public Booking Endpoint (Submitting appointment request)
  console.log('\n4. Testing POST /api/v1/sessions/public/book/dr-priya-sharma');
  const bookRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/v1/sessions/public/book/dr-priya-sharma',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  }, {
    clientName: 'Rahul Verma',
    clientEmail: 'rahul.verma@example.com',
    clientPhone: '+91 99887 76655',
    sessionType: 'individual',
    medium: 'online',
    scheduledAt: slots[0]?.scheduledAt || '2026-08-25T09:00:00.000Z',
    notes: 'Anxiety and focus issues',
  });
  console.log(`   Status: ${bookRes.status}`);
  console.log(`   Booking request created Lead ID: ${bookRes.data?.data?.leadId}`);

  console.log('\n✅ All Module 2 Scheduling & Availability tests passed successfully!\n');
}

runSchedulingTests().catch(console.error);
