// Test script to debug OAuth callback
// Run this with: node test-callback-debug.js

const WORKER_URL = 'https://pitext-mail.prabhatravib.workers.dev';

async function testCallbackEndpoint() {
    console.log('🔍 Testing OAuth callback endpoint...');
    console.log('Worker URL:', WORKER_URL);
    
    try {
        // Test the callback endpoint with a fake code
        const response = await fetch(`${WORKER_URL}/auth/callback/google?code=fake_code_for_testing`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
            },
        });
        
        console.log('Callback response status:', response.status);
        console.log('Callback response headers:', Object.fromEntries(response.headers.entries()));
        
        // The callback should redirect, so we expect a 302 or similar
        if (response.status >= 300 && response.status < 400) {
            const location = response.headers.get('location');
            console.log('✅ Callback redirected to:', location);
            
            if (location && location.includes('error=invalid_client')) {
                console.log('❌ Invalid client error detected in redirect');
            } else if (location && location.includes('error=')) {
                console.log('⚠️ Other error detected in redirect:', location);
            } else {
                console.log('✅ No error detected in redirect');
            }
        } else {
            const responseText = await response.text();
            console.log('Callback response body:', responseText);
        }
        
    } catch (error) {
        console.error('❌ Callback test failed:', error.message);
    }
}

async function testOAuthUrlGeneration() {
    console.log('\n🔍 Testing OAuth URL generation...');
    
    try {
        const response = await fetch(`${WORKER_URL}/api/auth/sign-in/social`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify({ provider: 'google' }),
        });
        
        if (response.ok) {
            const data = await response.json();
            const authUrl = data.url;
            console.log('✅ OAuth URL generated:', authUrl);
            
            // Parse the URL to check the redirect URI
            const url = new URL(authUrl);
            const redirectUri = url.searchParams.get('redirect_uri');
            console.log('🔍 Redirect URI in OAuth URL:', redirectUri);
            
            // Check if this matches what should be configured in Google Cloud Console
            const expectedRedirectUri = 'https://pitext-mail.prabhatravib.workers.dev/auth/callback/google';
            console.log('🔍 Expected redirect URI:', expectedRedirectUri);
            
            if (redirectUri === expectedRedirectUri) {
                console.log('✅ Redirect URI matches expected value');
            } else {
                console.log('❌ Redirect URI mismatch!');
                console.log('   Expected:', expectedRedirectUri);
                console.log('   Got:', redirectUri);
            }
        } else {
            console.log('❌ Failed to generate OAuth URL');
        }
        
    } catch (error) {
        console.error('❌ OAuth URL test failed:', error.message);
    }
}

async function runTests() {
    console.log('🚀 Starting Callback Debug Tests\n');
    
    await testOAuthUrlGeneration();
    await testCallbackEndpoint();
    
    console.log('\n✅ Tests completed');
}

runTests().catch(console.error); 