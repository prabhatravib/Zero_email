#!/usr/bin/env node

const WORKER_URL = 'https://pitext-mail.prabhatravib.workers.dev';

async function testSimple() {
    console.log('🔍 Testing basic connectivity...');
    
    // Test 1: Basic health check
    console.log('\n1. Testing health endpoint...');
    try {
        const response = await fetch(`${WORKER_URL}/health`);
        const data = await response.text();
        console.log(`✅ Health check: ${response.status} - ${data}`);
    } catch (error) {
        console.log(`❌ Health check failed: ${error.message}`);
    }
    
    // Test 2: Debug environment
    console.log('\n2. Testing environment variables...');
    try {
        const response = await fetch(`${WORKER_URL}/debug-env`);
        const data = await response.json();
        console.log(`✅ Environment check: ${response.status}`);
        console.log('📋 Response:', JSON.stringify(data, null, 2));
    } catch (error) {
        console.log(`❌ Environment check failed: ${error.message}`);
    }
    
    // Test 3: OAuth endpoint
    console.log('\n3. Testing OAuth endpoint...');
    try {
        const response = await fetch(`${WORKER_URL}/api/auth/sign-in/social`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ provider: 'google' })
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log(`✅ OAuth endpoint: ${response.status}`);
            console.log('📋 Response:', JSON.stringify(data, null, 2));
        } else {
            const errorText = await response.text();
            console.log(`❌ OAuth endpoint failed: ${response.status} - ${errorText}`);
        }
    } catch (error) {
        console.log(`❌ OAuth endpoint failed: ${error.message}`);
    }
}

testSimple(); 