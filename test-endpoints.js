#!/usr/bin/env node

/**
 * BACKEND STARTUP & HEALTH CHECK SCRIPT
 * Tests all endpoints to ensure the backend is running successfully
 */

const http = require('http');
const https = require('https');

const BASE_URL = 'http://localhost:5000';
const ENDPOINTS = [
  { method: 'GET', path: '/api/health', name: '✓ Health Check' },
  { method: 'GET', path: '/api/owner/debug-health', name: '✓ Owner Router' },
  { method: 'POST', path: '/api/owner/send-otp', name: '✓ Send OTP (Owner)', body: { email: 'test@example.com' } },
  { method: 'POST', path: '/api/loader/send-otp', name: '✓ Send OTP (Loader)', body: { email: 'test@example.com' } },
];

const testEndpoint = (method, path, body = null) => {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE_URL + path);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 5000,
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          success: res.statusCode < 400,
          data: data ? JSON.parse(data) : null,
        });
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (body) {
      req.write(JSON.stringify(body));
    }

    req.end();
  });
};

const runTests = async () => {
  console.log('\n🧪 BACKEND ENDPOINT TESTING...\n');
  console.log(`📞 Testing endpoints at: ${BASE_URL}\n`);

  console.log('─'.repeat(60));

  let passCount = 0;
  let failCount = 0;

  for (const endpoint of ENDPOINTS) {
    try {
      const result = await testEndpoint(endpoint.method, endpoint.path, endpoint.body);
      const statusColor = result.success ? '✅' : '❌';
      console.log(`${statusColor} ${endpoint.name}`);
      console.log(`   ${endpoint.method} ${endpoint.path} → ${result.status}`);
      if (!result.success) {
        console.log(`   Error: ${result.data?.message || 'Unknown error'}`);
        failCount++;
      } else {
        passCount++;
      }
    } catch (err) {
      console.log(`❌ ${endpoint.name}`);
      console.log(`   ${endpoint.method} ${endpoint.path} → ERROR`);
      console.log(`   ${err.message}`);
      failCount++;
    }
  }

  console.log('─'.repeat(60));
  console.log(`\n📊 Results: ${passCount} passed, ${failCount} failed\n`);

  if (failCount > 0) {
    console.log('⚠️  Some endpoints failed. Check:');
    console.log('   1. Is MongoDB connected?');
    console.log('   2. Are all environment variables set in .env?');
    console.log('   3. Is the server running on port 5000?');
  } else {
    console.log('✅ All endpoints are working!\n');
  }
};

// Wait for server to start if running immediately after npm start
setTimeout(runTests, 2000);
