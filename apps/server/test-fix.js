#!/usr/bin/env node

/**
 * Quick test script to verify the tRPC fix
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
    console.log('🚀 Testing tRPC fix...');
    console.log(`📍 Base URL: ${BASE_URL}`);
    
    // Test 1: Health endpoint (should work)
    console.log('\n=== Test 1: Health Endpoint ===');
    await testEndpoint('/health');
    
    // Test 2: tRPC endpoint without session (should return JSON error, not 500)
    console.log('\n=== Test 2: tRPC Labels List (No Session) ===');
    const result = await testEndpoint('/api/trpc/labels.list?batch=1&input=%7B%220%22%3A%7B%22json%22%3Anull%2C%22meta%22%3A%7B%22values%22%3A%5B%22undefined%22%5D%7D%7D%7D');
    
    if (result.status === 401 || result.status === 400) {
        console.log('✅ SUCCESS: tRPC endpoint is returning proper JSON errors!');
    } else if (result.status === 500) {
        console.log('❌ FAILED: tRPC endpoint is still returning 500 errors');
        if (result.data && result.data.error && result.data.error.message) {
            console.log('Error message:', result.data.error.message);
        }
    } else {
        console.log(`⚠️  UNEXPECTED: tRPC endpoint returned status ${result.status}`);
    }
    
    console.log('\n✅ Test completed!');
}

main().catch(console.error); 