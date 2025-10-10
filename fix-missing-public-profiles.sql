-- SQL Script to fix missing public profiles for existing users
-- This script will create public profiles for any user that doesn't have one

-- First, let's see how many users are missing public profiles
SELECT 
  COUNT(*) as users_missing_profiles
FROM public.users u
LEFT JOIN public.public_profiles pp ON u.id = pp.id
WHERE pp.id IS NULL;

-- Create public profiles for users that don't have them
INSERT INTO public.public_profiles (id, name, email, bio, avatar_url, role)
SELECT u.id, u.name, u.email, u.bio, u.avatar_url, u.role
FROM public.users u
LEFT JOIN public.public_profiles pp ON u.id = pp.id
WHERE pp.id IS NULL;

-- Verify the fix
SELECT 
  COUNT(*) as total_users,
  (SELECT COUNT(*) FROM public.public_profiles) as total_profiles,
  (SELECT COUNT(*) FROM public.users u LEFT JOIN public.public_profiles pp ON u.id = pp.id WHERE pp.id IS NULL) as users_still_missing_profiles
FROM public.users;

-- If there are still users missing profiles, we can try to create minimal profiles
INSERT INTO public.public_profiles (id, name, email, role)
SELECT u.id, 
       COALESCE(u.name, 'Usuario'), 
       u.email, 
       COALESCE(u.role, 'comprador')
FROM public.users u
LEFT JOIN public.public_profiles pp ON u.id = pp.id
WHERE pp.id IS NULL;

-- Final verification
SELECT 
  COUNT(*) as total_users,
  (SELECT COUNT(*) FROM public.public_profiles) as total_profiles,
  (SELECT COUNT(*) FROM public.users u LEFT JOIN public.public_profiles pp ON u.id = pp.id WHERE pp.id IS NULL) as users_still_missing_profiles
FROM public.users;