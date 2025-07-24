# Backend Debugging Guide

## Current Setup Analysis

Based on your configuration, you have:

✅ **Frontend**: `https://pitext-email.onrender.com` (Render)
✅ **Backend**: `https://pitext-mail.prabhatravib.workers.dev` (Cloudflare Workers)
✅ **Google OAuth**: Properly configured with correct redirect URIs
✅ **Environment Variables**: Set in Render dashboard

## The Problem

The "Get Started" button is failing because:
- Frontend tries to call: `https://pitext-mail.prabhatravib.workers.dev/auth/sign-in/google`
- This endpoint returns 404 (Not Found)

## Debugging Steps

### 1. Check if Backend is Running

Test if your Cloudflare Workers service is responding:

```bash
# Test basic connectivity
curl -I https://pitext-mail.prabhatravib.workers.dev

# Test auth endpoint specifically
curl -I https://pitext-mail.prabhatravib.workers.dev/auth/sign-in/google
```

**Expected Results:**
- Basic connectivity should return 200 OK
- Auth endpoint should return 200 OK or 405 Method Not Allowed (not 404)

### 2. Check Cloudflare Workers Environment Variables

Your backend needs the same Google OAuth credentials. In your Cloudflare Workers dashboard:

1. Go to your Workers service
2. Check "Settings" > "Environment Variables"
3. Verify these are set:
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
   - `BETTER_AUTH_SECRET`
   - `VITE_PUBLIC_BACKEND_URL`

### 3. Check Cloudflare Workers Logs

1. Go to your Cloudflare Workers dashboard
2. Check "Logs" section
3. Look for any errors when the auth endpoint is called

### 4. Test Authentication Flow

Try accessing the auth endpoint directly in your browser:
```
https://pitext-mail.prabhatravib.workers.dev/auth/sign-in/google
```

**Expected Behavior:**
- Should redirect to Google OAuth
- Should NOT return 404

## Common Issues & Solutions

### Issue 1: Backend Not Deployed
**Symptoms**: 404 errors on all endpoints
**Solution**: Deploy your backend to Cloudflare Workers

### Issue 2: Missing Environment Variables
**Symptoms**: Auth endpoints return 500 or 404
**Solution**: Add Google OAuth credentials to Cloudflare Workers environment

### Issue 3: Wrong Redirect URI
**Symptoms**: Google OAuth fails after redirect
**Solution**: Verify redirect URI in Google Cloud Console matches your backend URL

### Issue 4: CORS Issues
**Symptoms**: Frontend can't call backend
**Solution**: Check CORS configuration in backend

## Quick Fixes to Try

### 1. Deploy Backend to Cloudflare Workers
If your backend isn't deployed:

```bash
cd apps/server
pnpm run deploy
```

### 2. Add Environment Variables to Cloudflare Workers
In your Cloudflare Workers dashboard, add:
- `GOOGLE_CLIENT_ID` (same as Render)
- `GOOGLE_CLIENT_SECRET` (same as Render)
- `BETTER_AUTH_SECRET` (same as Render)

### 3. Test with Simple Endpoint
Add a simple health check endpoint to verify the backend is working:

```javascript
// In your backend
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
```

Then test: `https://pitext-mail.prabhatravib.workers.dev/health`

## Expected Flow When Working

1. **User clicks "Get Started"**
2. **Frontend calls**: `https://pitext-mail.prabhatravib.workers.dev/auth/sign-in/google`
3. **Backend responds**: Redirects to Google OAuth
4. **User authenticates**: With Google
5. **Google redirects**: Back to `https://pitext-mail.prabhatravib.workers.dev/auth/callback/google`
6. **Backend processes**: OAuth callback and creates session
7. **User redirected**: To `/mail/inbox` with full Gmail integration

## Next Steps

1. **Test backend connectivity** using the curl commands above
2. **Check Cloudflare Workers logs** for errors
3. **Verify environment variables** are set in both Render and Cloudflare Workers
4. **Deploy backend** if it's not running

Once the backend is working, your "Get Started" button will provide full Gmail integration with:
- ✅ Gmail OAuth authentication
- ✅ Email reading and sending
- ✅ Labels and categories
- ✅ AI-powered features
- ✅ Real-time sync 