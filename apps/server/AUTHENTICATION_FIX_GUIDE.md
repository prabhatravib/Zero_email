# Authentication Fix Guide

## Problem
The authentication is failing with 404 errors because:
1. Frontend is correctly configured but backend is missing Google OAuth credentials
2. Auth endpoints `/api/auth/get-session` and `/api/auth/sign-in/social` are returning 404
3. Google OAuth integration cannot work without proper credentials

## Solution Steps

### Step 1: Set Google OAuth Credentials in Cloudflare Workers

1. **Go to Cloudflare Workers Dashboard**
   - Visit: https://dash.cloudflare.com/
   - Navigate to Workers & Pages
   - Find your worker: `pitext-mail`

2. **Add Environment Variables**
   - Go to Settings → Variables and Secrets
   - Click "+ Add" to add new variables
   - Add these two variables:

   **Variable 1:**
   - Name: `GOOGLE_CLIENT_ID`
   - Value: `[Your actual Google Client ID]`
   - Type: Plain Text

   **Variable 2:**
   - Name: `GOOGLE_CLIENT_SECRET`
   - Value: `[Your actual Google Client Secret]`
   - Type: Secret

3. **Get Google OAuth Credentials**
   - Go to Google Cloud Console: https://console.cloud.google.com/
   - Create a new project or select existing one
   - Enable Gmail API and Google+ API
   - Go to Credentials → Create Credentials → OAuth 2.0 Client ID
   - Set authorized redirect URIs:
     - `https://pitext-mail.prabhatravib.workers.dev/auth/callback/google`
     - `https://pitext-email.onrender.com/auth/callback/google`

### Step 2: Deploy the Backend

```bash
cd apps/server
wrangler deploy --env production
```

### Step 3: Verify Configuration

1. **Test Backend Health**
   ```bash
   curl https://pitext-mail.prabhatravib.workers.dev/health
   ```

2. **Test Auth Endpoints**
   ```bash
   curl https://pitext-mail.prabhatravib.workers.dev/api/auth/get-session
   curl -X POST https://pitext-mail.prabhatravib.workers.dev/api/auth/sign-in/social \
     -H "Content-Type: application/json" \
     -d '{"provider":"google"}'
   ```

### Step 4: Redeploy Frontend (if needed)

The frontend configuration has been updated to use the correct backend URL. If you need to redeploy:

```bash
# The render.yaml has been updated with correct backend URL
# Deploy will happen automatically or you can trigger it manually
```

## Configuration Summary

### Frontend (Render)
- **URL**: `https://pitext-email.onrender.com`
- **Backend URL**: `https://pitext-mail.prabhatravib.workers.dev`
- **Proxy**: Configured to forward `/api/*` requests to backend

### Backend (Cloudflare Workers)
- **URL**: `https://pitext-mail.prabhatravib.workers.dev`
- **Required Env Vars**:
  - `GOOGLE_CLIENT_ID`
  - `GOOGLE_CLIENT_SECRET`
  - `VITE_PUBLIC_APP_URL` (set to frontend URL)

## Testing the Fix

1. **Visit the frontend**: https://pitext-email.onrender.com
2. **Click "Get Started"** - should redirect to Google OAuth
3. **Complete OAuth flow** - should redirect back to app
4. **Check session** - should show authenticated user

## Troubleshooting

### If still getting 404 errors:
1. Check Cloudflare Workers logs for errors
2. Verify environment variables are set correctly
3. Ensure Google OAuth credentials are valid
4. Check CORS configuration

### If OAuth redirect fails:
1. Verify redirect URIs in Google Cloud Console
2. Check that both frontend and backend URLs are authorized
3. Ensure `VITE_PUBLIC_APP_URL` is set correctly

### If session doesn't persist:
1. Check cookie settings
2. Verify cross-domain cookie handling
3. Check session token format and expiration

## Files Modified

1. `apps/mail/lib/auth-proxy.ts` - Updated to use correct backend URL
2. `apps/mail/lib/auth-client.ts` - Updated to use correct backend URL  
3. `apps/mail/render.yaml` - Updated environment variables
4. `apps/server/wrangler.jsonc` - Added secrets configuration

## Next Steps

After setting the Google OAuth credentials:
1. Deploy the backend with `wrangler deploy`
2. Test the authentication flow
3. Monitor logs for any remaining issues
4. Update this guide with any additional troubleshooting steps 