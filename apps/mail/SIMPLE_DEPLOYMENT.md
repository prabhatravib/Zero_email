# Simple Deployment Guide (No Backend API)

## Overview
This is a simplified version of the Zero Email application that works without a backend API. All "Get Started" buttons now redirect to a contact form instead of trying to authenticate users.

## What's Changed
- ✅ Removed all backend API dependencies
- ✅ Updated all "Get Started" buttons to redirect to contact form
- ✅ Simplified authentication flow
- ✅ Removed unused imports and dependencies

## Deployment Steps

### 1. Build the Application
```bash
# Install dependencies
pnpm install --frozen-lockfile

# Build the application
cd apps/mail
WRANGLER_ENV=render pnpm run build
```

### 2. Deploy to Render
1. Go to your Render dashboard
2. Create a new Web Service
3. Connect your GitHub repository
4. Use these settings:
   - **Build Command**: `pnpm install --frozen-lockfile && pnpm --filter @zero/mail run build`
   - **Start Command**: `cd apps/mail && NODE_ENV=production pnpm run start:prod`
   - **Environment**: Docker

### 3. Environment Variables
Set these environment variables in Render:
- `NODE_ENV=production`
- `PORT=10000`
- `WRANGLER_ENV=render`

## How It Works
- The application is now a static landing page

- No backend API is required
- Users can contact you through the Cal.com link for Gmail integration setup

## Customization
If you want to change where the "Get Started" buttons redirect:
1. Update the URL in these files:
   - `apps/mail/components/navigation.tsx`
   - `apps/mail/components/home/HomeContent.tsx`
   - `apps/mail/components/pricing/pricing-card.tsx`
   - `apps/mail/components/pricing/comparision.tsx`
   - `apps/mail/components/home/footer.tsx`



## Next Steps
Once deployed, users can:
1. Visit your landing page
2. Click "Get Started" to contact you
3. You can then help them set up Gmail integration manually

This approach keeps things simple while still providing a professional landing page for your email service. 