# Deployment Troubleshooting Guide

## Problem Summary
You're getting 500 errors from tRPC endpoints with the error message: "Unexpected token 'I', "Internal S"... is not valid JSON". This indicates that your server is returning HTML error pages instead of proper JSON responses.

## Root Cause Analysis

### 1. Authentication Issues
- **Problem**: `privateProcedure` requires `ctx.sessionUser` to be defined, but it's not being set properly
- **Symptoms**: All tRPC calls show `input: undefined` and fail immediately
- **Impact**: Users can't access any protected endpoints

### 2. Error Handling Issues
- **Problem**: Unhandled exceptions result in generic 500 HTML responses instead of JSON
- **Symptoms**: tRPC client tries to parse HTML as JSON and fails
- **Impact**: Poor error messages and debugging difficulty

### 3. Environment Variable Issues
- **Problem**: Missing required environment variables or Durable Object bindings
- **Symptoms**: Runtime exceptions during initialization
- **Impact**: Worker fails to start or handle requests properly

## Solutions Implemented

### 1. Enhanced Error Handling
✅ **Added global error handler** in `main.ts` to return JSON instead of HTML
✅ **Improved tRPC error messages** with better logging
✅ **Added auth check endpoint** for debugging authentication

### 2. Better Logging
✅ **Added comprehensive logging** throughout the authentication flow
✅ **Created debug endpoints** to test authentication status
✅ **Enhanced error reporting** with detailed context

## Testing Your Deployment

### Step 1: Run the Debug Script
```bash
cd apps/server
node debug-deployment.js
```

This will test:
- Health endpoint (should work)
- Auth check without session (should return 401 JSON)
- tRPC endpoints without session (should return JSON errors)
- Invalid session tokens (should handle gracefully)

### Step 2: Check Cloudflare Worker Logs
```bash
# Using wrangler CLI
wrangler tail --format=pretty

# Or check the Cloudflare dashboard
# Go to Workers & Pages > Your Worker > Logs
```

Look for:
- Authentication middleware logs
- tRPC context creation logs
- Error stack traces
- Missing environment variables

### Step 3: Verify Environment Variables
Ensure these are set in your Cloudflare Worker:
- `JWT_SECRET` - Required for JWT verification
- `ZERO_DB` - Durable Object binding
- `ZERO_AGENT` - Durable Object binding
- `ZERO_DRIVER` - Durable Object binding

## Expected Behavior After Fixes

### ✅ Working Endpoints
- `/health` - Returns 200 OK with JSON
- `/api/auth/check` - Returns 401 JSON when no session
- `/api/trpc/*` - Returns proper JSON errors for auth failures

### ❌ Still Broken
- Any endpoint requiring authentication without valid session
- Endpoints with missing environment variables
- Endpoints with Durable Object binding issues

## Debugging Steps

### 1. Test Basic Functionality
```bash
curl https://your-worker.workers.dev/health
```
Should return: `{"status":"ok","timestamp":"...","cors":"enabled"}`

### 2. Test Authentication
```bash
curl https://your-worker.workers.dev/api/auth/check
```
Should return: `{"authenticated":false,"message":"No session found"}`

### 3. Test tRPC Error Handling
```bash
curl https://your-worker.workers.dev/api/trpc/labels.list
```
Should return JSON error, not HTML

### 4. Check for Missing Bindings
Look for these errors in logs:
- `env.ZERO_DB is not defined`
- `env.JWT_SECRET is not defined`
- `env.ZERO_AGENT is not defined`

## Common Issues and Solutions

### Issue: Still Getting HTML Responses
**Cause**: Error handling not working properly
**Solution**: 
1. Check that the global error handler is being called
2. Verify the Worker is using the updated code
3. Check for syntax errors preventing the error handler from loading

### Issue: Authentication Always Fails
**Cause**: Session token not being passed or invalid
**Solution**:
1. Check browser network tab for `X-Session-Token` header
2. Verify JWT_SECRET is set correctly
3. Check if session token is expired
4. Verify the client is sending the correct headers

### Issue: Durable Objects Not Working
**Cause**: Missing or incorrect bindings
**Solution**:
1. Check `wrangler.toml` for Durable Object bindings
2. Verify the bindings are deployed
3. Check for binding name mismatches

### Issue: Environment Variables Missing
**Cause**: Variables not set in Cloudflare dashboard
**Solution**:
1. Go to Workers & Pages > Your Worker > Settings > Variables
2. Add missing environment variables
3. Redeploy if needed

## Next Steps

1. **Deploy the fixes** and run the debug script
2. **Check Worker logs** for detailed error messages
3. **Test authentication flow** with a valid session
4. **Verify all environment variables** are set correctly
5. **Test with a real user session** to ensure full functionality

## Monitoring

After deployment, monitor:
- Error rates in Cloudflare dashboard
- Authentication success/failure rates
- Response times for tRPC endpoints
- User session creation and validation

## Support

If issues persist:
1. Share the output of the debug script
2. Share relevant Worker logs
3. Check if all environment variables are set
4. Verify Durable Object bindings are correct 