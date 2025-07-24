# Authentication Troubleshooting Guide

## Common Issues and Solutions

### 1. 500 Errors on `/api/auth/sign-in/social`

**Symptoms:**
- Browser console shows 500 errors for authentication endpoints
- Users can't sign in with Google
- Authentication flow fails silently

**Root Causes:**
1. **Missing Google OAuth Credentials** (Most Common)
2. **Incorrect Redirect URIs**
3. **Environment Variable Mismatches**
4. **CORS Configuration Issues**

### 2. How to Fix

#### Step 1: Set up Google OAuth Credentials

1. **Create Google Cloud Project:**
   ```bash
   # Go to https://console.cloud.google.com/
   # Create new project or select existing
   ```

2. **Enable APIs:**
   - Gmail API
   - Google+ API
   - People API

3. **Create OAuth 2.0 Credentials:**
   - Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client IDs"
   - Application type: "Web application"
   - Authorized redirect URIs:
     ```
     https://pitext-mail.prabhatravib.workers.dev/auth/callback/google
     http://localhost:8787/auth/callback/google
     ```

4. **Update Environment Variables:**
   ```bash
   # In wrangler.jsonc, replace placeholder values:
   "GOOGLE_CLIENT_ID": "your-actual-client-id.apps.googleusercontent.com",
   "GOOGLE_CLIENT_SECRET": "your-actual-client-secret"
   ```

#### Step 2: Check Configuration

Visit the configuration check endpoint:
```
https://pitext-mail.prabhatravib.workers.dev/api/public/config-check
```

This will show you:
- Which environment variables are set
- Which ones are missing
- Specific configuration issues

#### Step 3: Verify Environment Variables

Required variables for authentication:
```bash
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
BETTER_AUTH_SECRET=your-auth-secret
BETTER_AUTH_URL=https://pitext-email.onrender.com
COOKIE_DOMAIN=pitext-email.onrender.com
VITE_PUBLIC_BACKEND_URL=https://pitext-mail.prabhatravib.workers.dev
```

#### Step 4: Test Authentication Flow

1. **Check Provider Status:**
   ```
   https://pitext-mail.prabhatravib.workers.dev/api/public/providers
   ```

2. **Test Social Sign-in:**
   ```
   https://pitext-mail.prabhatravib.workers.dev/auth/sign-in/social/google
   ```

### 3. Debugging Steps

#### Check Server Logs
```bash
# Deploy with debug logging
wrangler deploy --env render
```

#### Test Locally
```bash
# Start local development server
cd apps/server
npm run dev

# Check logs for authentication errors
```

#### Verify OAuth Configuration
1. Check Google Cloud Console for correct redirect URIs
2. Verify client ID and secret are correct
3. Ensure APIs are enabled
4. Check OAuth consent screen configuration

### 4. Common Error Messages

| Error | Cause | Solution |
|-------|-------|----------|
| `500 Internal Server Error` | Missing Google credentials | Set up Google OAuth |
| `404 Not Found` | Wrong endpoint URL | Check route configuration |
| `CORS Error` | Cross-origin issues | Update CORS configuration |
| `Invalid redirect_uri` | Wrong redirect URI | Update Google OAuth settings |

### 5. Environment-Specific Issues

#### Render Environment
- Ensure all environment variables are set in Render dashboard
- Check that the service is properly deployed
- Verify domain configuration

#### Local Development
- Use `http://localhost:8787` for backend URL
- Set up local Google OAuth credentials
- Use localhost redirect URIs

### 6. Quick Fixes

#### If Google OAuth is not working:
1. Check if credentials are set correctly
2. Verify redirect URIs match exactly
3. Ensure APIs are enabled in Google Cloud Console
4. Check if OAuth consent screen is configured

#### If you get CORS errors:
1. Update CORS configuration in `main.ts`
2. Add your domain to trusted origins
3. Check if credentials are being sent properly

#### If authentication flow fails:
1. Check browser console for specific errors
2. Verify all required environment variables
3. Test with the configuration check endpoint
4. Review server logs for detailed error messages

### 7. Monitoring

Use these endpoints to monitor authentication health:

```bash
# Check provider status
curl https://pitext-mail.prabhatravib.workers.dev/api/public/providers

# Check configuration
curl https://pitext-mail.prabhatravib.workers.dev/api/public/config-check

# Test auth endpoint
curl https://pitext-mail.prabhatravib.workers.dev/auth/sign-in/social/google
```

### 8. Emergency Fallback

If authentication is completely broken:

1. **Temporary Fix:** Redirect users to contact form
2. **Manual Setup:** Provide instructions for manual Gmail integration
3. **Rollback:** Deploy previous working version
4. **Support:** Direct users to support channels

## Need Help?

If you're still experiencing issues:

1. Check the configuration endpoint for specific problems
2. Review server logs for detailed error messages
3. Verify all environment variables are set correctly
4. Test with a fresh Google OAuth setup 