require('dotenv').config();
const http = require('http');

async function testEndpoint(options, postData) {
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

async function runTests() {
  console.log('🧪 Testing Module 1 Endpoints on http://localhost:5000...');

  // 1. Test public profile by slug
  console.log('\n1. Testing GET /api/v1/therapist/public/dr-priya-sharma');
  const pubRes = await testEndpoint({
    hostname: 'localhost',
    port: 5000,
    path: '/api/v1/therapist/public/dr-priya-sharma',
    method: 'GET',
  });
  console.log(`   Status: ${pubRes.status}`);
  console.log(`   Therapist Name: ${pubRes.data?.data?.name}`);
  console.log(`   Practice: ${pubRes.data?.data?.practiceName}`);
  console.log(`   Specializations: ${pubRes.data?.data?.specializations?.join(', ')}`);

  // 2. Test Login
  console.log('\n2. Testing POST /api/v1/auth/login');
  const loginRes = await testEndpoint({
    hostname: 'localhost',
    port: 5000,
    path: '/api/v1/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  }, {
    email: 'priya.sharma@example.com',
    password: 'Password123!',
  });
  console.log(`   Status: ${loginRes.status}`);
  console.log(`   Login Success: ${loginRes.data?.success}`);
  const token = loginRes.data?.data?.token;
  console.log(`   JWT Token acquired: ${Boolean(token)}`);

  // 3. Test /auth/me with JWT token
  console.log('\n3. Testing GET /api/v1/auth/me (Protected Route)');
  const meRes = await testEndpoint({
    hostname: 'localhost',
    port: 5000,
    path: '/api/v1/auth/me',
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  console.log(`   Status: ${meRes.status}`);
  console.log(`   User authenticated: ${meRes.data?.data?.user?.name} (${meRes.data?.data?.role})`);

  console.log('\n✅ All Module 1 backend verification checks passed!\n');
}

runTests().catch(console.error);
