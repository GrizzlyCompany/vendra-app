-- Debug script to identify the exact cause of the "Cannot coerce the result to a single JSON object" error

-- First, let's check if there are any duplicate user IDs in the users table
SELECT id, COUNT(*) as count
FROM public.users
GROUP BY id
HAVING COUNT(*) > 1;

-- Check if there are any duplicate user IDs in the public_profiles table
SELECT id, COUNT(*) as count
FROM public.public_profiles
GROUP BY id
HAVING COUNT(*) > 1;

-- Check the most recent users to see if they have proper data
SELECT 
  au.id,
  au.email,
  au.created_at as auth_created_at,
  pu.id as users_id,
  pu.email as users_email,
  pu.name as users_name,
  pu.role as users_role,
  pp.id as profiles_id,
  pp.name as profiles_name,
  pp.role as profiles_role
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
LEFT JOIN public.public_profiles pp ON au.id = pp.id
ORDER BY au.created_at DESC
LIMIT 10;

-- Check for any users with invalid roles
SELECT id, email, name, role
FROM public.users
WHERE role NOT IN ('comprador', 'vendedor_agente', 'empresa_constructora')
OR role IS NULL;

-- Check for any public profiles with invalid roles
SELECT id, email, name, role
FROM public.public_profiles
WHERE role NOT IN ('comprador', 'vendedor_agente', 'empresa_constructora')
OR role IS NULL;

-- Check if the handle_new_user trigger exists
SELECT tgname, pg_get_functiondef(p.oid) as function_definition
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE tgname = 'on_auth_user_created';

-- Check if the sync_public_profile trigger exists
SELECT tgname, pg_get_functiondef(p.oid) as function_definition
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE tgname LIKE '%sync_public_profile%';

-- Check for any users that were created recently but don't have proper data
SELECT 
  au.id,
  au.email,
  au.created_at,
  au.raw_user_meta_data,
  CASE WHEN pu.id IS NOT NULL THEN 'YES' ELSE 'NO' END as in_public_users,
  CASE WHEN pp.id IS NOT NULL THEN 'YES' ELSE 'NO' END as in_public_profiles
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
LEFT JOIN public.public_profiles pp ON au.id = pp.id
WHERE au.created_at > NOW() - INTERVAL '7 days'
ORDER BY au.created_at DESC;