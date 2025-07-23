#!/bin/bash

# Exit on any error
set -e

echo "🚀 Starting deployment..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script from the project root."
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
pnpm install --frozen-lockfile

# Build the application
echo "🔨 Building application..."
cd apps/mail
WRANGLER_ENV=render pnpm run build

# Check if build was successful
if [ ! -d "build/client" ]; then
    echo "❌ Error: Build failed - build/client directory not found"
    exit 1
fi

echo "✅ Build completed successfully!"

# Start the application
echo "🚀 Starting application..."
NODE_ENV=production pnpm run start:prod 