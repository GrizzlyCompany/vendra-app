-- Script to fix admin user messaging issues
-- This script ensures the admin user has the correct role and public profile for messaging visibility

-- 1. Check current admin user data
SELECT 'Current admin user data:' as info;
SELECT id, email, name, role FROM public.users WHERE email = 'admin@vendra.com';

-- 2. Update the admin user's role if it's invalid
UPDATE public.users 
SET role = 'empresa_constructora' 
WHERE email = 'admin@vendra.com' AND role NOT IN ('comprador', 'vendedor_agente', 'empresa_constructora');

-- 3. Verify the role update
SELECT 'After role update:' as info;
SELECT id, email, name, role FROM public.users WHERE email = 'admin@vendra.com';

-- 4. Ensure the admin user has a proper public profile
-- Check if the profile already exists
SELECT 'Current public profile:' as info;
SELECT id, name, email, role FROM public.public_profiles WHERE email = 'admin@vendra.com';

-- 5. Insert or update the public profile with proper data
INSERT INTO public.public_profiles (id, name, email, role)
SELECT 
    id, 
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

-- 6. Verify the public profile update
SELECT 'After public profile update:' as info;
SELECT id, name, email, role FROM public.public_profiles WHERE email = 'admin@vendra.com';

-- 7. Check recent messages involving the admin user
SELECT 'Recent messages involving admin:' as info;
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
LIMIT 5;

-- 8. Check if public profiles exist for users who have messaged the admin
SELECT 'Users who have messaged admin:' as info;
SELECT DISTINCT
    pp.id,
    pp.name,
    pp.email,
    pp.role
FROM public.public_profiles pp
JOIN public.messages m ON pp.id = m.sender_id OR pp.id = m.recipient_id
JOIN public.users u ON pp.id = u.id
WHERE (m.sender_id = (SELECT id FROM public.users WHERE email = 'admin@vendra.com')
       OR m.recipient_id = (SELECT id FROM public.users WHERE email = 'admin@vendra.com'))
  AND pp.email != 'admin@vendra.com'
ORDER BY pp.email;

-- Fix existing report messages to have the correct conversation_type
UPDATE public.messages 
SET conversation_type = 'user_to_admin' 
WHERE content ILIKE '%Nuevo Reporte Recibido%';

-- Verify the update
SELECT id, sender_id, recipient_id, content, created_at, conversation_type, case_status 
FROM public.messages 
WHERE content ILIKE '%Nuevo Reporte Recibido%' 
ORDER BY created_at DESC;

-- Also check if there are any messages with admin_to_user type
SELECT id, sender_id, recipient_id, content, created_at, conversation_type, case_status 
FROM public.messages 
WHERE conversation_type = 'admin_to_user' 
ORDER BY created_at DESC;
