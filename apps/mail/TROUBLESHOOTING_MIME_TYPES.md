# MIME Type Issues Troubleshooting Guide

## Problem
JavaScript modules fail to load with error: "Failed to load module script: Expected a JavaScript-or-Wasm module script but the server responded with a MIME type of 'text/html'"

## Root Cause
The development server is serving JavaScript files with incorrect MIME types (`text/html` instead of `application/javascript`).

## Solutions

### Solution 1: Use Enhanced Proxy Server (Recommended)
```bash
# First build the project
npm run build

# Then start the enhanced proxy server
npm run start:static
```

### Solution 2: Use Enhanced Development Server (Recommended for React Router)
```bash
npm run dev:enhanced
```

### Solution 3: Use Custom Development Server
```bash
npm run dev:custom
```

### Solution 4: Use Fixed Vite Configuration
```bash
npm run dev:fixed
```

### Solution 4: Clear Cache and Restart
```bash
# Clear node modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Clear browser cache
# In Chrome: Ctrl+Shift+Delete -> Clear browsing data

# Restart development server
npm run dev
```

## Prevention

### 1. Always Use Proper MIME Types
The enhanced proxy server automatically sets correct MIME types:
- `.js` files → `application/javascript`
- `.mjs` files → `application/javascript`
- `.css` files → `text/css`
- `.json` files → `application/json`

### 2. Development Workflow
1. Use `npm run dev:enhanced` for development (recommended)
2. Use `npm run dev:custom` for alternative development server
3. Use `npm run start:static` for testing production build
4. Clear browser cache if issues persist

### 3. Browser Cache Issues
If you still see MIME type errors:
1. Hard refresh: `Ctrl+F5` (Windows) or `Cmd+Shift+R` (Mac)
2. Clear browser cache completely
3. Try incognito/private browsing mode

## Debugging

### Check MIME Types
```bash
# Check what MIME type is being served
curl -I http://localhost:3000/assets/your-file.js
```

### Expected Response Headers
```
Content-Type: application/javascript; charset=utf-8
```

### Common Issues
1. **Browser Cache**: Old cached files with wrong MIME types
2. **Development Server**: React Router dev server not setting proper headers
3. **Proxy Configuration**: Missing MIME type middleware
4. **Build Output**: Incorrect file extensions or paths

## File Structure
```
apps/mail/
├── dist/                    # Built files
│   ├── assets/
│   │   ├── js/             # JavaScript files
│   │   └── css/            # CSS files
│   └── index.html          # Main HTML file
├── proxy.js                # Enhanced proxy server
├── dev-server.js           # Custom development server
└── vite.config.ts          # Vite configuration
```

## Environment Variables
Make sure these are set correctly:
```bash
VITE_PUBLIC_APP_URL=http://localhost:3000
VITE_PUBLIC_BACKEND_URL=https://pitext-mail.prabhatravib.workers.dev
```

## Support
If issues persist:
1. Check browser console for specific error messages
2. Verify file paths in network tab
3. Ensure all dependencies are installed
4. Try different browsers to isolate the issue 