#!/usr/bin/env node

/**
 * Script to help set environment variables in Cloudflare Workers Dashboard
 * This script will guide you through setting up the variables that were being overridden
 */

console.log('🔧 Cloudflare Workers Dashboard Variables Setup');
console.log('===============================================');
console.log('');
console.log('The wrangler.jsonc file was overriding your dashboard variables.');
console.log('I\'ve removed the "vars" section from wrangler.jsonc so your dashboard');
console.log('variables will now be preserved.');
console.log('');
console.log('Now you need to add these variables in the Cloudflare Workers Dashboard:');
console.log('');

console.log('📋 Required Variables to Add:');
console.log('=============================');
console.log('');

console.log('1. Go to Cloudflare Workers Dashboard:');
console.log('   https://dash.cloudflare.com/');
console.log('');

console.log('2. Navigate to Workers & Pages → pitext-mail');
console.log('');

console.log('3. Go to Settings → Variables and Secrets');
console.log('');

console.log('4. Click "+ Add" and add these variables:');
console.log('');

console.log('   Variable 1:');
console.log('   - Name: NODE_ENV');
console.log('   - Value: production');
console.log('   - Type: Plain Text');
console.log('');

console.log('   Variable 2:');
console.log('   - Name: VITE_PUBLIC_APP_URL');
console.log('   - Value: https://pitext-email.onrender.com');
console.log('   - Type: Plain Text');
console.log('');

console.log('   Variable 3:');
console.log('   - Name: GOOGLE_CLIENT_ID');
console.log('   - Value: [Your actual Google Client ID]');
console.log('   - Type: Plain Text');
console.log('');

console.log('   Variable 4:');
console.log('   - Name: GOOGLE_CLIENT_SECRET');
console.log('   - Value: [Your actual Google Client Secret]');
console.log('   - Type: Secret');
console.log('');

console.log('5. After adding all variables, deploy with:');
console.log('   cd apps/server');
console.log('   wrangler deploy --env production');
console.log('');

console.log('6. Test the endpoints:');
console.log('   node apps/server/test-auth-endpoints.js');
console.log('');

console.log('✅ This will ensure your dashboard variables are preserved and not overridden.');
console.log('');
console.log('Note: The "secrets" section in wrangler.jsonc only declares which secrets');
console.log('are expected, but doesn\'t override the actual values you set in the dashboard.'); 