#!/bin/bash

# Quick D1 deployment script for POC stage
set -e

echo "🚀 Quick D1 deployment for POC..."

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    echo "❌ Wrangler is not installed. Please install it first:"
    echo "npm install -g wrangler"
    exit 1
fi

echo "📋 Applying D1 schema..."
# Apply the D1 migration directly
wrangler d1 execute zero-email-demo --file=./src/db/migrations-d1.sql --local=false

echo "📦 Building the application..."
pnpm build

echo "🚀 Deploying to Cloudflare Workers..."
wrangler deploy

echo "✅ Deployment complete!"
echo ""
echo "🔧 If you're still experiencing issues:"
echo "1. Check the Cloudflare Workers logs: wrangler tail"
echo "2. Make sure your D1 database is properly configured"
echo "3. Try refreshing the page and reconnecting your email account" 