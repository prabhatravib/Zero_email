#!/usr/bin/env node

/**
 * Test Better-Auth Integration
 * 
 * This script tests if the better-auth integration is working correctly.
 */

const https = require('https');

const WORKER_URL = 'https://pitext-mail.prabhatravib.workers.dev';

async function testEndpoint(endpoint) {
    return new Promise((resolve, reject) => {
        const url = `${WORKER_URL}${endpoint}`;
        console.log(`\n🔍 Testing: ${url}`);
        
        https.get(url, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    console.log(`✅ Status: ${res.statusCode}`);
                    console.log('📋 Response:', JSON.stringify(json, null, 2));
                    resolve({ status: res.statusCode, data: json });
                } catch (e) {
                    console.log(`❌ Failed to parse JSON: ${data}`);
                    resolve({ status: res.statusCode, data: data });
                }
            });
        }).on('error', (err) => {
            console.log(`❌ Error: ${err.message}`);
            reject(err);
        });
    });
}

async function main() {
    console.log('🚀 Testing Google OAuth Configuration');
    console.log('=====================================');
    
    try {
        // Test OAuth config validation endpoint
        await testEndpoint('/debug-better-auth');
        
        // Test config check
        await testEndpoint('/api/auth/config-check');
        
        // Test providers endpoint
        await testEndpoint('/api/auth/providers');
        
        console.log('\n✅ Testing complete!');
        console.log('\n📝 Next steps:');
        console.log('1. If OAuth config validation shows success, the configuration is working');
        console.log('2. If you see any errors, check the worker logs in Cloudflare dashboard');
        console.log('3. Try the OAuth flow again after confirming the configuration is working');
        
    } catch (error) {
        console.error('\n❌ Testing failed:', error.message);
    }
}

if (require.main === module) {
    main();
}

module.exports = { testEndpoint }; 