-- Simple check for userId columns
-- Check mail0_connection table
SELECT 'mail0_connection' as table_name, name as column_name 
FROM pragma_table_info('mail0_connection') 
WHERE name = 'userId'; 