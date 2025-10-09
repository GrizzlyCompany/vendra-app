-- Fix for admin messages not showing new reports
-- This script addresses issues with the admin messaging system

-- 1. Ensure admin user exists with correct role
INSERT INTO public.users (id, email, name, role)
SELECT gen_random_uuid(), 'admin@vendra.com', 'Administrador Vendra', 'empresa_constructora'
WHERE NOT EXISTS (
    SELECT 1 FROM public.users WHERE email = 'admin@vendra.com'
);

-- 2. Ensure admin user has a public profile
INSERT INTO public.public_profiles (id, name, email, role)
SELECT id, name, email, role 
FROM public.users 
WHERE email = 'admin@vendra.com'
ON CONFLICT (id) 
DO UPDATE SET 
    name = EXCLUDED.name,
    email = EXCLUDED.email,
    role = EXCLUDED.role,
    updated_at = now();

-- 3. Fix any messages that might have been inserted with wrong conversation_type
-- This updates messages that contain "Nuevo Reporte" but don't have the correct conversation_type
UPDATE public.messages 
SET conversation_type = 'user_to_admin',
    case_status = 'open'
WHERE content ILIKE '%Nuevo Reporte%'
  AND conversation_type != 'user_to_admin';

-- 4. Fix any messages that might have been inserted with wrong case_status
UPDATE public.messages 
SET case_status = 'open'
WHERE content ILIKE '%Nuevo Reporte%'
  AND case_status = 'closed';

-- 5. Ensure proper indexes exist for efficient querying
CREATE INDEX IF NOT EXISTS idx_messages_admin_reports ON public.messages (conversation_type, case_status, created_at DESC);

-- 6. Create or replace the admin-get-messages function with improved logic
-- This function will be used by the admin panel to fetch messages
CREATE OR REPLACE FUNCTION public.get_admin_messages()
RETURNS TABLE (
    user_id uuid,
    user_name text,
    user_email text,
    conversation_type text,
    case_status text,
    last_message_content text,
    last_message_created_at timestamptz,
    message_count bigint,
    unread_count bigint
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    WITH conversation_stats AS (
        SELECT 
            CASE 
                WHEN m.sender_id = (SELECT id FROM public.users WHERE email = 'admin@vendra.com') 
                THEN m.recipient_id 
                ELSE m.sender_id 
            END AS user_id,
            MAX(m.created_at) AS last_message_at,
            COUNT(*) AS total_messages,
            COUNT(*) FILTER (WHERE m.read_at IS NULL AND m.recipient_id = (SELECT id FROM public.users WHERE email = 'admin@vendra.com')) AS unread_messages
        FROM public.messages m
        WHERE m.conversation_type = 'user_to_admin'
        GROUP BY CASE 
                    WHEN m.sender_id = (SELECT id FROM public.users WHERE email = 'admin@vendra.com') 
                    THEN m.recipient_id 
                    ELSE m.sender_id 
                 END
    )
    SELECT 
        cs.user_id,
        u.name AS user_name,
        u.email AS user_email,
        'user_to_admin'::text AS conversation_type,
        COALESCE(m.case_status, 'open')::text AS case_status,
        m.content::text AS last_message_content,
        m.created_at AS last_message_created_at,
        cs.total_messages,
        cs.unread_messages
    FROM conversation_stats cs
    JOIN public.messages m ON (
        (m.sender_id = cs.user_id AND m.recipient_id = (SELECT id FROM public.users WHERE email = 'admin@vendra.com')) OR
        (m.sender_id = (SELECT id FROM public.users WHERE email = 'admin@vendra.com') AND m.recipient_id = cs.user_id)
    ) AND m.created_at = cs.last_message_at
    JOIN public.users u ON u.id = cs.user_id
    ORDER BY m.created_at DESC;
END;
$$;