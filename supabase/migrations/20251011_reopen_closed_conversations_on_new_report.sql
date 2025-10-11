-- Migration to automatically reopen closed conversations when a new report is created
-- This script modifies the check_conversation_status function to allow new reports to reopen closed conversations

-- First, add the reopened_at column to the messages table if it doesn't exist
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS reopened_at timestamptz;

-- Create or replace function to reopen conversations when a new report is inserted
CREATE OR REPLACE FUNCTION public.reopen_closed_conversation_on_new_report()
RETURNS TRIGGER AS $$
BEGIN
  -- If this is a new report message (identified by specific content)
  IF NEW.content ILIKE '%NUEVO REPORTE RECIBIDO%' THEN
    -- Reopen any closed conversations between this user and admin
    UPDATE public.messages 
    SET case_status = 'open', 
        reopened_at = NOW()
    WHERE (
      (sender_id = NEW.sender_id AND recipient_id = NEW.recipient_id) OR
      (sender_id = NEW.recipient_id AND recipient_id = NEW.sender_id)
    )
    AND conversation_type = 'user_to_admin'
    AND case_status = 'closed';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically reopen conversations when a new report is inserted
DROP TRIGGER IF EXISTS reopen_closed_conversation_on_new_report_trigger ON public.messages;
CREATE TRIGGER reopen_closed_conversation_on_new_report_trigger
  BEFORE INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.reopen_closed_conversation_on_new_report();

-- Also update the check_conversation_status function to be more specific
-- about when to block messages to closed conversations
CREATE OR REPLACE FUNCTION public.check_conversation_status()
RETURNS TRIGGER AS $$
DECLARE
  is_closed BOOLEAN;
  admin_user_id UUID;
BEGIN
  -- Only check for user_to_admin conversations
  IF NEW.conversation_type = 'user_to_admin' THEN
    -- Allow report messages to bypass the check and reopen conversations
    IF NEW.content ILIKE '%NUEVO REPORTE RECIBIDO%' THEN
      -- Reopen any closed conversations between this user and admin
      UPDATE public.messages 
      SET case_status = 'open', 
          reopened_at = NOW()
      WHERE (
        (sender_id = NEW.sender_id AND recipient_id = NEW.recipient_id) OR
        (sender_id = NEW.recipient_id AND recipient_id = NEW.sender_id)
      )
      AND conversation_type = 'user_to_admin'
      AND case_status = 'closed';
      
      -- Allow the insert to proceed
      RETURN NEW;
    END IF;
    
    -- Get the admin user ID
    SELECT id INTO admin_user_id FROM public.users WHERE email = 'admin@vendra.com';
    
    -- Check if there are any closed messages in this conversation
    SELECT EXISTS (
      SELECT 1 FROM public.messages 
      WHERE (
        (sender_id = NEW.sender_id AND recipient_id = admin_user_id) OR
        (sender_id = admin_user_id AND recipient_id = NEW.sender_id)
      )
      AND conversation_type = 'user_to_admin'
      AND case_status = 'closed'
      LIMIT 1
    ) INTO is_closed;
    
    -- If conversation is closed and it's not a report, prevent the insert
    IF is_closed THEN
      RAISE EXCEPTION 'Esta conversación ha sido cerrada. Por favor, crea un nuevo reporte si tienes otra inquietud.';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;