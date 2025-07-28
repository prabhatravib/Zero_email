#!/bin/bash

# Deploy script for pitext-mail with D1 database

echo "🚀 Starting deployment..."

# Check if D1 database exists
echo "📊 Checking D1 database..."
DB_EXISTS=$(npx wrangler d1 list | grep "pitext-mail-db" || echo "")

if [ -z "$DB_EXISTS" ]; then
    echo "📊 Creating D1 database..."
    npx wrangler d1 create pitext-mail-db
    echo "✅ Database created successfully"
else
    echo "✅ Database already exists"
fi

# Get database ID
echo "🔍 Getting database ID..."
DB_ID=$(npx wrangler d1 list | grep "pitext-mail-db" | awk '{print $1}')
echo "📊 Database ID: $DB_ID"

# Update wrangler.jsonc with database ID
echo "📝 Updating wrangler.jsonc..."
sed -i "s/your-database-id-here/$DB_ID/g" wrangler.jsonc
echo "✅ Configuration updated"

# Apply schema
echo "📋 Applying database schema..."
npx wrangler d1 execute pitext-mail-db --file=./src/durable-objects/schema.sql
echo "✅ Schema applied"

# Deploy
echo "🚀 Deploying to Cloudflare Workers..."
npx wrangler deploy
echo "✅ Deployment complete!"

echo "🎉 Deployment finished successfully!"
echo "🌐 Your app is available at: https://pitext-mail.prabhatravib.workers.dev"