-- Verify that all userId columns have been renamed to user_id
-- Check if any userId columns still exist

SELECT 'mail0_connection' as table_name, name as column_name 
FROM pragma_table_info('mail0_connection') 
WHERE name = 'userId'
UNION ALL
SELECT 'mail0_user_settings' as table_name, name as column_name 
FROM pragma_table_info('mail0_user_settings') 
WHERE name = 'userId'
UNION ALL
SELECT 'mail0_user_hotkeys' as table_name, name as column_name 
FROM pragma_table_info('mail0_user_hotkeys') 
WHERE name = 'userId'
UNION ALL
SELECT 'mail0_note' as table_name, name as column_name 
FROM pragma_table_info('mail0_note') 
WHERE name = 'userId'; 