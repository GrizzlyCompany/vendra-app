-- 1. Enable HTTP Extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS http WITH SCHEMA extensions;

-- 2. Create the Trigger Function
CREATE OR REPLACE FUNCTION public.notify_push_on_message()
RETURNS TRIGGER AS $$
DECLARE
  webhook_url TEXT := 'https://vvuvuibcmvqxtvdadwne.supabase.co/functions/v1/send-push';
  service_role_key TEXT := 'YOUR_SERVICE_ROLE_KEY'; -- It's better to set this as a secret or environment variable
BEGIN
  -- We call the Edge Function
  -- Note: Supabase Edge Functions automatically receive the record in the body if called via a built-in Webhook
  -- But if we use PL/pgSQL, we need to format the body.
  
  -- Recommending the use of Supabase's built-in Webhook feature via Dashboard for better security:
  -- Go to Database -> Webhooks -> Create new webhook
  -- Table: messages
  -- Events: Insert
  -- Type: Edge Function
  -- Function: send-push
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
