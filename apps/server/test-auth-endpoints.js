#!/usr/bin/env node

/**
 * Test script to verify authentication endpoints are working
 */

const BACKEND_URL = 'https://pitext-mail.prabhatravib.workers.dev';

async function testEndpoint(url, method = 'GET', body = null) {
  try {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    console.log(`Testing ${method} ${url}...`);
    const response = await fetch(url, options);
    
    console.log(`Status: ${response.status} ${response.statusText}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log('Response:', JSON.stringify(data, null, 2));
    } else {
      const text = await response.text();
      console.log('Error response:', text);
    }
    
    return response.ok;
  } catch (error) {
    console.error(`Error testing ${url}:`, error.message);
    return false;
  }
}

async function runTests() {
  console.log('🔍 Testing Authentication Endpoints');
  console.log('=====================================');
  console.log(`Backend URL: ${BACKEND_URL}`);
  console.log('');

  // Test health endpoint
  console.log('1. Testing health endpoint...');
  await testEndpoint(`${BACKEND_URL}/health`);
  console.log('');

  // Test get-session endpoint
  console.log('2. Testing get-session endpoint...');
  await testEndpoint(`${BACKEND_URL}/api/auth/get-session`);
  console.log('');

  // Test social sign-in endpoint
  console.log('3. Testing social sign-in endpoint...');
  await testEndpoint(`${BACKEND_URL}/api/auth/sign-in/social`, 'POST', {
    provider: 'google'
  });
  console.log('');

  // Test providers endpoint
  console.log('4. Testing providers endpoint...');
  await testEndpoint(`${BACKEND_URL}/api/public/providers`);
  console.log('');

  console.log('✅ Tests completed!');
  console.log('');
  console.log('If you see 404 errors, make sure:');
  console.log('1. Google OAuth credentials are set in Cloudflare Workers dashboard');
  console.log('2. Backend is deployed with: wrangler deploy --env production');
  console.log('3. Environment variables are properly configured');
}

runTests().catch(console.error); 