-- Check for createdAt columns across all tables
-- This will help identify which tables have camelCase createdAt columns

SELECT 'mail0_user' as table_name, name as column_name 
FROM pragma_table_info('mail0_user') 
WHERE name = 'createdAt'
UNION ALL
SELECT 'mail0_session' as table_name, name as column_name 
FROM pragma_table_info('mail0_session') 
WHERE name = 'createdAt'
UNION ALL
SELECT 'mail0_account' as table_name, name as column_name 
FROM pragma_table_info('mail0_account') 
WHERE name = 'createdAt'
UNION ALL
SELECT 'mail0_connection' as table_name, name as column_name 
FROM pragma_table_info('mail0_connection') 
WHERE name = 'createdAt'
UNION ALL
SELECT 'mail0_user_settings' as table_name, name as column_name 
FROM pragma_table_info('mail0_user_settings') 
WHERE name = 'createdAt'
UNION ALL
SELECT 'mail0_user_hotkeys' as table_name, name as column_name 
FROM pragma_table_info('mail0_user_hotkeys') 
WHERE name = 'createdAt'
UNION ALL
SELECT 'mail0_note' as table_name, name as column_name 
FROM pragma_table_info('mail0_note') 
WHERE name = 'createdAt'
UNION ALL
SELECT 'mail0_summary' as table_name, name as column_name 
FROM pragma_table_info('mail0_summary') 
WHERE name = 'createdAt'
UNION ALL
SELECT 'mail0_verification' as table_name, name as column_name 
FROM pragma_table_info('mail0_verification') 
WHERE name = 'createdAt'
UNION ALL
SELECT 'mail0_jwks' as table_name, name as column_name 
FROM pragma_table_info('mail0_jwks') 
WHERE name = 'createdAt'
UNION ALL
SELECT 'mail0_early_access' as table_name, name as column_name 
FROM pragma_table_info('mail0_early_access') 
WHERE name = 'createdAt'
UNION ALL
SELECT 'mail0_oauth_application' as table_name, name as column_name 
FROM pragma_table_info('mail0_oauth_application') 
WHERE name = 'createdAt'
UNION ALL
SELECT 'mail0_oauth_access_token' as table_name, name as column_name 
FROM pragma_table_info('mail0_oauth_access_token') 
WHERE name = 'createdAt'
UNION ALL
SELECT 'mail0_oauth_consent' as table_name, name as column_name 
FROM pragma_table_info('mail0_oauth_consent') 
WHERE name = 'createdAt'; 