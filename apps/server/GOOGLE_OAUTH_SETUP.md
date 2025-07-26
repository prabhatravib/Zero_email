# Google OAuth Setup Guide

## Issue
The deployment is failing with a 500 error because Google OAuth credentials are not properly configured. The system expects environment variables but they're not set.

## Quick Fix Steps

### 1. Get Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the following APIs:
   - Gmail API
   - Google+ API
4. Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client IDs"
5. Set application type to "Web application"
6. Add authorized redirect URIs:
   - `https://pitext-mail.prabhatravib.workers.dev/auth/callback/google`
   - `https://pitext-mail.prabhatravib.workers.dev/api/auth/callback/google`
7. Copy the Client ID and Client Secret

### 2. Set Environment Variables in Cloudflare Workers

1. Go to [Cloudflare Workers Dashboard](https://dash.cloudflare.com/)
2. Select your `pitext-mail` worker
3. Go to "Settings" → "Variables"
4. Add the following environment variables:

```
GOOGLE_CLIENT_ID=your_actual_client_id_here
GOOGLE_CLIENT_SECRET=your_actual_client_secret_here
BETTER_AUTH_SECRET=your_random_secret_key_here
```

### 3. Generate a Secret Key

For `BETTER_AUTH_SECRET`, generate a random 32-character string:
```bash
openssl rand -base64 32
```

### 4. Deploy the Changes

After setting the environment variables, redeploy your worker:

```bash
cd apps/server
wrangler deploy
```

## Verification

1. Visit: `https://pitext-mail.prabhatravib.workers.dev/api/auth/config-check`
2. You should see all environment variables are properly set
3. Try the OAuth flow again

## Troubleshooting

If you still get errors:

1. Check the worker logs in Cloudflare dashboard
2. Verify the redirect URI matches exactly in Google Cloud Console
3. Ensure all environment variables are set correctly
4. Check that the Gmail API is enabled in your Google Cloud project

## Security Notes

- Never commit credentials to version control
- Use environment variables for all sensitive data
- Regularly rotate your client secrets
- Monitor your OAuth usage in Google Cloud Console 