-- SQL Script to set up admin user
-- Run this after creating the admin user in Supabase Auth

-- Add admin user to public.users table
INSERT INTO public.users (id, email, name, role)
SELECT id, 'admin@vendra.com', 'Administrator', 'comprador'
FROM auth.users 
WHERE email = 'admin@vendra.com'
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  name = EXCLUDED.name,
  role = 'comprador';

-- Verify the admin user was added
SELECT id, email, name, role FROM public.users WHERE email = 'admin@vendra.com';