-- Function to check if a conversation is closed before inserting a message
create or replace function check_conversation_status()
returns trigger as $$
declare
  is_closed boolean;
  admin_user_id uuid;
begin
  -- Only check for user_to_admin conversations
  if NEW.conversation_type = 'user_to_admin' then
    -- Get the admin user ID
    select id into admin_user_id from users where email = 'admin@vendra.com';
    
    -- Check if there are any closed messages in this conversation
    select exists (
      select 1 from messages 
      where (
        (sender_id = NEW.sender_id and recipient_id = admin_user_id) or
        (sender_id = admin_user_id and recipient_id = NEW.sender_id)
      )
      and conversation_type = 'user_to_admin'
      and case_status = 'closed'
      limit 1
    ) into is_closed;
    
    -- If conversation is closed, prevent the insert
    if is_closed then
      raise exception 'Esta conversación ha sido cerrada. Por favor, crea un nuevo reporte si tienes otra inquietud.';
    end if;
  end if;
  
  return NEW;
end;
$$ language plpgsql;

-- Trigger to check conversation status before inserting a message
create or replace trigger prevent_messages_to_closed_conversations
  before insert on messages
  for each row
  execute function check_conversation_status();