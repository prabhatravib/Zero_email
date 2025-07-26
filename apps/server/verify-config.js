#!/usr/bin/env node

/**
 * Configuration Verification Script
 * 
 * This script helps verify that your Google OAuth configuration is working correctly.
 * Run this after setting up your environment variables.
 */

const https = require('https');

const WORKER_URL = 'https://pitext-mail.prabhatravib.workers.dev';

async function checkEndpoint(endpoint) {
    return new Promise((resolve, reject) => {
        const url = `${WORKER_URL}${endpoint}`;
        console.log(`\n🔍 Checking: ${url}`);
        
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
    console.log('🚀 Google OAuth Configuration Verification');
    console.log('==========================================');
    
    try {
        // Check config status
        await checkEndpoint('/api/auth/config-check');
        
        // Check providers
        await checkEndpoint('/api/auth/providers');
        
        // Check debug endpoint
        await checkEndpoint('/api/debug');
        
        console.log('\n✅ Verification complete!');
        console.log('\n📝 Next steps:');
        console.log('1. If you see any "NOT SET" or "PLACEHOLDER" values, set the environment variables in Cloudflare Workers dashboard');
        console.log('2. If all values are set correctly, try the OAuth flow again');
        console.log('3. Check the worker logs in Cloudflare dashboard for any errors');
        
    } catch (error) {
        console.error('\n❌ Verification failed:', error.message);
    }
}

if (require.main === module) {
    main();
}

module.exports = { checkEndpoint }; 