// Simple test script to debug OAuth configuration
// Run this with: node test-oauth-debug.js

const WORKER_URL = 'https://pitext-mail.prabhatravib.workers.dev';

async function testOAuthEndpoint() {
    console.log('🔍 Testing OAuth endpoint...');
    console.log('Worker URL:', WORKER_URL);
    
    try {
        const response = await fetch(`${WORKER_URL}/api/auth/sign-in/social`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify({ provider: 'google' }),
        });
        
        console.log('Response status:', response.status);
        console.log('Response headers:', Object.fromEntries(response.headers.entries()));
        
        const responseText = await response.text();
        console.log('Response body:', responseText);
        
        if (response.ok) {
            try {
                const data = JSON.parse(responseText);
                console.log('✅ OAuth URL generated successfully:', data.url);
            } catch (parseError) {
                console.log('⚠️ Response is not valid JSON');
            }
        } else {
            console.log('❌ OAuth endpoint failed');
        }
        
    } catch (error) {
        console.error('❌ Request failed:', error.message);
    }
}

async function testHealthEndpoint() {
    console.log('\n🔍 Testing health endpoint...');
    
    try {
        const response = await fetch(`${WORKER_URL}/health`);
        console.log('Health check status:', response.status);
        
        if (response.ok) {
            const data = await response.json();
            console.log('Health check response:', data);
        } else {
            console.log('❌ Health check failed');
        }
        
    } catch (error) {
        console.error('❌ Health check request failed:', error.message);
    }
}

async function testProvidersEndpoint() {
    console.log('\n🔍 Testing providers endpoint...');
    
    try {
        const response = await fetch(`${WORKER_URL}/api/auth/providers`);
        console.log('Providers endpoint status:', response.status);
        
        if (response.ok) {
            const data = await response.json();
            console.log('Providers response:', JSON.stringify(data, null, 2));
        } else {
            console.log('❌ Providers endpoint failed');
        }
        
    } catch (error) {
        console.error('❌ Providers request failed:', error.message);
    }
}

async function runTests() {
    console.log('🚀 Starting OAuth Debug Tests\n');
    
    await testHealthEndpoint();
    await testProvidersEndpoint();
    await testOAuthEndpoint();
    
    console.log('\n✅ Tests completed');
}

runTests().catch(console.error); 