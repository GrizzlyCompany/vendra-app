// Script to debug admin messages issue
const { createClient } = require('@supabase/supabase-js');

// Configuration - replace with your actual Supabase credentials
const supabaseUrl = process.env.SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'your-service-role-key';

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugAdminMessages() {
  try {
    console.log('=== Debugging Admin Messages Issue ===\n');
    
    // 1. Get admin user
    console.log('1. Getting admin user...');
    const { data: adminUser, error: adminError } = await supabase
      .from('users')
      .select('id, email, name')
      .eq('email', 'admin@vendra.com')
      .single();

    if (adminError) {
      console.log('❌ Admin user not found:', adminError.message);
      return;
    }
    
    console.log('✅ Admin user:', adminUser);
    
    // 2. Check if admin-get-messages function works
    console.log('\n2. Testing admin-get-messages function...');
    
    // Sign in as admin first (you'll need to provide the admin password)
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: 'admin@vendra.com',
      password: 'Admin123!' // Replace with actual admin password
    });
    
    if (signInError) {
      console.log('❌ Error signing in as admin:', signInError.message);
      return;
    }
    
    console.log('✅ Signed in as admin');
    
    // Test the function
    const response = await fetch(`${supabaseUrl}/functions/v1/admin-get-messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${signInData.session.access_token}`
      }
    });
    
    console.log('Function response status:', response.status);
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Function executed successfully');
      console.log('Conversations found:', result.conversations?.length || 0);
      
      if (result.conversations && result.conversations.length > 0) {
        console.log('\nFirst 3 conversations:');
        result.conversations.slice(0, 3).forEach((conv, index) => {
          console.log(`  ${index + 1}. ${conv.user_name} (${conv.user_email}) - ${conv.message_count} messages`);
          console.log(`     Last message: ${conv.last_message.content.substring(0, 50)}${conv.last_message.content.length > 50 ? '...' : ''}`);
          console.log(`     Case status: ${conv.case_status}`);
          console.log(`     Conversation type: ${conv.conversation_type}`);
        });
      }
    } else {
      const errorText = await response.text();
      console.log('❌ Function failed:', errorText);
    }
    
    // 3. Direct database query to check messages
    console.log('\n3. Checking messages directly from database...');
    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select(`
        id,
        sender_id,
        recipient_id,
        content,
        created_at,
        conversation_type,
        case_status,
        sender:sender_id(email, name),
        recipient:recipient_id(email, name)
      `)
      .or(`sender_id.eq.${adminUser.id},recipient_id.eq.${adminUser.id}`)
      .order('created_at', { ascending: false })
      .limit(10);
      
    if (messagesError) {
      console.log('❌ Error fetching messages:', messagesError.message);
    } else {
      console.log(`✅ Found ${messages.length} messages involving admin:`);
      messages.forEach((msg, index) => {
        const sender = msg.sender ? `${msg.sender.name || msg.sender.email}` : 'Unknown';
        const recipient = msg.recipient ? `${msg.recipient.name || msg.recipient.email}` : 'Unknown';
        console.log(`  ${index + 1}. [${msg.conversation_type}] [${msg.case_status}] ${sender} -> ${recipient}`);
        console.log(`     Content: ${msg.content.substring(0, 60)}${msg.content.length > 60 ? '...' : ''}`);
      });
    }
    
    // 4. Check for user_to_admin messages specifically
    console.log('\n4. Checking user_to_admin messages specifically...');
    const { data: userAdminMessages, error: userAdminError } = await supabase
      .from('messages')
      .select(`
        id,
        sender_id,
        recipient_id,
        content,
        created_at,
        conversation_type,
        case_status,
        sender:sender_id(email, name),
        recipient:recipient_id(email, name)
      `)
      .eq('conversation_type', 'user_to_admin')
      .order('created_at', { ascending: false })
      .limit(10);
      
    if (userAdminError) {
      console.log('❌ Error fetching user_to_admin messages:', userAdminError.message);
    } else {
      console.log(`✅ Found ${userAdminMessages.length} user_to_admin messages:`);
      userAdminMessages.forEach((msg, index) => {
        const sender = msg.sender ? `${msg.sender.name || msg.sender.email}` : 'Unknown';
        const recipient = msg.recipient ? `${msg.recipient.name || msg.recipient.email}` : 'Unknown';
        console.log(`  ${index + 1}. ${sender} -> ${recipient}`);
        console.log(`     Content: ${msg.content.substring(0, 60)}${msg.content.length > 60 ? '...' : ''}`);
        console.log(`     Case status: ${msg.case_status}`);
      });
    }
    
    // 5. Check for messages that should be user_to_admin but aren't
    console.log('\n5. Checking for messages that should be user_to_admin but aren\'t...');
    const { data: potentialMessages, error: potentialError } = await supabase
      .from('messages')
      .select(`
        id,
        sender_id,
        recipient_id,
        content,
        created_at,
        conversation_type,
        case_status,
        sender:sender_id(email, name),
        recipient:recipient_id(email, name)
      `)
      .ilike('content', '%Nuevo Reporte%')
      .neq('conversation_type', 'user_to_admin')
      .order('created_at', { ascending: false });
      
    if (potentialError) {
      console.log('❌ Error checking potential messages:', potentialError.message);
    } else if (potentialMessages.length > 0) {
      console.log(`⚠️  Found ${potentialMessages.length} messages that should be user_to_admin but aren't:`);
      potentialMessages.forEach((msg, index) => {
        const sender = msg.sender ? `${msg.sender.name || msg.sender.email}` : 'Unknown';
        const recipient = msg.recipient ? `${msg.recipient.name || msg.recipient.email}` : 'Unknown';
        console.log(`  ${index + 1}. [${msg.conversation_type}] ${sender} -> ${recipient}`);
        console.log(`     Content: ${msg.content.substring(0, 60)}${msg.content.length > 60 ? '...' : ''}`);
      });
    } else {
      console.log('✅ No misclassified report messages found');
    }
    
    console.log('\n=== Debug Complete ===');
    
  } catch (error) {
    console.error('❌ Debug failed with error:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Run the debug
debugAdminMessages();