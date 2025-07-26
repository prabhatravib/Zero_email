# Google OAuth Setup Guide

## Problem
Your deployed application is getting a 500 error when trying to access `/api/auth/sign-in/social`. The Google OAuth credentials are configured in your Cloudflare Workers dashboard, and the OAuth endpoint works when called directly, but there's an issue with the proxy configuration that's causing the request to fail when called from the frontend.

## Solution

### Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing project
3. Enable the following APIs:
   - Gmail API
   - Google+ API (if available)
   - Google OAuth2 API

### Step 2: Create OAuth 2.0 Credentials

1. In your Google Cloud project, go to **APIs & Services** > **Credentials**
2. Click **Create Credentials** > **OAuth 2.0 Client IDs**
3. Choose **Web application** as the application type
4. Set the following:
   - **Name**: `Pitext Mail OAuth Client`
   - **Authorized JavaScript origins**: 
     - `https://pitext-email.onrender.com`
     - `http://localhost:3000` (for local development)
   - **Authorized redirect URIs**:
     - `https://pitext-mail.prabhatravib.workers.dev/auth/callback/google`
     - `http://localhost:8787/auth/callback/google` (for local development)

### Step 3: Verify Cloudflare Workers Environment Variables

✅ **Good news**: Your Google OAuth credentials are already configured in the Cloudflare Workers dashboard!

1. Go to your [Cloudflare Workers dashboard](https://dash.cloudflare.com/)
2. Select your `pitext-mail` worker
3. Go to **Settings** > **Variables**
4. Verify that the following environment variables are set:
   - `GOOGLE_CLIENT_ID` (Secret)
   - `GOOGLE_CLIENT_SECRET` (Secret)
   - `GOOGLE_REDIRECT_URI` (Plaintext)

**Note**: The credentials are properly configured as secrets, which is the correct approach for security.

### Step 4: Fix the Proxy Configuration

The issue was in the proxy configuration in `apps/mail/server.js`. The proxy was not properly handling JSON request bodies when forwarding requests to the Cloudflare Workers backend.

**Fix Applied:**
- Updated the proxy to properly stringify JSON request bodies
- Added better error handling to capture and log error responses
- Added debugging to track request body content

### Step 5: Deploy the Updated Code

1. Push your code changes to GitHub
2. Your deployment pipeline should automatically deploy the updated code
3. The proxy fix should resolve the 500 error

### Step 6: Test the Fix

1. **Run the proxy test script**:
   ```bash
   node test-proxy-fix.js
   ```

2. **Test the OAuth flow in your browser**:
   - Visit your deployed application
   - Click "Get Started" or "Continue with Gmail"
   - You should now be redirected to Google's OAuth consent screen

3. **Check the logs** (if issues persist):
   - Check your frontend server logs for proxy debugging information
   - Check Cloudflare Workers logs for any remaining issues

### Step 7: Test the Setup

1. Visit your deployed application
2. Click "Get Started" or "Continue with Gmail"
3. You should now be redirected to Google's OAuth consent screen
4. After authorization, you should be redirected back to your application

## Troubleshooting

### If you still get 500 errors:

1. **Check Cloudflare Workers logs**:
   - Go to your worker dashboard
   - Check the "Logs" tab for detailed error messages
   - Look for "OAuth Configuration Error" messages

2. **Verify environment variables**:
   - Ensure `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set in Cloudflare dashboard
   - Make sure they don't contain placeholder values like "REPLACE_WITH_"

3. **Check Google Cloud Console**:
   - Verify the redirect URI matches exactly: `https://pitext-mail.prabhatravib.workers.dev/auth/callback/google`
   - Ensure the Gmail API is enabled

4. **Test locally first**:
   - Set up local environment variables
   - Test the OAuth flow locally before deploying

### Common Issues:

1. **Redirect URI mismatch**: The redirect URI in Google Cloud Console must exactly match your worker URL
2. **Missing APIs**: Ensure Gmail API is enabled in Google Cloud Console
3. **Environment variables not accessible**: Even though credentials are set, they might not be accessible at runtime
4. **CORS issues**: The frontend and backend URLs must be properly configured
5. **Runtime errors**: Check Cloudflare Workers logs for specific error messages

### Potential Solutions:

1. **If environment variables are not accessible**:
   - Try redeploying the worker
   - Check if the worker has the correct permissions
   - Verify the variable names are exactly correct (case-sensitive)

2. **If the OAuth URL generation fails**:
   - Check the Google Cloud Console for any API quota issues
   - Verify the client ID and secret are valid
   - Test the credentials manually in Google Cloud Console

3. **If you get CORS errors**:
   - Check that the frontend URL is in the allowed origins
   - Verify the CORS configuration in the worker

## Security Notes

- Never commit OAuth credentials to version control
- Use environment variables in Cloudflare dashboard
- Regularly rotate your OAuth credentials
- Monitor your Google Cloud Console for any suspicious activity

## Next Steps

After setting up OAuth:
1. Test the complete authentication flow
2. Set up email synchronization
3. Configure any additional Gmail API permissions needed
4. Monitor logs for any issues

## Support

If you continue to have issues:
1. Check the Cloudflare Workers logs for detailed error messages
2. Verify all environment variables are correctly set
3. Test the OAuth flow step by step
4. Consider checking the Google Cloud Console for any API quota issues 