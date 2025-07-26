// Simple test to verify OAuth endpoint is working
// Run this with: node test-verification.js

const WORKER_URL = 'https://pitext-mail.prabhatravib.workers.dev';

async function testOAuthEndpoint() {
    console.log('🔍 Testing OAuth endpoint after route registration fix...');
    
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
        
        if (response.ok) {
            const data = await response.json();
            console.log('✅ OAuth endpoint working correctly');
            console.log('Response data:', data);
            
            if (data.url) {
                console.log('✅ OAuth URL generated successfully');
                const url = new URL(data.url);
                const clientId = url.searchParams.get('client_id');
                console.log('Client ID in URL:', clientId);
            }
        } else {
            const errorText = await response.text();
            console.log('❌ OAuth endpoint error:', errorText);
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

testOAuthEndpoint().catch(console.error); 