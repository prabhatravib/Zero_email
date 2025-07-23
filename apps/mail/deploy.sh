#!/bin/bash

# Deployment script for Zero Email on Render

echo "🚀 Starting deployment process..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script from the apps/mail directory."
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
pnpm install

# Build the application
echo "🔨 Building application..."
pnpm run build

# Check if build was successful
if [ ! -d "build/client" ]; then
    echo "❌ Error: Build failed. build/client directory not found."
    exit 1
fi

echo "✅ Build completed successfully!"

# Check if we're running on Render
if [ -n "$RENDER" ]; then
    echo "🌐 Running on Render..."
    
    # Use the appropriate start command based on environment
    if [ "$NODE_ENV" = "production" ]; then
        echo "🚀 Starting production server..."
        node start.js
    else
        echo "🚀 Starting development server..."
        node start.js
    fi
else
    echo "💻 Running locally..."
    echo "🚀 Starting development server..."
    node start.js
fi 