# Google OAuth Setup Guide

## Current Issue
Your application is failing to authenticate because Google OAuth credentials are not properly configured. The server will now fail hard with clear error messages when credentials are missing.

## Step-by-Step Setup

### 1. Create Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Click "Select a project" → "New Project"
3. Name your project (e.g., "Zero Email App")
4. Click "Create"

### 2. Enable Required APIs
1. In your project, go to "APIs & Services" → "Library"
2. Search for and enable these APIs:
   - **Gmail API**
   - **Google+ API** (if available)
   - **Google OAuth2 API**

### 3. Create OAuth 2.0 Credentials
1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "OAuth 2.0 Client IDs"
3. Choose "Web application"
4. Set the following:
   - **Name**: Zero Email App
   - **Authorized JavaScript origins**:
     - `https://pitext-email.onrender.com`
     - `https://pitext-mail.prabhatravib.workers.dev`
   - **Authorized redirect URIs**:
     - `https://pitext-mail.prabhatravib.workers.dev/auth/callback/google`
     - `https://pitext-mail.prabhatravib.workers.dev/api/auth/callback/google`

### 4. Get Your Credentials
1. After creating, you'll get:
   - **Client ID** (looks like: `123456789-abcdefghijklmnop.apps.googleusercontent.com`)
   - **Client Secret** (looks like: `GOCSPX-abcdefghijklmnopqrstuvwxyz`)

### 5. Update Environment Variables
You need to update your Cloudflare Workers environment variables:

1. Go to your Cloudflare Workers dashboard
2. Find your worker: `pitext-mail.prabhatravib.workers.dev`
3. Go to "Settings" → "Variables"
4. Update these variables:
   - `GOOGLE_CLIENT_ID`: Your actual Client ID
   - `GOOGLE_CLIENT_SECRET`: Your actual Client Secret

### 6. Test the Setup
1. Deploy your updated configuration
2. Try clicking "Get Started" on your app
3. You should now be redirected to Google's OAuth consent screen

## Troubleshooting

### If you still get 500 errors:
1. Check that your redirect URI exactly matches: `https://pitext-mail.prabhatravib.workers.dev/auth/callback/google`
2. Verify your Client ID and Secret are correct
3. Make sure the Gmail API is enabled

### If you get 404 errors:
1. Check that your worker is deployed and running
2. Verify the authentication endpoints are accessible

### Common Issues:
- **Redirect URI mismatch**: The URI in Google Console must exactly match your callback URL
- **Missing APIs**: Make sure Gmail API is enabled
- **Wrong credentials**: Double-check your Client ID and Secret

## Verification
After setup, you can verify the configuration by visiting:
- `https://pitext-mail.prabhatravib.workers.dev/api/public/config-check`

This should show that Google credentials are properly configured.

## Security Notes
- Never commit your actual Client Secret to version control
- Use environment variables for all sensitive credentials
- Regularly rotate your OAuth credentials

## Next Steps
Once Google OAuth is working:
1. Test the full authentication flow
2. Set up additional providers if needed (Microsoft, etc.)
3. Configure the Autumn service for additional features 