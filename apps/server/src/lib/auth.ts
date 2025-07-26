// Simple environment variable validation for Google OAuth
export const validateGoogleOAuthConfig = (envVars?: any) => {
  // Use passed env vars or fall back to global env
  const env = envVars || (globalThis as any).env;
  
  // Fail hard if Google OAuth credentials are not properly configured
  const requiredEnvVars = ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'];
  
  // Debug: Log the actual values
  console.log('🔍 Debug - Environment variables:');
  console.log('GOOGLE_CLIENT_ID:', env?.GOOGLE_CLIENT_ID);
  console.log('GOOGLE_CLIENT_SECRET:', env?.GOOGLE_CLIENT_SECRET ? 'SET (length: ' + env.GOOGLE_CLIENT_SECRET.length + ')' : 'NOT SET');
  
  const missingVars = requiredEnvVars.filter(varName => {
    const value = env?.[varName];
    return !value || value === '' || value.startsWith('REPLACE_WITH_') || value.startsWith('YOUR_ACTUAL_');
  });

  if (missingVars.length > 0) {
    const errorMessage = `CRITICAL: Google OAuth credentials not configured. Missing or invalid: ${missingVars.join(', ')}. 
    
To fix this:
1. Go to Google Cloud Console (https://console.cloud.google.com)
2. Create a new project or select existing project
3. Enable Gmail API and Google+ API
4. Create OAuth 2.0 credentials
5. Set the authorized redirect URI to: https://pitext-mail.prabhatravib.workers.dev/auth/callback/google
6. Add the credentials in Cloudflare Workers dashboard (NOT in wrangler.jsonc for security)

Current configuration:
- GOOGLE_CLIENT_ID: ${env?.GOOGLE_CLIENT_ID || 'NOT SET (add in Cloudflare dashboard)'}
- GOOGLE_CLIENT_SECRET: ${env?.GOOGLE_CLIENT_SECRET ? 'SET (but may be invalid)' : 'NOT SET (add in Cloudflare dashboard)'}

IMPORTANT: Do NOT add credentials to wrangler.jsonc as they will be committed to GitHub.`;

    console.error(errorMessage);
    throw new Error(`OAuth Configuration Error: ${missingVars.join(', ')} not properly configured`);
  }

  console.log('✅ Google OAuth credentials validated successfully');
  return true;
};
