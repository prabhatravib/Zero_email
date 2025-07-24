#!/bin/bash

echo "🚀 Deploying Authentication Fixes..."

# Build the application
echo "📦 Building application..."
cd apps/mail
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed!"
    exit 1
fi

echo "✅ Build completed successfully!"

# Check if we're on Render
if [ -n "$RENDER" ]; then
    echo "🌐 Detected Render environment"
    echo "📋 Deployment Summary:"
    echo "   - Fixed duplicate session cookies"
    echo "   - Added proper session token handling in tRPC client"
    echo "   - Fixed WebSocket connection timing"
    echo "   - Improved authentication flow"
    echo ""
    echo "🔧 Key Changes:"
    echo "   1. Session cookies now cleared before setting new ones"
    echo "   2. tRPC client sends session tokens in headers"
    echo "   3. WebSocket only connects after authentication"
    echo "   4. Better error handling in auth callback"
    echo ""
    echo "✅ Ready for deployment!"
else
    echo "🔧 Local development mode"
    echo "To deploy to Render:"
    echo "1. Push these changes to your repository"
    echo "2. Render will automatically rebuild and deploy"
    echo "3. Monitor the logs for authentication issues"
fi

echo ""
echo "📊 Expected Results:"
echo "   - No more duplicate session cookies"
echo "   - tRPC API calls should return 200 instead of 400"
echo "   - WebSocket connections should work after login"
echo "   - Users should stay logged in after authentication"
echo ""
echo "🎯 Next Steps:"
echo "1. Deploy to Render"
echo "2. Test the authentication flow"
echo "3. Check the browser console for any remaining errors"
echo "4. Monitor the application logs"

echo "✨ Deployment script completed!"