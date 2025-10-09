-- Script to fix the admin user role constraint issue and ensure proper messaging
-- This will change the admin user's role from 'admin' to 'empresa_constructora'
-- which is the most appropriate role for an administrative user in this real estate platform

-- First, let's check the current user data
SELECT id, email, role FROM public.users WHERE email = 'admin@vendra.com';

-- Fix admin user role to be empresa_constructora
UPDATE public.users 
SET role = 'empresa_constructora' 
WHERE email = 'admin@vendra.com';

-- Verify the update
SELECT id, email, name, role 
FROM public.users 
WHERE email = 'admin@vendra.com';

-- Ensure the admin user has a public profile for messaging visibility
-- First, try to insert/update the public profile
INSERT INTO public.public_profiles (id, name, email, role)
SELECT id, 
       COALESCE(name, 'Administrador Vendra') as name, 
       email, 
       role 
FROM public.users 
WHERE email = 'admin@vendra.com'
ON CONFLICT (id) 
DO UPDATE SET 
    name = EXCLUDED.name,
    email = EXCLUDED.email,
    role = EXCLUDED.role,
    updated_at = now();

-- If the above doesn't work, let's ensure the trigger is working properly
-- by updating the user record which should trigger the sync
UPDATE public.users 
SET updated_at = now()
WHERE email = 'admin@vendra.com';

-- Verify the public profile
SELECT id, name, email, role FROM public.public_profiles WHERE email = 'admin@vendra.com';

-- Also, let's check if there are any messages involving the admin user
SELECT 
    m.id,
    m.sender_id,
    m.recipient_id,
    m.content,
    m.created_at,
    sender.email as sender_email,
    recipient.email as recipient_email
FROM public.messages m
JOIN public.users sender ON sender.id = m.sender_id
JOIN public.users recipient ON recipient.id = m.recipient_id
WHERE m.sender_id = (SELECT id FROM public.users WHERE email = 'admin@vendra.com')
   OR m.recipient_id = (SELECT id FROM public.users WHERE email = 'admin@vendra.com')
ORDER BY m.created_at DESC
LIMIT 10;

-- Check if the sync trigger exists
SELECT tgname, tgtype, tgdefinition 
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE tgname = 'trg_users_sync_public_profile_upsert';

-- If needed, manually trigger the sync function to ensure public profile is created
-- This is a more forceful approach to ensure the profile exists
DO $$
DECLARE
    admin_user RECORD;
BEGIN
    SELECT * INTO admin_user FROM public.users WHERE email = 'admin@vendra.com';
    IF FOUND THEN
        -- Manually call the sync function
        PERFORM public.sync_public_profile() FROM public.users WHERE email = 'admin@vendra.com';
    END IF;
END $$;