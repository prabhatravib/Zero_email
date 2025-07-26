#!/usr/bin/env node

/**
 * Debug OAuth Issues
 * 
 * This script helps debug the OAuth configuration and endpoints.
 */

const https = require('https');

const WORKER_URL = 'https://pitext-mail.prabhatravib.workers.dev';

async function testEndpoint(endpoint, method = 'GET', body = null) {
    return new Promise((resolve, reject) => {
        const url = `${WORKER_URL}${endpoint}`;
        console.log(`\n🔍 Testing: ${method} ${url}`);
        
        const options = {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            }
        };
        
        if (body) {
            options.headers['Content-Length'] = Buffer.byteLength(JSON.stringify(body));
        }
        
        const req = https.request(url, options, (res) => {
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
        });
        
        req.on('error', (err) => {
            console.log(`❌ Error: ${err.message}`);
            reject(err);
        });
        
        if (body) {
            req.write(JSON.stringify(body));
        }
        
        req.end();
    });
}

async function main() {
    console.log('🚀 Debugging OAuth Issues');
    console.log('=========================');
    
    try {
        // Test environment variables
        console.log('\n1. Testing environment variables...');
        await testEndpoint('/debug-env');
        
        // Test OAuth config validation
        console.log('\n2. Testing OAuth config validation...');
        await testEndpoint('/debug-better-auth');
        
        // Test config check
        console.log('\n3. Testing config check...');
        await testEndpoint('/api/auth/config-check');
        
        // Test the actual OAuth endpoint
        console.log('\n4. Testing OAuth sign-in endpoint...');
        await testEndpoint('/api/auth/sign-in/social', 'POST', { provider: 'google' });
        
        console.log('\n✅ Debugging complete!');
        console.log('\n📝 Analysis:');
        console.log('- If step 1 shows environment variables are NOT SET, you need to add them to Cloudflare Workers');
        console.log('- If step 2 fails, there\'s an issue with the OAuth configuration');
        console.log('- If step 3 shows issues, check the configuration');
        console.log('- If step 4 fails, the OAuth endpoint has an error');
        
    } catch (error) {
        console.error('\n❌ Debugging failed:', error.message);
    }
}

if (require.main === module) {
    main();
}

module.exports = { testEndpoint }; 