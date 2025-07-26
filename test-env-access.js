// Simple test to check environment variable access
// Run this with: node test-env-access.js

const WORKER_URL = 'https://pitext-mail.prabhatravib.workers.dev';

async function testEnvironmentAccess() {
    console.log('🔍 Testing environment variable access...');
    
    try {
        // Test a simple endpoint that should have access to env vars
        const response = await fetch(`${WORKER_URL}/api/auth/providers`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
            },
        });
        
        console.log('Providers response status:', response.status);
        
        if (response.ok) {
            const data = await response.json();
            console.log('Providers response:', data);
        } else {
            const errorText = await response.text();
            console.log('Providers error response:', errorText);
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

testEnvironmentAccess().catch(console.error); 