-- Diagnostic script to identify the exact cause of the profile loading issue

-- 1. Check the most recent users in auth.users
SELECT 
  id,
  email,
  created_at as auth_created_at,
  raw_user_meta_data
FROM auth.users 
ORDER BY created_at DESC 
LIMIT 5;

-- 2. Check if these users exist in public.users
SELECT 
  u.id,
  u.email,
  u.name,
  u.role,
  u.created_at as users_created_at
FROM public.users u
JOIN auth.users au ON u.id = au.id
ORDER BY u.created_at DESC
LIMIT 5;

-- 3. Check if these users have public profiles
SELECT 
  pp.id,
  pp.name,
  pp.email,
  pp.role,
  pp.created_at as profile_created_at
FROM public.public_profiles pp
JOIN auth.users au ON pp.id = au.id
ORDER BY pp.created_at DESC
LIMIT 5;

-- 4. Identify any users that exist in auth but not in public.users
SELECT 
  au.id,
  au.email,
  au.created_at
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE pu.id IS NULL
ORDER BY au.created_at DESC;

-- 5. Identify any users that exist in public.users but not in public_profiles
SELECT 
  pu.id,
  pu.email,
  pu.name,
  pu.created_at as users_created_at
FROM public.users pu
LEFT JOIN public.public_profiles pp ON pu.id = pp.id
WHERE pp.id IS NULL
ORDER BY pu.created_at DESC;

-- 6. Check for any constraint violations in the users table
SELECT 
  id,
  email,
  name,
  role
FROM public.users 
WHERE role NOT IN ('comprador', 'vendedor_agente', 'empresa_constructora')
OR role IS NULL;

-- 7. Check the structure of the public_profiles table
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'public_profiles' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 8. Check the structure of the users table
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'users' 
AND table_schema = 'public'
ORDER BY ordinal_position;