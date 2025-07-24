#!/usr/bin/env node

/**
 * Script to help set Google OAuth credentials in Cloudflare Workers
 * This script will guide you through setting up the credentials
 */

console.log('🔧 Google OAuth Credentials Setup');
console.log('=====================================');
console.log('');
console.log('Since wrangler.jsonc is overriding dashboard variables, you need to:');
console.log('');
console.log('1. Go to Cloudflare Workers Dashboard');
console.log('2. Find your worker: pitext-mail');
console.log('3. Go to Settings → Variables and Secrets');
console.log('4. Click "+ Add" to add new variables');
console.log('5. Add these two variables:');
console.log('');
console.log('   Variable name: GOOGLE_CLIENT_ID');
console.log('   Value: [Your actual Google Client ID]');
console.log('');
console.log('   Variable name: GOOGLE_CLIENT_SECRET');
console.log('   Value: [Your actual Google Client Secret]');
console.log('');
console.log('6. After adding them, deploy with:');
console.log('   wrangler deploy --env production');
console.log('');
console.log('This will preserve the dashboard variables while deploying.');
console.log('');
console.log('Note: The credentials will persist because they\'re set in the dashboard,');
console.log('not in wrangler.jsonc (which is secure).'); 