-- Automatically fix all users that exist in auth.users but not in public.users or public.public_profiles

-- First, insert missing users into public.users
INSERT INTO public.users (id, email, name, role, subscription_active)
SELECT 
  au.id,
  au.email,
  COALESCE(
    NULLIF(trim(au.raw_user_meta_data->>'name'), ''),
    split_part(COALESCE(au.email, 'user@example.com'), '@', 1)
  ) as name,
  CASE
    WHEN au.email = 'admin@vendra.com' THEN 'empresa_constructora'
    WHEN au.raw_user_meta_data->>'role' IN ('comprador', 'vendedor_agente', 'empresa_constructora')
    THEN au.raw_user_meta_data->>'role'
    ELSE 'comprador'
  END as role,
  false as subscription_active
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE pu.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- Then, insert missing users into public.public_profiles
INSERT INTO public.public_profiles (id, name, email, role)
SELECT 
  pu.id,
  pu.name,
  pu.email,
  pu.role
FROM public.users pu
LEFT JOIN public.public_profiles pp ON pu.id = pp.id
WHERE pp.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- Verify the fixes
SELECT 
  COUNT(*) as total_auth_users,
  (SELECT COUNT(*) FROM public.users) as total_public_users,
  (SELECT COUNT(*) FROM public.public_profiles) as total_public_profiles,
  (SELECT COUNT(*) FROM auth.users au LEFT JOIN public.users pu ON au.id = pu.id WHERE pu.id IS NULL) as auth_users_missing_public_users,
  (SELECT COUNT(*) FROM public.users pu LEFT JOIN public.public_profiles pp ON pu.id = pp.id WHERE pp.id IS NULL) as public_users_missing_profiles
FROM auth.users;

-- Show the users that were fixed
SELECT 
  au.id,
  au.email,
  au.created_at,
  CASE WHEN pu.id IS NOT NULL THEN 'FIXED' ELSE 'STILL MISSING' END as user_status,
  CASE WHEN pp.id IS NOT NULL THEN 'FIXED' ELSE 'STILL MISSING' END as profile_status
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
LEFT JOIN public.public_profiles pp ON au.id = pp.id
WHERE au.created_at > NOW() - INTERVAL '30 days'
ORDER BY au.created_at DESC;