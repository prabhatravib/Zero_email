# Gmail Integration Setup Guide

## Quick Setup for POC

This guide shows you how to set up Gmail integration using Google's JavaScript SDK (no backend required).

## Step 1: Get Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing one
3. Enable the Gmail API:
   - Go to "APIs & Services" > "Library"
   - Search for "Gmail API" and enable it
4. Create OAuth 2.0 credentials:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth 2.0 Client IDs"
   - Choose "Web application"
   - Add authorized JavaScript origins:
     - `http://localhost:3000` (for development)
     - `https://your-domain.com` (for production)
   - Add authorized redirect URIs:
     - `http://localhost:3000` (for development)
     - `https://your-domain.com` (for production)

## Step 2: Set Environment Variable

Create a `.env` file in the `apps/mail` directory:

```env
VITE_GOOGLE_CLIENT_ID=your_google_client_id_here
```

Replace `your_google_client_id_here` with the Client ID from Google Cloud Console.

## Step 3: Test the Integration

1. Start the development server:
   ```bash
   cd apps/mail
   pnpm dev
   ```

2. Visit `http://localhost:3000/gmail-demo`

3. Click "Sign in with Google" and authorize the app

4. You should see your Gmail inbox!

## Features Included

- ✅ Google OAuth authentication
- ✅ View Gmail inbox
- ✅ Read email details
- ✅ Send emails
- ✅ No backend required
- ✅ Works in browser

## Limitations (POC Stage)

- ❌ No persistent login (need to re-authenticate)
- ❌ Tokens stored in browser (not secure for production)
- ❌ Limited to basic Gmail operations
- ❌ No user management

## Next Steps for Production

When ready for production, consider:
1. Adding a backend for secure token storage
2. Implementing proper session management
3. Adding more Gmail features (labels, search, etc.)
4. Improving security and user experience

## Troubleshooting

### "Failed to load Google API"
- Check your internet connection
- Verify the Google API script is loading

### "Authentication Error"
- Verify your Google Client ID is correct
- Check that your domain is in authorized origins
- Make sure Gmail API is enabled in Google Cloud Console

### "No emails found"
- Check that you granted Gmail access permissions
- Try refreshing the page and signing in again 