#!/bin/bash

# Deployment script with fixes for common issues
set -e

echo "🚀 Starting deployment with fixes..."

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    echo "❌ Wrangler is not installed. Please install it first:"
    echo "npm install -g wrangler"
    exit 1
fi

# Check if we're in the right directory
if [ ! -f "wrangler.jsonc" ]; then
    echo "❌ wrangler.jsonc not found. Please run this script from the server directory."
    exit 1
fi

echo "📋 Checking environment variables..."

# Check for required environment variables
if [ -z "$BETTER_AUTH_SECRET" ]; then
    echo "⚠️  BETTER_AUTH_SECRET not set. Generating one..."
    export BETTER_AUTH_SECRET=$(openssl rand -hex 32)
    echo "Generated BETTER_AUTH_SECRET: $BETTER_AUTH_SECRET"
fi

if [ -z "$REDIS_URL" ] || [ -z "$REDIS_TOKEN" ]; then
    echo "⚠️  Redis configuration missing. Using fallback mode."
fi

echo "🔧 Applying database migrations..."
wrangler d1 migrations apply zero-email-demo --local=false

echo "📦 Building the application..."
pnpm build

echo "🚀 Deploying to Cloudflare Workers..."
wrangler deploy

echo "✅ Deployment complete!"
echo ""
echo "🔧 If you're still experiencing issues:"
echo "1. Check the Cloudflare Workers logs: wrangler tail"
echo "2. Verify your environment variables in wrangler.jsonc"
echo "3. Make sure your D1 database is properly configured"
echo "4. Check Redis configuration if you're using it"
echo ""
echo "📊 For large inboxes (90k+ emails):"
echo "- Use the 'Load Recent' button to load only recent emails"
echo "- The app now loads 100 emails per page instead of 20"
echo "- Added timeout handling to prevent hanging requests" 