-- Final verification script to ensure the profile loading issue is completely resolved

-- 1. Check that all auth.users have corresponding entries in public.users
SELECT 
  COUNT(*) as total_auth_users,
  (SELECT COUNT(*) FROM public.users) as total_public_users,
  (SELECT COUNT(*) FROM auth.users au LEFT JOIN public.users pu ON au.id = pu.id WHERE pu.id IS NULL) as missing_in_public_users
FROM auth.users;

-- 2. Check that all public.users have corresponding entries in public.public_profiles
SELECT 
  COUNT(*) as total_public_users,
  (SELECT COUNT(*) FROM public.public_profiles) as total_public_profiles,
  (SELECT COUNT(*) FROM public.users pu LEFT JOIN public.public_profiles pp ON pu.id = pp.id WHERE pp.id IS NULL) as missing_in_public_profiles
FROM public.users;

-- 3. Check for any users with invalid roles
SELECT id, email, name, role
FROM public.users
WHERE role NOT IN ('comprador', 'vendedor_agente', 'empresa_constructora') OR role IS NULL;

-- 4. Check for any public profiles with invalid roles
SELECT id, email, name, role
FROM public.public_profiles
WHERE role NOT IN ('comprador', 'vendedor_agente', 'empresa_constructora') OR role IS NULL;

-- 5. Verify the handle_new_user trigger exists
SELECT tgname, tgrelid::regclass as table_name
FROM pg_trigger
WHERE tgname = 'on_auth_user_created';

-- 6. Check for any recent users that might still be missing
SELECT 
  au.id,
  au.email,
  au.created_at,
  CASE WHEN pu.id IS NOT NULL THEN 'YES' ELSE 'NO' END as in_public_users,
  CASE WHEN pp.id IS NOT NULL THEN 'YES' ELSE 'NO' END as in_public_profiles
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
LEFT JOIN public.public_profiles pp ON au.id = pp.id
WHERE au.created_at > NOW() - INTERVAL '30 days'
ORDER BY au.created_at DESC;