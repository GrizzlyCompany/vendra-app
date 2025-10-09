-- SQL Script to ensure admin user has a public profile
-- This is needed for the messaging system to display the admin in conversation lists

-- Add admin user to public.users table if not exists
INSERT INTO public.users (id, email, name, role)
SELECT id, 'admin@vendra.com', 'Administrator', 'comprador'
FROM auth.users 
WHERE email = 'admin@vendra.com'
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  name = EXCLUDED.name,
  role = 'comprador';

-- Ensure admin user has a public profile
INSERT INTO public.public_profiles (id, name, email, role)
SELECT u.id, u.name, u.email, u.role
FROM public.users u
WHERE u.email = 'admin@vendra.com'
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  email = EXCLUDED.email,
  role = EXCLUDED.role;

-- Verify the admin user and public profile were added
SELECT u.id, u.email, u.name, u.role, p.name as profile_name 
FROM public.users u
LEFT JOIN public.public_profiles p ON u.id = p.id
WHERE u.email = 'admin@vendra.com';