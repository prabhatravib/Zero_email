#!/usr/bin/env node

const WORKER_URL = 'https://pitext-mail.prabhatravib.workers.dev';

async function testOAuthFlow() {
    console.log('🔍 Testing OAuth flow...');
    
    // Test 1: Check if OAuth login endpoint is accessible
    console.log('\n1. Testing OAuth login endpoint...');
    try {
        const response = await fetch(`${WORKER_URL}/auth/google/login`, {
            method: 'GET',
            redirect: 'manual' // Don't follow redirects
        });
        
        console.log(`✅ OAuth login endpoint: ${response.status}`);
        
        if (response.status === 302) {
            const location = response.headers.get('location');
            console.log(`📋 Redirect location: ${location}`);
            
            if (location && location.includes('accounts.google.com')) {
                console.log('✅ Redirecting to Google OAuth (correct)');
            } else {
                console.log('❌ Not redirecting to Google OAuth');
            }
        } else {
            console.log('❌ Expected 302 redirect but got:', response.status);
        }
    } catch (error) {
        console.log(`❌ OAuth login endpoint failed: ${error.message}`);
    }
    
    // Test 2: Check if callback endpoint is accessible
    console.log('\n2. Testing OAuth callback endpoint...');
    try {
        const response = await fetch(`${WORKER_URL}/auth/google/callback?error=test`, {
            method: 'GET',
            redirect: 'manual'
        });
        
        console.log(`✅ OAuth callback endpoint: ${response.status}`);
        
        if (response.status === 302) {
            const location = response.headers.get('location');
            console.log(`📋 Error redirect location: ${location}`);
            
            if (location && location.includes('pitext-email.onrender.com')) {
                console.log('✅ Redirecting to frontend (correct)');
            } else {
                console.log('❌ Not redirecting to frontend');
            }
        } else {
            console.log('❌ Expected 302 redirect but got:', response.status);
        }
    } catch (error) {
        console.log(`❌ OAuth callback endpoint failed: ${error.message}`);
    }
    
    // Test 3: Check session endpoint
    console.log('\n3. Testing session endpoint...');
    try {
        const response = await fetch(`${WORKER_URL}/auth/session`, {
            method: 'GET'
        });
        
        if (response.status === 401) {
            console.log('✅ Session endpoint correctly returns 401 for unauthenticated requests');
        } else {
            console.log(`❌ Session endpoint returned unexpected status: ${response.status}`);
        }
    } catch (error) {
        console.log(`❌ Session endpoint failed: ${error.message}`);
    }
}

testOAuthFlow(); 