#!/usr/bin/env node

/**
 * OAuth Configuration Verification Script
 * 
 * This script helps verify that your OAuth configuration is correct
 * and identifies any issues with redirect URIs or environment variables.
 */

const fs = require('fs');
const path = require('path');

// Colors for console output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

function checkWranglerConfig() {
  logInfo('Checking wrangler.jsonc configuration...');
  
  const wranglerPath = path.join(__dirname, '..', 'apps', 'server', 'wrangler.jsonc');
  
  if (!fs.existsSync(wranglerPath)) {
    logError('wrangler.jsonc not found!');
    return false;
  }
  
  try {
    const wranglerContent = fs.readFileSync(wranglerPath, 'utf8');
    const config = JSON.parse(wranglerContent);
    
    // Check production environment
    const productionEnv = config.env?.production || config.env?.['infflow-api-production'];
    
    if (!productionEnv) {
      logError('Production environment not found in wrangler.jsonc');
      return false;
    }
    
    const backendUrl = productionEnv.vars?.VITE_PUBLIC_BACKEND_URL;
    const googleClientId = productionEnv.vars?.GOOGLE_CLIENT_ID;
    const googleClientSecret = productionEnv.vars?.GOOGLE_CLIENT_SECRET;
    
    if (!backendUrl) {
      logError('VITE_PUBLIC_BACKEND_URL not found in production environment');
      return false;
    }
    
    if (!googleClientId) {
      logError('GOOGLE_CLIENT_ID not found in production environment');
      return false;
    }
    
    if (!googleClientSecret) {
      logError('GOOGLE_CLIENT_SECRET not found in production environment');
      return false;
    }
    
    logSuccess('All required environment variables found in wrangler.jsonc');
    
    // Check for trailing spaces
    const trimmedBackendUrl = backendUrl.trim();
    if (trimmedBackendUrl !== backendUrl) {
      logWarning('VITE_PUBLIC_BACKEND_URL contains trailing spaces!');
      logInfo(`Original: "${backendUrl}"`);
      logInfo(`Trimmed:  "${trimmedBackendUrl}"`);
      return false;
    }
    
    logSuccess('VITE_PUBLIC_BACKEND_URL has no trailing spaces');
    
    // Generate expected redirect URI
    const expectedRedirectUri = `${trimmedBackendUrl}/api/auth/callback/google`;
    logInfo(`Expected redirect URI: ${expectedRedirectUri}`);
    
    return {
      backendUrl: trimmedBackendUrl,
      redirectUri: expectedRedirectUri,
      googleClientId,
      hasClientSecret: !!googleClientSecret
    };
    
  } catch (error) {
    logError(`Error parsing wrangler.jsonc: ${error.message}`);
    return false;
  }
}

function validateUrl(url) {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

function main() {
  log('🔍 OAuth Configuration Verification', 'bold');
  log('');
  
  const config = checkWranglerConfig();
  
  if (!config) {
    logError('Configuration check failed. Please fix the issues above.');
    process.exit(1);
  }
  
  log('');
  logInfo('Validating URLs...');
  
  if (!validateUrl(config.backendUrl)) {
    logError(`Invalid backend URL: ${config.backendUrl}`);
    process.exit(1);
  }
  
  if (!validateUrl(config.redirectUri)) {
    logError(`Invalid redirect URI: ${config.redirectUri}`);
    process.exit(1);
  }
  
  logSuccess('All URLs are valid');
  
  log('');
  logInfo('📋 Configuration Summary:');
  log(`Backend URL: ${config.backendUrl}`);
  log(`Redirect URI: ${config.redirectUri}`);
  log(`Google Client ID: ${config.googleClientId ? '✅ Set' : '❌ Not set'}`);
  log(`Google Client Secret: ${config.hasClientSecret ? '✅ Set' : '❌ Not set'}`);
  
  log('');
  logInfo('🔧 Next Steps:');
  log('1. Go to Google Cloud Console > APIs & Services > Credentials');
  log('2. Edit your OAuth 2.0 Client ID');
  log('3. Add this exact redirect URI to authorized redirect URIs:');
  log(`   ${config.redirectUri}`);
  log('4. Make sure there are NO trailing spaces in the redirect URI');
  log('5. Deploy your application and test the OAuth flow');
  
  log('');
  logSuccess('Configuration verification completed!');
}

if (require.main === module) {
  main();
}

module.exports = { checkWranglerConfig, validateUrl }; 