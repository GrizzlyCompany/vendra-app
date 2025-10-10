-- Migration to ensure new reports are automatically opened in admin messages section
-- This script ensures that:
-- 1. Messages with "Nuevo Reporte" content are properly classified as user_to_admin
-- 2. These messages have the correct case_status set to 'open'
-- 3. Proper indexes exist for efficient querying

-- 1. Fix existing messages that contain "Nuevo Reporte" but might have wrong conversation_type
UPDATE public.messages 
SET conversation_type = 'user_to_admin'
WHERE content ILIKE '%Nuevo Reporte%'
  AND conversation_type != 'user_to_admin';

-- 2. Ensure all "Nuevo Reporte" messages are marked as open cases
UPDATE public.messages 
SET case_status = 'open'
WHERE content ILIKE '%Nuevo Reporte%'
  AND (case_status IS NULL OR case_status != 'open');

-- 3. Ensure all user_to_admin conversations have a proper case_status
UPDATE public.messages 
SET case_status = 'open'
WHERE conversation_type = 'user_to_admin'
  AND (case_status IS NULL OR case_status = '');

-- 4. Create indexes for efficient querying of admin messages
CREATE INDEX IF NOT EXISTS idx_messages_admin_reports ON public.messages (conversation_type, case_status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_content_search ON public.messages (content text_pattern_ops);

-- 5. Create or replace function to automatically set proper values for new report messages
CREATE OR REPLACE FUNCTION public.auto_set_report_message_fields()
RETURNS TRIGGER AS $$
BEGIN
  -- If this is a new message with "Nuevo Reporte" in the content
  IF NEW.content ILIKE '%Nuevo Reporte%' THEN
    -- Ensure it's classified as user_to_admin conversation
    NEW.conversation_type := 'user_to_admin';
    -- Ensure it's marked as an open case
    NEW.case_status := 'open';
  END IF;
  
  -- If this is a user_to_admin conversation without a case_status, set it to open
  IF NEW.conversation_type = 'user_to_admin' AND (NEW.case_status IS NULL OR NEW.case_status = '') THEN
    NEW.case_status := 'open';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Create trigger to automatically apply these rules to new messages
DROP TRIGGER IF EXISTS auto_set_report_message_fields_trigger ON public.messages;
CREATE TRIGGER auto_set_report_message_fields_trigger
  BEFORE INSERT OR UPDATE ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_set_report_message_fields();

-- 7. Ensure admin user exists with proper role
INSERT INTO public.users (id, email, name, role)
SELECT 
  gen_random_uuid(),
  'admin@vendra.com',
  'Administrador',
  'empresa_constructora'
WHERE NOT EXISTS (
  SELECT 1 FROM public.users WHERE email = 'admin@vendra.com'
)
ON CONFLICT (id) DO UPDATE SET
  role = EXCLUDED.role,
  name = EXCLUDED.name;

-- 8. Ensure admin user has a public profile
INSERT INTO public.public_profiles (id, name, email, role)
SELECT 
  u.id,
  u.name,
  u.email,
  u.role
FROM public.users u
WHERE u.email = 'admin@vendra.com'
  AND NOT EXISTS (
    SELECT 1 FROM public.public_profiles WHERE id = u.id
  )
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  email = EXCLUDED.email,
  role = EXCLUDED.role;