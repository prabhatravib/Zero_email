# Google OAuth Setup Guide

## Overview
This guide helps you set up Google OAuth for the Zero Email application, enabling Gmail integration and user authentication.

## Step 1: Google Cloud Console Setup

### 1.1 Create a New Project
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select an existing one
3. Enable billing (required for API usage)

### 1.2 Enable Required APIs
Enable these APIs in your project:
- [People API](https://console.cloud.google.com/apis/library/people.googleapis.com)
- [Gmail API](https://console.cloud.google.com/apis/library/gmail.googleapis.com)
- [Google OAuth2 API](https://console.cloud.google.com/apis/library/oauth2.googleapis.com)

### 1.3 Create OAuth 2.0 Credentials
1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth 2.0 Client IDs"
3. Choose "Web application" as the application type
4. Add authorized redirect URIs:
   - **Development**: `http://localhost:8787/api/auth/callback/google`
   - **Production**: `https://infflow-api-production.prabhatravib.workers.dev/api/auth/callback/google`
5. Note down the Client ID and Client Secret

### 1.4 Configure OAuth Consent Screen
1. Go to "APIs & Services" > "OAuth consent screen"
2. Choose "External" user type
3. Fill in required information:
   - App name: "Zero Email"
   - User support email: Your email
   - Developer contact information: Your email
4. Add scopes:
   - `https://mail.google.com/`
   - `https://www.googleapis.com/auth/gmail.modify`
   - `https://www.googleapis.com/auth/userinfo.profile`
   - `https://www.googleapis.com/auth/userinfo.email`
5. Add test users (your email address)

## Step 2: Environment Configuration

### 2.1 Local Development
Add these to your `.env` file:
```bash
GOOGLE_CLIENT_ID=your_client_id_here
GOOGLE_CLIENT_SECRET=your_client_secret_here
```

### 2.2 Wrangler Configuration
Make sure your `wrangler.jsonc` has the correct backend URL:

```json
{
  "vars": {
    "VITE_PUBLIC_BACKEND_URL": "https://infflow-api-production.prabhatravib.workers.dev"
  }
}
```

## Step 3: App Verification (Optional but Recommended)

### 3.1 When Verification is Required
Google may require app verification if:
- Your app requests sensitive scopes (like Gmail access)
- You have more than 100 users
- You're accessing user data

### 3.2 Verification Process
1. In OAuth consent screen, click "Submit for verification"
2. Provide detailed information about:
   - How you use the requested scopes
   - Your app's privacy policy
   - Terms of service
   - Data handling practices

### 3.3 Alternative: Use Test Users
While waiting for verification, you can:
1. Add test users in the OAuth consent screen
2. These users can access your app without verification
3. Add up to 100 test users

## Step 4: Testing

### 4.1 Test the OAuth Flow
1. Deploy your application
2. Try to sign in with Google
3. Verify the redirect works correctly
4. Check that you receive the expected scopes

### 4.2 Common Issues and Solutions

#### Issue: "Error 400: invalid_request"
**Solution**: Ensure redirect URI exactly matches what's configured in Google Cloud Console

#### Issue: "Error 403: access_denied"
**Solution**: 
- Check if your app is in testing mode
- Add your email as a test user
- Ensure all required scopes are added

#### Issue: "Error 401: invalid_client"
**Solution**: 
- Verify Client ID and Client Secret are correct
- Check that environment variables are properly set

## Step 5: Security Best Practices

### 5.1 Environment Variables
- Never commit Client Secret to version control
- Use environment variables or secret management
- Rotate secrets regularly

### 5.2 HTTPS Requirements
- Always use HTTPS in production
- Google requires HTTPS for OAuth flows
- Ensure your domain has valid SSL certificates

### 5.3 Scope Minimization
- Only request scopes you actually need
- Consider requesting scopes incrementally
- Document why each scope is needed

## Troubleshooting

### Check Redirect URI Format
Ensure your redirect URI follows this exact format:
```
https://your-domain.com/api/auth/callback/google
```

### Verify Environment Variables
Check that these are set correctly:
```bash
echo $GOOGLE_CLIENT_ID
echo $GOOGLE_CLIENT_SECRET
echo $VITE_PUBLIC_BACKEND_URL
```

### Test with curl
You can test the OAuth endpoint directly:
```bash
curl -X GET "https://your-backend-url.com/api/auth/google"
```

## Troubleshooting OAuth Redirect URI Issues

### Common Problem: Spaces in Redirect URI
If you're getting "Error 400: invalid_request" with spaces in the redirect URI, follow these steps:

1. **Check Google Cloud Console Configuration**
   - Go to Google Cloud Console > APIs & Services > Credentials
   - Edit your OAuth 2.0 Client ID
   - Verify the authorized redirect URI is exactly:
     ```
     https://infflow-api-production.prabhatravib.workers.dev/api/auth/callback/google
     ```
   - Make sure there are NO trailing spaces

2. **Check Environment Variables**
   - Verify `VITE_PUBLIC_BACKEND_URL` has no trailing spaces
   - The value should be exactly:
     ```
     https://infflow-api-production.prabhatravib.workers.dev
     ```

3. **Deploy and Test**
   - After making changes, redeploy your application
   - Check the server logs for debugging information
   - The enhanced logging will show you exactly what redirect URI is being generated

4. **Manual Verification**
   - Open your browser's developer tools
   - Go to the Network tab
   - Try to sign in with Google
   - Look for the OAuth request and verify the redirect_uri parameter

### Debugging Steps
1. Check the server logs for the debugging output we added
2. Look for any warnings about spaces or problematic characters
3. Verify the final redirect URI matches exactly what's in Google Cloud Console
4. If there are still issues, check the raw environment variable values in the logs 