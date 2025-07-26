// Test to simulate the exact frontend OAuth flow
// Run this with: node test-frontend-flow.js

const FRONTEND_URL = 'https://pitext-email.onrender.com';
const BACKEND_URL = 'https://pitext-mail.prabhatravib.workers.dev';

async function testFrontendOAuthFlow() {
    console.log('🔍 Testing Frontend OAuth Flow...');
    
    try {
        // Step 1: Test the frontend proxy endpoint (what your frontend calls)
        console.log('\n1. Testing frontend proxy endpoint...');
        const proxyResponse = await fetch(`${FRONTEND_URL}/api/auth/sign-in/social`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify({ provider: 'google' }),
        });
        
        console.log('Frontend proxy response status:', proxyResponse.status);
        console.log('Frontend proxy response headers:', Object.fromEntries(proxyResponse.headers.entries()));
        
        if (proxyResponse.ok) {
            const proxyData = await proxyResponse.json();
            console.log('✅ Frontend proxy response:', proxyData);
            
            if (proxyData.url) {
                console.log('✅ OAuth URL received from frontend proxy');
                console.log('OAuth URL:', proxyData.url);
                
                // Parse the URL to verify it's correct
                const url = new URL(proxyData.url);
                const clientId = url.searchParams.get('client_id');
                const redirectUri = url.searchParams.get('redirect_uri');
                
                console.log('Client ID in URL:', clientId);
                console.log('Redirect URI in URL:', redirectUri);
                
                // Verify the client ID matches what we expect
                const expectedClientId = '363401296279-vo7al766jmct0gcat24rrn2grv2jh1p5.apps.googleusercontent.com';
                if (clientId === expectedClientId) {
                    console.log('✅ Client ID matches expected value');
                } else {
                    console.log('❌ Client ID mismatch!');
                    console.log('   Expected:', expectedClientId);
                    console.log('   Got:', clientId);
                }
            } else {
                console.log('❌ No OAuth URL in response');
            }
        } else {
            const errorText = await proxyResponse.text();
            console.log('❌ Frontend proxy error response:', errorText);
        }
        
    } catch (error) {
        console.error('❌ Frontend flow test failed:', error.message);
    }
}

testFrontendOAuthFlow().catch(console.error); 