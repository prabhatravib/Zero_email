-- SQLite schema for Durable Objects
-- This file contains the table definitions for the Durable Objects

-- Threads table for storing email thread metadata
CREATE TABLE IF NOT EXISTS threads (
    id TEXT PRIMARY KEY,
    thread_id TEXT NOT NULL,
    provider_id TEXT NOT NULL DEFAULT 'google',
    latest_sender TEXT,
    latest_received_on TEXT,
    latest_subject TEXT,
    latest_label_ids TEXT, -- JSON array of label IDs
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_threads_thread_id ON threads(thread_id);
CREATE INDEX IF NOT EXISTS idx_threads_provider_id ON threads(provider_id);
CREATE INDEX IF NOT EXISTS idx_threads_latest_received_on ON threads(latest_received_on);

-- Sessions table for storing session data
CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    session_data TEXT, -- JSON string
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Connections table for storing OAuth connections
CREATE TABLE IF NOT EXISTS connections (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    email TEXT NOT NULL,
    name TEXT,
    picture TEXT,
    access_token TEXT,
    refresh_token TEXT,
    scope TEXT NOT NULL,
    provider_id TEXT NOT NULL,
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for connections
CREATE INDEX IF NOT EXISTS idx_connections_user_id ON connections(user_id);
CREATE INDEX IF NOT EXISTS idx_connections_email ON connections(email);
CREATE INDEX IF NOT EXISTS idx_connections_provider_id ON connections(provider_id); 