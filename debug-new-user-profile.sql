-- Script to debug why new users don't have profiles
-- Check if a new user was created properly

-- First, let's see the most recent users created
SELECT
  'auth.users' as source,
  email,
  raw_user_meta_data,
  created_at as auth_created_at
FROM auth.users
ORDER BY created_at DESC
LIMIT 5;

-- Then check public.users entries
SELECT
  'public.users' as source,
  id,
  email,
  name,
  role,
  created_at as users_created_at
FROM public.users
ORDER BY created_at DESC
LIMIT 5;

-- Then check public_profiles entries
SELECT
  'public.public_profiles' as source,
  id,
  name,
  email,
  role,
  created_at as profiles_created_at
FROM public.public_profiles
ORDER BY created_at DESC
LIMIT 5;

-- Check if there are any orphaned auth.users without public.users profiles
SELECT
  au.email,
  au.created_at as auth_created_at,
  pu.created_at as users_created_at,
  pp.created_at as profiles_created_at
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
LEFT JOIN public.public_profiles pp ON au.id = pp.id AND pp.id = pu.id
WHERE au.created_at > now() - interval '1 day'
ORDER BY au.created_at DESC;

-- Test the sync function manually
SELECT public.sync_public_profile();

-- Backfill any missing public_profiles for recent users
INSERT INTO public.public_profiles (id, name, email, bio, avatar_url, role)
SELECT u.id, u.name, u.email, u.bio, u.avatar_url, u.role
FROM public.users u
LEFT JOIN public.public_profiles pp ON u.id = pp.id
WHERE pp.id IS NULL
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  email = EXCLUDED.email,
  bio = EXCLUDED.bio,
  avatar_url = EXCLUDED.avatar_url,
  role = EXCLUDED.role,
  updated_at = now();
