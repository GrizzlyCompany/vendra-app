-- SQL script to fix user role issue for angelf.delarosa@gmail.com
-- First, let's check the current status of the user's application and role
SELECT 
  sa.id as application_id,
  sa.user_id,
  sa.status as application_status,
  sa.role_choice,
  u.role as database_role,
  au.email,
  au.raw_user_meta_data->>'role' as auth_metadata_role
FROM seller_applications sa
JOIN users u ON sa.user_id = u.id
JOIN auth.users au ON sa.user_id = au.id
WHERE au.email = 'angelf.delarosa@gmail.com';

-- Update the user's role in the database
UPDATE users 
SET role = 'vendedor_agente', updated_at = NOW()
WHERE id = '503e1035-8781-4b87-b1fe-46305d8f6842';

-- IMPORTANT: The auth metadata must also be updated through the Supabase Admin API
-- This cannot be done directly via SQL. You need to use one of these methods:
-- 1. Supabase Dashboard: Go to Authentication > Users, find the user, and edit their metadata
-- 2. Supabase Admin API: Use the admin.updateUserById() method to update the user_metadata
-- 3. Run a script using the Supabase CLI with service role key

-- Verify the database update
SELECT 
  id,
  role,
  updated_at
FROM users 
WHERE id = '503e1035-8781-4b87-b1fe-46305d8f6842';

-- Check if the application status is approved
SELECT 
  id,
  user_id,
  status,
  reviewed_at
FROM seller_applications 
WHERE user_id = '503e1035-8781-4b87-b1fe-46305d8f6842';