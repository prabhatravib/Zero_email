# Unified Google OAuth Implementation

## Overview

This implementation consolidates the two separate OAuth journeys (app sign-in + Gmail connection) into a single unified "Sign in with Google (Gmail)" flow, following the recommended approach from the parent Zero repo.

## Changes Made

### Backend Changes

#### 1. New Unified OAuth Route (`apps/server/src/routes/auth/google.ts`)
- **Login Endpoint**: `/auth/google/login`
  - Generates PKCE code verifier and challenge for security
  - Builds OAuth URL with all required scopes (openid, email, profile, gmail.modify, gmail.readonly)
  - Redirects to Google OAuth with proper parameters

- **Callback Endpoint**: `/auth/google/callback`
  - Exchanges authorization code for tokens
  - Decodes ID token to get user information
  - Creates session with all necessary data (access token, refresh token, user info)
  - Sets HttpOnly session cookie and redirects to `/mail/inbox`

#### 2. Session Management (`apps/server/src/routes/auth/session.ts`)
- **Session Endpoint**: `/auth/session`
  - Verifies session cookie and returns user data
  - Handles session expiration

- **Sign Out Endpoint**: `/auth/signout`
  - Clears session cookie

#### 3. Updated Auth Routes (`apps/server/src/routes/auth/index.ts`)
- Removed old social sign-in and callback routes
- Added new unified Google OAuth routes
- Added session management endpoints

#### 4. Removed Files
- `apps/server/src/routes/auth/callback-google.ts` (old callback)
- `apps/server/src/routes/auth/sign-in-social.ts` (old social sign-in)

### Frontend Changes

#### 1. Updated Auth Client (`apps/mail/lib/auth-client.ts`)
- Simplified to use unified OAuth flow
- Updated session management to use cookies instead of localStorage
- Added proper session verification via backend API

#### 2. Updated Login Client (`apps/mail/app/(auth)/login/login-client.tsx`)
- Changed from "Connect to Gmail" to "Sign in with Google"
- Removed complex OAuth URL building
- Uses direct redirect to backend OAuth endpoint

#### 3. Updated Components
- **HomeContent**: Updated "Get Started" button to use unified flow
- **Navigation**: Updated "Get Started" button in header
- **Pricing Components**: Updated upgrade flows to use unified OAuth

## Security Features

### PKCE (Proof Key for Code Exchange)
- Generates secure code verifier and challenge
- Prevents authorization code interception attacks

### Secure Session Management
- HttpOnly cookies prevent XSS attacks
- Secure and SameSite flags for cookie security
- JWT-based session tokens with proper expiration

### Token Storage
- Access tokens stored in session (temporary)
- Refresh tokens stored server-side (secure storage needed for production)
- No sensitive tokens in localStorage

## OAuth Scopes

The unified flow requests all necessary scopes in one consent screen:
- `openid` - OpenID Connect authentication
- `email` - User's email address
- `profile` - User's basic profile information
- `https://www.googleapis.com/auth/gmail.modify` - Read and modify Gmail
- `https://www.googleapis.com/auth/gmail.readonly` - Read Gmail

## User Experience

### Before (Two-Step Process)
1. User clicks "Get Started"
2. User signs in with Google (basic scopes)
3. User redirected to "Connect to Gmail" page
4. User clicks "Connect to Gmail"
5. User consents to Gmail scopes
6. User finally reaches inbox

### After (Unified Process)
1. User clicks "Sign in with Google (Gmail)"
2. User consents to all scopes in one screen
3. User redirected directly to inbox

## Benefits

### User Experience
- **Fewer clicks**: One consent screen instead of two
- **Clearer intent**: "Sign in with Google (Gmail)" is more descriptive
- **Faster onboarding**: No intermediate "Connect to Gmail" step
- **Consistent with parent repo**: Matches Zero/0.email approach

### Technical Benefits
- **Simplified state management**: No need to track intermediate auth states
- **Reduced CORS complexity**: Single domain for OAuth flow
- **Better error handling**: Centralized OAuth error management
- **Improved security**: PKCE implementation and secure session cookies

### Maintenance Benefits
- **Single OAuth client**: Only one Google OAuth app needed
- **Unified codebase**: Consistent authentication patterns
- **Easier debugging**: Single OAuth flow to troubleshoot

## Production Considerations

### Google OAuth Verification
- The unified flow uses "restricted" scopes (Gmail)
- **Requirement**: Complete Google OAuth verification before making site public
- **Timeline**: 6-8 weeks for verification process
- **Alternative**: Use test users during development

### Refresh Token Storage
- Current implementation logs refresh tokens (development only)
- **Production requirement**: Implement secure storage (Cloudflare KV, D1, or external database)
- **Security**: Never store refresh tokens in client-side storage

### Environment Variables
Ensure these are set in Cloudflare Workers:
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `JWT_SECRET`
- `VITE_PUBLIC_APP_URL`
- `VITE_PUBLIC_BACKEND_URL`

## Testing

### Local Development
1. Set up Google OAuth app with test users
2. Configure redirect URI: `http://localhost:8787/auth/google/callback`
3. Test complete flow from sign-in to inbox

### Production Deployment
1. Update Google OAuth app with production redirect URI
2. Deploy backend to Cloudflare Workers
3. Test with production domain

## Migration Notes

### Breaking Changes
- Old social sign-in endpoints removed
- Session storage changed from localStorage to cookies
- OAuth flow now requires Gmail scopes upfront

### Backward Compatibility
- `signIn.social()` still works but redirects to unified flow
- Session verification updated to use cookies
- Frontend components updated to handle new flow

## Next Steps

1. **Deploy to production** and test with real users
2. **Implement secure refresh token storage** (Cloudflare KV/D1)
3. **Complete Google OAuth verification** for public release
4. **Monitor OAuth success rates** and user onboarding metrics
5. **Consider adding Microsoft OAuth** using same unified pattern 