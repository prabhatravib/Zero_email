# API Proxy Implementation

## Overview

This proxy solves CORS issues by routing all API calls through the Render service instead of directly to the Cloudflare Workers backend.

## How it works

1. **Frontend** makes requests to `https://pitext-email.onrender.com/api/*`
2. **Proxy** forwards requests to `https://pitext-mail.prabhatravib.workers.dev/api/*`
3. **Same-origin policy** is satisfied, eliminating CORS issues

## Files

- `proxy.js` - Express proxy server
- `start.js` - Updated to run proxy instead of wrangler
- `test-proxy.js` - Test script for local development

## Configuration Changes

### Frontend (apps/mail/wrangler.jsonc)
```json
"render": {
  "vars": {
    "VITE_PUBLIC_BACKEND_URL": "https://pitext-email.onrender.com",
    "VITE_PUBLIC_APP_URL": "https://pitext-email.onrender.com"
  }
}
```

### Dependencies Added
- `express: ^4.18.2`
- `node-fetch: ^3.3.2`

## Deployment

1. Commit and push changes
2. Render automatically redeploys
3. Proxy starts on port 10000
4. Health check available at `/health`

## Testing

```bash
# Start proxy locally
cd apps/server
node proxy.js

# Test in another terminal
node test-proxy.js
```

## Benefits

- ✅ Eliminates CORS issues
- ✅ No infrastructure changes needed
- ✅ Minimal code changes (~40 lines)
- ✅ Same-origin requests
- ✅ Automatic deployment via Render 