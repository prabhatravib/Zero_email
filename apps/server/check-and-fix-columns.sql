-- Check for userId columns across all tables and fix them
-- This script will identify which tables have userId columns and rename them to user_id

-- First, let's see which tables have userId columns
SELECT 
    'mail0_account' as table_name,
    CASE WHEN EXISTS (
        SELECT 1 FROM pragma_table_info('mail0_account') 
        WHERE name = 'userId'
    ) THEN 'HAS_USERID' ELSE 'NO_USERID' END as status
UNION ALL
SELECT 
    'mail0_session' as table_name,
    CASE WHEN EXISTS (
        SELECT 1 FROM pragma_table_info('mail0_session') 
        WHERE name = 'userId'
    ) THEN 'HAS_USERID' ELSE 'NO_USERID' END as status
UNION ALL
SELECT 
    'mail0_connection' as table_name,
    CASE WHEN EXISTS (
        SELECT 1 FROM pragma_table_info('mail0_connection') 
        WHERE name = 'userId'
    ) THEN 'HAS_USERID' ELSE 'NO_USERID' END as status
UNION ALL
SELECT 
    'mail0_user_settings' as table_name,
    CASE WHEN EXISTS (
        SELECT 1 FROM pragma_table_info('mail0_user_settings') 
        WHERE name = 'userId'
    ) THEN 'HAS_USERID' ELSE 'NO_USERID' END as status
UNION ALL
SELECT 
    'mail0_user_hotkeys' as table_name,
    CASE WHEN EXISTS (
        SELECT 1 FROM pragma_table_info('mail0_user_hotkeys') 
        WHERE name = 'userId'
    ) THEN 'HAS_USERID' ELSE 'NO_USERID' END as status
UNION ALL
SELECT 
    'mail0_note' as table_name,
    CASE WHEN EXISTS (
        SELECT 1 FROM pragma_table_info('mail0_note') 
        WHERE name = 'userId'
    ) THEN 'HAS_USERID' ELSE 'NO_USERID' END as status
UNION ALL
SELECT 
    'mail0_oauth_application' as table_name,
    CASE WHEN EXISTS (
        SELECT 1 FROM pragma_table_info('mail0_oauth_application') 
        WHERE name = 'userId'
    ) THEN 'HAS_USERID' ELSE 'NO_USERID' END as status
UNION ALL
SELECT 
    'mail0_oauth_access_token' as table_name,
    CASE WHEN EXISTS (
        SELECT 1 FROM pragma_table_info('mail0_oauth_access_token') 
        WHERE name = 'userId'
    ) THEN 'HAS_USERID' ELSE 'NO_USERID' END as status
UNION ALL
SELECT 
    'mail0_oauth_consent' as table_name,
    CASE WHEN EXISTS (
        SELECT 1 FROM pragma_table_info('mail0_oauth_consent') 
        WHERE name = 'userId'
    ) THEN 'HAS_USERID' ELSE 'NO_USERID' END as status; 