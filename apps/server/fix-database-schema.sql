-- Fix database schema for Better Auth compatibility
-- Rename columns from camelCase to snake_case

-- Fix mail0_account table (we know this has userId)
ALTER TABLE mail0_account RENAME COLUMN userId TO user_id;

-- Fix mail0_session table (we know this has userId)  
ALTER TABLE mail0_session RENAME COLUMN userId TO user_id;

-- Fix mail0_connection table (we know this has userId)
ALTER TABLE mail0_connection RENAME COLUMN userId TO user_id;

-- Fix mail0_user_settings table (we know this has userId)
ALTER TABLE mail0_user_settings RENAME COLUMN userId TO user_id;

-- Fix mail0_user_hotkeys table (we know this has userId)
ALTER TABLE mail0_user_hotkeys RENAME COLUMN userId TO user_id;

-- Fix mail0_note table (we know this has userId)
ALTER TABLE mail0_note RENAME COLUMN userId TO user_id; 