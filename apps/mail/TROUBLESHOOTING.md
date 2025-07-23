# Troubleshooting Guide for Zero Email Deployment

## Current Issues from Logs

### 1. Port Binding Issue
**Problem**: App running on `localhost:3000` but Render expects `0.0.0.0:10000`

**Solution**: 
- ✅ Updated `start.js` to bind to `0.0.0.0`
- ✅ Updated port to use `$PORT` environment variable (10000)
- ✅ Updated all configuration files to use port 10000

### 2. Cloudflare Workers Compatibility
**Problem**: Compatibility date warning for "2025-06-27"

**Solution**:
- ✅ Updated `wrangler.jsonc` to use "2025-06-17"
- ✅ This matches the installed Wrangler version

### 3. Fetch API Error
**Problem**: `Fetch API cannot load: /`

**Solution**:
- This might be related to the app trying to fetch from itself
- The static server approach should resolve this

## Deployment Options

### Option 1: Try the Docker Approach First
1. Use the `render.yaml` file
2. This uses the Dockerfile which properly sets up the environment
3. Runs Wrangler with correct host binding

### Option 2: Static File Server (Fallback)
If Docker doesn't work:
1. Use `render-static.yaml`
2. This serves static files using Express.js
3. Simpler approach that should work reliably

## Environment Variables Check

Your current environment variables look correct:
- ✅ `PORT=10000` matches our configuration
- ✅ `VITE_PUBLIC_BACKEND_URL` and `VITE_PUBLIC_APP_URL` are set
- ✅ All Google OAuth variables are configured (check your Render dashboard)
- ✅ Authentication secrets are set (check your Render dashboard)

## Next Steps

1. **Try the Docker deployment first**:
   - Use `render.yaml` in your Render dashboard
   - This should resolve the port binding issue

2. **If Docker fails, use static server**:
   - Use `render-static.yaml` instead
   - This is a more reliable approach for static sites

3. **Monitor the logs**:
   - Check if the app starts successfully
   - Look for any new error messages

## Common Issues and Solutions

### Issue: "No open ports detected"
**Cause**: App not binding to `0.0.0.0`
**Solution**: ✅ Fixed in `start.js`

### Issue: "Compatibility date" warning
**Cause**: Wrangler version mismatch
**Solution**: ✅ Updated to "2025-06-17"

### Issue: Large bundle sizes
**Cause**: Some chunks >500KB
**Solution**: This is a warning, not an error. The app should still work.

## Testing Locally

To test the deployment locally:

```bash
cd apps/mail
PORT=10000 node start.js
```

This should start the app on `http://localhost:10000` and bind to `0.0.0.0:10000`. 