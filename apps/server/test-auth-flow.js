// Test script to verify authentication flow
import fetch from 'node-fetch';

async function testAuthFlow() {
  console.log('Testing authentication flow...\n');
  
  // Test 1: Check if backend is accessible
  console.log('1. Testing backend connectivity...');
  try {
    const healthResponse = await fetch('https://pitext-mail.prabhatravib.workers.dev/health');
    console.log(`   Health check status: ${healthResponse.status}`);
    if (healthResponse.ok) {
      const healthData = await healthResponse.json();
      console.log(`   Health data:`, healthData);
    }
  } catch (error) {
    console.log(`   Health check failed: ${error.message}`);
  }
  
  // Test 2: Check auth endpoint
  console.log('\n2. Testing auth endpoint...');
  try {
    const authResponse = await fetch('https://pitext-mail.prabhatravib.workers.dev/api/auth/sign-in/social', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ provider: 'google' }),
    });
    console.log(`   Auth endpoint status: ${authResponse.status}`);
    if (authResponse.ok) {
      const authData = await authResponse.json();
      console.log(`   Auth response:`, authData);
    } else {
      const errorText = await authResponse.text();
      console.log(`   Auth error: ${errorText}`);
    }
  } catch (error) {
    console.log(`   Auth endpoint failed: ${error.message}`);
  }
  
  // Test 3: Check session endpoint
  console.log('\n3. Testing session endpoint...');
  try {
    const sessionResponse = await fetch('https://pitext-mail.prabhatravib.workers.dev/api/auth/get-session');
    console.log(`   Session endpoint status: ${sessionResponse.status}`);
    if (sessionResponse.ok) {
      const sessionData = await sessionResponse.json();
      console.log(`   Session data:`, sessionData);
    } else {
      const errorText = await sessionResponse.text();
      console.log(`   Session error: ${errorText}`);
    }
  } catch (error) {
    console.log(`   Session endpoint failed: ${error.message}`);
  }
  
  console.log('\nTest completed.');
}

testAuthFlow().catch(console.error); 