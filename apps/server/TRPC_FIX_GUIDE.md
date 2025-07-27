# tRPC Fix Guide

## Problem
The tRPC endpoints were returning 500 errors with the message "Cannot read properties of undefined (reading '_config')" because `@hono/trpc-server` doesn't support async functions for the router property.

## Root Cause
The original code was passing an async function to the router property:
```typescript
router: async () => {
    const { appRouter } = await import('../trpc');
    return appRouter;
}
```

But `@hono/trpc-server` expects a resolved tRPC router instance, not a promise.

## Fix Applied

### 1. Fixed Router Loading
**File**: `apps/server/src/routes/trpc.ts`

**Before**:
```typescript
router: async () => {
    const { appRouter } = await import('../trpc');
    return appRouter;
}
```

**After**:
```typescript
// Eagerly load the router module
const { appRouter } = await import('../trpc');

// Pass the resolved router instance
router: appRouter
```

### 2. Fixed Context Access
**File**: `apps/server/src/routes/trpc.ts`

**Before**:
```typescript
const sessionUser = c.get('sessionUser');
```

**After**:
```typescript
const sessionUser = c.var.sessionUser;
```

## Testing the Fix

### Step 1: Deploy
```bash
cd apps/server
wrangler deploy
```

### Step 2: Test
```bash
node test-fix.js
```

### Expected Results
- Health endpoint: 200 OK
- tRPC endpoints without session: 401 JSON error (not 500)

### Step 3: Check Logs
```bash
wrangler tail --format=pretty
```

Look for:
- "🔍 tRPC - Router loaded successfully"
- "✅ tRPC routes registered successfully"
- No more "_config" errors

## What This Fixes

✅ **500 Errors**: tRPC endpoints now return proper JSON errors instead of 500s
✅ **Client Deserialization**: tRPC client can now parse responses correctly
✅ **Authentication**: Session tokens are properly passed to tRPC context
✅ **Error Messages**: Clear, structured error responses

## Verification

After deployment, your client should:
1. Stop showing "Unable to transform response from server"
2. Receive proper JSON error responses for unauthorized requests
3. Successfully authenticate when valid session tokens are provided

## Next Steps

1. Deploy the fix
2. Test with the provided script
3. Verify client-side functionality
4. Check that authenticated requests work properly 