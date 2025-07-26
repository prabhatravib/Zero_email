# Simple Gmail-Only Deployment Guide

This guide helps you deploy the simplified Gmail-only authentication version of the email app.

## What's Changed

- **Simplified Authentication**: Only Gmail OAuth is supported
- **Fixed Content Decoding Issues**: Proxy now handles compression properly
- **Streamlined Login Flow**: Direct Gmail connection without complex provider setup
- **Better Error Handling**: Clear error messages for authentication issues

## Deployment Steps

### 1. Environment Variables

Make sure these environment variables are set in your deployment platform (Render):

```bash
NODE_ENV=production
PORT=10000
WRANGLER_ENV=render
VITE_PUBLIC_BACKEND_URL=https://pitext-mail.prabhatravib.workers.dev
VITE_PUBLIC_APP_URL=https://pitext-email.onrender.com
```

### 2. Google OAuth Configuration

The server is already configured with Google OAuth credentials:
- Client ID: `363401296279-vo7al766jmct0gcat24rrn2grv2jh1p5.apps.googleusercontent.com`
- Redirect URI: `https://pitext-mail.prabhatravib.workers.dev/auth/callback/google`

### 3. Deployment Commands

The deployment should use these commands:

**Build Command:**
```bash
pnpm install --frozen-lockfile && cd apps/mail && WRANGLER_ENV=render VITE_PUBLIC_BACKEND_URL=https://pitext-mail.prabhatravib.workers.dev VITE_PUBLIC_APP_URL=https://pitext-email.onrender.com pnpm run build
```

**Start Command:**
```bash
cd apps/mail && NODE_ENV=production pnpm run start
```

### 4. How It Works

1. **User clicks "Continue with Gmail"** on the login page
2. **Frontend makes request** to `/api/auth/sign-in/social` with `provider: 'google'`
3. **Server returns Google OAuth URL** for the user to authenticate
4. **User is redirected** to Google's OAuth consent screen
5. **After consent**, Google redirects back to `/auth/callback/google` on the server
6. **Server exchanges code** for access tokens and user info
7. **Server redirects** to frontend with session token
8. **Frontend sets session cookie** and redirects to `/mail`

### 5. Troubleshooting

#### Content Decoding Errors
- **Fixed**: The proxy now properly handles compression headers
- **If you still see errors**: Check that the `combined-server.js` is being used

#### 500 Internal Server Error
- **Check**: Google OAuth credentials are properly set
- **Verify**: The server can reach Google's OAuth endpoints
- **Debug**: Check server logs for specific error messages

#### Authentication Flow Issues
- **Verify**: Redirect URIs match between Google Console and server config
- **Check**: CORS settings allow your frontend domain
- **Debug**: Use browser dev tools to trace the OAuth flow

### 6. Testing

1. **Deploy the app** to your platform
2. **Visit the login page** - should show "Connect to Gmail" button
3. **Click the button** - should redirect to Google OAuth
4. **Complete OAuth flow** - should redirect back to `/mail`
5. **Check session** - should be authenticated

### 7. Security Notes

- Session tokens are base64 encoded (not encrypted)
- Cookies are set with `secure` and `samesite=strict` flags
- OAuth credentials are hardcoded (consider using environment variables for production)

## Files Modified

- `apps/server/src/main.ts` - Fixed headers and error handling
- `apps/mail/combined-server.js` - Fixed proxy compression handling
- `apps/mail/lib/auth-client.ts` - Simplified for Gmail only
- `apps/mail/lib/auth-proxy.ts` - Updated headers
- `apps/mail/app/(auth)/callback/page.tsx` - Simplified callback handling
- `apps/mail/app/(auth)/login/login-client.tsx` - Gmail-only login UI
- `apps/mail/app/(auth)/login/page.tsx` - Simplified loader

The deployment should now work without the content decoding and authentication errors you were experiencing. 