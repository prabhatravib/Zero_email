# Database Setup Guide

## Setting up D1 Database

1. **Create D1 Database**
   ```bash
   npx wrangler d1 create pitext-mail-db
   ```

2. **Update wrangler.jsonc**
   Replace `your-database-id-here` in the wrangler.jsonc file with the actual database ID from step 1.

3. **Apply Schema**
   ```bash
   npx wrangler d1 execute pitext-mail-db --file=./src/durable-objects/schema.sql
   ```

4. **Deploy**
   ```bash
   npx wrangler deploy
   ```

## Database Schema

The database includes the following tables:

- **threads**: Stores email thread metadata
- **sessions**: Stores session data
- **connections**: Stores OAuth connections

## Features

- **SQLite Integration**: Full SQLite support with D1Database
- **Fallback Support**: Falls back to Durable Object storage if database is not available
- **Automatic Table Creation**: Tables are created automatically on first use
- **Indexed Queries**: Optimized queries with proper indexes

## Usage

The database is automatically initialized when the Durable Objects start. The system will:

1. Check for D1 database binding
2. Create tables if they don't exist
3. Use SQLite for all operations
4. Fall back to storage if database is unavailable

## Troubleshooting

If you see "Database operations disabled" messages, it means:
- D1 database is not configured
- Database binding is missing
- Database initialization failed

The application will still work using the fallback storage mechanism.