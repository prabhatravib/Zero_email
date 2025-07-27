#!/bin/bash

# Deployment and Testing Script
# This script deploys the server and runs tests to verify the fixes

set -e

echo "🚀 Starting deployment and testing process..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    print_error "wrangler CLI is not installed. Please install it first:"
    echo "npm install -g wrangler"
    exit 1
fi

# Check if we're in the right directory
if [ ! -f "wrangler.toml" ]; then
    print_error "wrangler.toml not found. Please run this script from the server directory."
    exit 1
fi

print_status "Deploying to Cloudflare Workers..."

# Deploy the worker
if wrangler deploy; then
    print_success "Deployment completed successfully!"
else
    print_error "Deployment failed!"
    exit 1
fi

# Wait a moment for deployment to propagate
print_status "Waiting for deployment to propagate..."
sleep 10

# Get the worker URL from wrangler.toml or use default
WORKER_URL=$(grep -o 'https://[^.]*\.workers\.dev' wrangler.toml 2>/dev/null || echo "https://pitext-mail.prabhatravib.workers.dev")

print_status "Testing deployment at: $WORKER_URL"

# Test the health endpoint
print_status "Testing health endpoint..."
HEALTH_RESPONSE=$(curl -s -w "%{http_code}" "$WORKER_URL/health" || echo "000")
HEALTH_STATUS="${HEALTH_RESPONSE: -3}"
HEALTH_BODY="${HEALTH_RESPONSE%???}"

if [ "$HEALTH_STATUS" = "200" ]; then
    print_success "Health endpoint is working!"
    echo "Response: $HEALTH_BODY"
else
    print_error "Health endpoint failed with status: $HEALTH_STATUS"
    echo "Response: $HEALTH_BODY"
fi

# Test the auth check endpoint
print_status "Testing auth check endpoint..."
AUTH_RESPONSE=$(curl -s -w "%{http_code}" "$WORKER_URL/api/auth/check" || echo "000")
AUTH_STATUS="${AUTH_RESPONSE: -3}"
AUTH_BODY="${AUTH_RESPONSE%???}"

if [ "$AUTH_STATUS" = "401" ]; then
    print_success "Auth check endpoint is working correctly (returning 401 for no session)!"
    echo "Response: $AUTH_BODY"
elif [ "$AUTH_STATUS" = "200" ]; then
    print_warning "Auth check returned 200 - this might indicate a session is already present"
    echo "Response: $AUTH_BODY"
else
    print_error "Auth check endpoint failed with status: $AUTH_STATUS"
    echo "Response: $AUTH_BODY"
fi

# Test a tRPC endpoint
print_status "Testing tRPC endpoint..."
TRPC_RESPONSE=$(curl -s -w "%{http_code}" "$WORKER_URL/api/trpc/labels.list?batch=1&input=%7B%220%22%3A%7B%22json%22%3Anull%2C%22meta%22%3A%7B%22values%22%3A%5B%22undefined%22%5D%7D%7D%7D" || echo "000")
TRPC_STATUS="${TRPC_RESPONSE: -3}"
TRPC_BODY="${TRPC_RESPONSE%???}"

if [ "$TRPC_STATUS" = "401" ] || [ "$TRPC_STATUS" = "400" ]; then
    print_success "tRPC endpoint is returning proper JSON errors!"
    echo "Response: $TRPC_BODY"
elif [[ "$TRPC_BODY" == *"Internal Server Error"* ]]; then
    print_error "tRPC endpoint is still returning HTML error pages!"
    echo "Response: $TRPC_BODY"
else
    print_warning "tRPC endpoint returned unexpected status: $TRPC_STATUS"
    echo "Response: $TRPC_BODY"
fi

print_status "Starting real-time log monitoring..."
print_warning "Press Ctrl+C to stop log monitoring"

# Start log monitoring
wrangler tail --format=pretty

echo ""
print_success "Deployment and testing completed!"
echo ""
echo "📋 Summary:"
echo "- Health endpoint: $([ "$HEALTH_STATUS" = "200" ] && echo "✅ Working" || echo "❌ Failed")"
echo "- Auth check: $([ "$AUTH_STATUS" = "401" ] && echo "✅ Working" || echo "⚠️  Check logs")"
echo "- tRPC error handling: $([ "$TRPC_STATUS" = "401" ] || [ "$TRPC_STATUS" = "400" ] && echo "✅ Working" || echo "❌ Needs attention")"
echo ""
echo "🔍 Next steps:"
echo "1. Check the logs above for any errors"
echo "2. Test with a real user session"
echo "3. Verify all environment variables are set in Cloudflare dashboard"
echo "4. Check Durable Object bindings are correct" 