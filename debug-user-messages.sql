-- Debug script to check messaging between admin and users
-- This script helps identify why users might not be seeing admin messages

-- First, let's get the admin user ID
SELECT id, email, name, role FROM public.users WHERE email = 'admin@vendra.com';

-- Get a sample user to test with (replace 'test-user-id' with an actual user ID)
-- SELECT id, email, name, role FROM public.users WHERE email != 'admin@vendra.com' LIMIT 1;

-- Check if there are existing conversations between admin and users
SELECT 
    m.id,
    m.sender_id,
    m.recipient_id,
    m.content,
    m.created_at,
    sender.email as sender_email,
    sender.name as sender_name,
    recipient.email as recipient_email,
    recipient.name as recipient_name
FROM public.messages m
JOIN public.users sender ON sender.id = m.sender_id
JOIN public.users recipient ON recipient.id = m.recipient_id
WHERE (m.sender_id = (SELECT id FROM public.users WHERE email = 'admin@vendra.com')
       OR m.recipient_id = (SELECT id FROM public.users WHERE email = 'admin@vendra.com'))
ORDER BY m.created_at DESC
LIMIT 20;

-- Check if public profiles exist for users involved in conversations
SELECT 
    pp.id,
    pp.name,
    pp.email,
    pp.role,
    u.email as user_email
FROM public.public_profiles pp
JOIN public.users u ON pp.id = u.id
WHERE u.email = 'admin@vendra.com'
   OR pp.id IN (
       SELECT DISTINCT sender_id 
       FROM public.messages 
       WHERE recipient_id = (SELECT id FROM public.users WHERE email = 'admin@vendra.com')
       UNION
       SELECT DISTINCT recipient_id 
       FROM public.messages 
       WHERE sender_id = (SELECT id FROM public.users WHERE email = 'admin@vendra.com')
   )
ORDER BY pp.email;

-- Check RLS policies for messages
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'messages' 
ORDER BY policyname;

-- Check if there are any issues with the sync trigger
SELECT 
    tgname,
    tgtype,
    tgdefinition
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE tgname LIKE '%public_profile%'
ORDER BY tgname;