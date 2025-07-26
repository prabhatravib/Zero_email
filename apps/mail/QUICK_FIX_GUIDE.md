# Quick Fix Guide - MIME Type Issues

## Immediate Solution

**Stop using `npm run dev` and use one of these commands instead:**

### Option 1: Enhanced Development Server (Recommended)
```bash
npm run dev:enhanced
```
This combines React Router dev server with MIME type fixes.

### Option 2: Custom Development Server
```bash
npm run dev:custom
```
Alternative development server with MIME type fixes.

### Option 3: Production Build Testing
```bash
npm run build
npm run start:static
```
Test the production build with MIME type fixes.

## Why This Happens

The standard `npm run dev` command uses React Router's dev server which doesn't set proper MIME types for JavaScript modules. Modern browsers strictly enforce MIME type checking for ES modules.

## What Each Command Does

- **`npm run dev:enhanced`**: Starts React Router dev server + proxy with MIME type fixes
- **`npm run dev:custom`**: Custom Vite-based development server
- **`npm run start:static`**: Serves production build with MIME type fixes

## Browser Cache Issues

If you still see MIME type errors:
1. **Hard refresh**: `Ctrl+F5` (Windows) or `Cmd+Shift+R` (Mac)
2. **Clear browser cache**: Complete cache clear
3. **Try incognito mode**: Test in private browsing

## Verification

After using the correct command, you should see:
- No MIME type errors in browser console
- JavaScript modules load correctly
- Application works as expected

## Port Information

- **Enhanced dev server**: `http://localhost:10000`
- **Custom dev server**: `http://localhost:3000`
- **Static server**: `http://localhost:10000`

## Quick Commands

```bash
# Stop all Node processes (if needed)
taskkill /f /im node.exe

# Start enhanced development server
npm run dev:enhanced

# Test MIME types
npm run test:mime
``` 