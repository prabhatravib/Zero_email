#!/usr/bin/env node

/**
 * Debug script to test deployment endpoints
 * Run this after deploying to identify authentication and API issues
 */

const BASE_URL = process.env.BASE_URL || 'https://pitext-mail.prabhatravib.workers.dev';

async function testEndpoint(path, options = {}) {
    const url = `${BASE_URL}${path}`;
    console.log(`\n🔍 Testing: ${url}`);
    
    try {
        const response = await fetch(url, {
            method: options.method || 'GET',
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        });
        
        console.log(`📊 Status: ${response.status} ${response.statusText}`);
        console.log(`📋 Headers:`, Object.fromEntries(response.headers.entries()));
        
        const contentType = response.headers.get('content-type');
        let data;
        
        if (contentType && contentType.includes('application/json')) {
            data = await response.json();
            console.log(`📄 JSON Response:`, JSON.stringify(data, null, 2));
        } else {
            const text = await response.text();
            console.log(`📄 Text Response:`, text.substring(0, 500) + (text.length > 500 ? '...' : ''));
        }
        
        return { success: response.ok, status: response.status, data };
    } catch (error) {
        console.error(`❌ Error:`, error.message);
        return { success: false, error: error.message };
    }
}

async function main() {
    console.log('🚀 Starting deployment debug tests...');
    console.log(`📍 Base URL: ${BASE_URL}`);
    
    // Test 1: Health endpoint (should work without auth)
    console.log('\n=== Test 1: Health Endpoint ===');
    await testEndpoint('/health');
    
    // Test 2: Auth check without session (should return 401)
    console.log('\n=== Test 2: Auth Check (No Session) ===');
    await testEndpoint('/api/auth/check');
    
    // Test 3: tRPC endpoint without session (should return proper JSON error)
    console.log('\n=== Test 3: tRPC Labels List (No Session) ===');
    await testEndpoint('/api/trpc/labels.list?batch=1&input=%7B%220%22%3A%7B%22json%22%3Anull%2C%22meta%22%3A%7B%22values%22%3A%5B%22undefined%22%5D%7D%7D%7D');
    
    // Test 4: Test with invalid session token
    console.log('\n=== Test 4: Auth Check (Invalid Session) ===');
    await testEndpoint('/api/auth/check', {
        headers: {
            'X-Session-Token': 'invalid-token'
        }
    });
    
    // Test 5: Test with malformed session token
    console.log('\n=== Test 5: Auth Check (Malformed Session) ===');
    await testEndpoint('/api/auth/check', {
        headers: {
            'X-Session-Token': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.signature'
        }
    });
    
    console.log('\n✅ Debug tests completed!');
    console.log('\n📋 Next Steps:');
    console.log('1. Check the health endpoint - should return 200 OK');
    console.log('2. Auth check without session should return 401 with JSON');
    console.log('3. tRPC endpoints should return JSON errors, not HTML');
    console.log('4. If you see HTML responses, the error handling is not working');
    console.log('5. Check your Cloudflare Worker logs for detailed error messages');
}

main().catch(console.error); 