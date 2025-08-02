-- D1 Database Schema for Zero Email
-- Tables for storing thread data, sessions, and connections

CREATE TABLE IF NOT EXISTS threads (
  thread_id TEXT PRIMARY KEY,
  connection_id TEXT NOT NULL,
  subject TEXT,
  snippet TEXT,
  history_id TEXT,
  latest_label_ids TEXT, -- JSON array of label IDs
  received_on TEXT, -- ISO date string
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sessions (
  session_id TEXT PRIMARY KEY,
  connection_id TEXT NOT NULL,
  data TEXT, -- JSON data
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS connections (
  connection_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  email TEXT NOT NULL,
  name TEXT,
  picture TEXT,
  access_token TEXT,
  refresh_token TEXT,
  scope TEXT NOT NULL,
  provider_id TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_threads_connection_id ON threads(connection_id);
CREATE INDEX IF NOT EXISTS idx_threads_received_on ON threads(received_on);
CREATE INDEX IF NOT EXISTS idx_sessions_connection_id ON sessions(connection_id);
CREATE INDEX IF NOT EXISTS idx_connections_user_id ON connections(user_id);
CREATE INDEX IF NOT EXISTS idx_connections_email ON connections(email); 