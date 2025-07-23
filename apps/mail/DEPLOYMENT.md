# Deployment Guide

## Overview

This application can be deployed in two modes:
1. **Static Server Mode** (Recommended for Render/Production) - Serves the built static files
2. **Wrangler Mode** (Development) - Uses Cloudflare Workers for development

## Recent Fixes

### Issue Resolved
The deployment was failing with the error:
```
You have specified the environment "local", but are using a redirected configuration, produced by a build tool such as Vite.
```

### Root Cause
- Wrangler was trying to use the "local" environment in production
- Vite's Cloudflare plugin was creating a redirected configuration that conflicted with environment settings
- The build process wasn't properly configured for production deployment

### Solution Implemented
1. **Updated `start.js`** - Now automatically detects production environment and uses static server
2. **Updated `vite.config.ts`** - Properly configures Cloudflare environment during build
3. **Updated `package.json`** - Added production start script and improved build command
4. **Updated `Dockerfile`** - Uses production start command and sets proper environment variables
5. **Updated `render.yaml`** - Uses the new production start command

## Deployment Commands

### For Render Deployment
The application now uses these commands in Render:

**Build Command:**
```bash
pnpm install --frozen-lockfile && pnpm --filter @zero/mail run build
```

**Start Command:**
```bash
cd apps/mail && pnpm run start:prod
```

### Manual Deployment
```bash
# Install dependencies
pnpm install --frozen-lockfile

# Build the application
cd apps/mail
WRANGLER_ENV=render pnpm run build

# Start in production mode
NODE_ENV=production pnpm run start:prod
```

## Environment Variables

### Required for Production
- `NODE_ENV=production`
- `PORT=10000` (or your preferred port)
- `WRANGLER_ENV=render`

### Optional
- `USE_STATIC_SERVER=true` - Force static server mode

## File Changes Summary

1. **`start.js`** - Added automatic environment detection and static server fallback
2. **`vite.config.ts`** - Added proper Cloudflare environment configuration
3. **`package.json`** - Added `start:prod` script and improved build command
4. **`Dockerfile`** - Updated to use production start command
5. **`render.yaml`** - Updated build and start commands
6. **`deploy.sh`** - Simplified deployment script

## Troubleshooting

### If deployment still fails:
1. Check that the build directory exists: `apps/mail/build/client/`
2. Verify environment variables are set correctly
3. Check logs for any missing dependencies
4. Ensure the port is not already in use

### For local development:
```bash
cd apps/mail
pnpm run dev
```

### For production testing locally:
```bash
cd apps/mail
pnpm run build
pnpm run start:prod
```

## Architecture

The application now uses a hybrid approach:
- **Development**: Uses Wrangler for full Cloudflare Workers functionality
- **Production**: Uses static file serving for better reliability and performance

This approach eliminates the Wrangler environment conflicts while maintaining full functionality in production. 