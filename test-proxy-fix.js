// Test script to verify the proxy fix
// Run this with: node test-proxy-fix.js

const FRONTEND_URL = 'https://pitext-email.onrender.com';

async function testProxyOAuthEndpoint() {
    console.log('🔍 Testing OAuth endpoint through proxy...');
    console.log('Frontend URL:', FRONTEND_URL);
    
    try {
        const response = await fetch(`${FRONTEND_URL}/api/auth/sign-in/social`, {
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
                console.log('✅ OAuth URL generated successfully through proxy:', data.url);
            } catch (parseError) {
                console.log('⚠️ Response is not valid JSON');
            }
        } else {
            console.log('❌ OAuth endpoint failed through proxy');
        }
        
    } catch (error) {
        console.error('❌ Request failed:', error.message);
    }
}

async function testDirectOAuthEndpoint() {
    console.log('\n🔍 Testing OAuth endpoint directly...');
    
    try {
        const response = await fetch('https://pitext-mail.prabhatravib.workers.dev/api/auth/sign-in/social', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify({ provider: 'google' }),
        });
        
        console.log('Direct response status:', response.status);
        
        const responseText = await response.text();
        console.log('Direct response body:', responseText);
        
        if (response.ok) {
            try {
                const data = JSON.parse(responseText);
                console.log('✅ OAuth URL generated successfully directly:', data.url);
            } catch (parseError) {
                console.log('⚠️ Direct response is not valid JSON');
            }
        } else {
            console.log('❌ Direct OAuth endpoint failed');
        }
        
    } catch (error) {
        console.error('❌ Direct request failed:', error.message);
    }
}

async function runTests() {
    console.log('🚀 Starting Proxy Fix Tests\n');
    
    await testDirectOAuthEndpoint();
    await testProxyOAuthEndpoint();
    
    console.log('\n✅ Tests completed');
}

runTests().catch(console.error); 