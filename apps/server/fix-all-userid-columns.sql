-- Fix all remaining userId columns to user_id
-- This script checks each table and only renames columns that exist

-- Fix mail0_connection table (we know this has userId)
ALTER TABLE mail0_connection RENAME COLUMN userId TO user_id;

-- Fix mail0_user_settings table (we know this has userId)
ALTER TABLE mail0_user_settings RENAME COLUMN userId TO user_id;

-- Fix mail0_user_hotkeys table (we know this has userId)
ALTER TABLE mail0_user_hotkeys RENAME COLUMN userId TO user_id;

-- Fix mail0_note table (we know this has userId)
ALTER TABLE mail0_note RENAME COLUMN userId TO user_id; 