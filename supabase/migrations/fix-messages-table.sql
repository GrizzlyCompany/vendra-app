-- Add missing columns to messages table
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS conversation_type text DEFAULT 'user_to_user' CHECK (conversation_type IN ('user_to_user', 'user_to_admin', 'admin_to_user'));
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS case_status text DEFAULT 'open' CHECK (case_status IN ('open', 'closed', 'resolved'));
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS closed_at timestamptz;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS closed_by uuid REFERENCES auth.users(id);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_messages_conversation_type ON public.messages (conversation_type);
CREATE INDEX IF NOT EXISTS idx_messages_case_status ON public.messages (case_status);
CREATE INDEX IF NOT EXISTS idx_messages_closed_at ON public.messages (closed_at);
CREATE INDEX IF NOT EXISTS idx_messages_admin_conversations ON public.messages (case_status, conversation_type, created_at DESC);
