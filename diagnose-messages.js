// Diagnostic script to check the current state of messages in the database
const { createClient } = require('@supabase/supabase-js');

// Configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://vvuvuibcmvqxtvdadwne.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ2dXZ1aWJjbXZxeHR2ZGFkd25lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU5MDgxOTcsImV4cCI6MjA3MTQ4NDE5N30.1JPZQ5K42aJtK3HBoVZQ4Qghe0N639lN5By0N4X3T4Y';

async function diagnoseMessages() {
  try {
    console.log('=== Diagnosing Messages in Database ===\n');
    
    // Create a client
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    
    // 1. Check if we can authenticate as admin
    console.log('1. Attempting to sign in as admin...');
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: 'admin@vendra.com',
      password: 'Admin123!'
    });
    
    if (signInError) {
      console.log('❌ Error signing in as admin:', signInError.message);
      return;
    }
    
    console.log('✅ Signed in as admin successfully\n');
    
    // 2. Fetch all messages with user_to_admin conversation type
    console.log('2. Fetching all user_to_admin messages...');
    const { data: adminMessages, error: messagesError } = await supabase
      .from('messages')
      .select(`
        id,
        sender_id,
        recipient_id,
        content,
        created_at,
        conversation_type,
        case_status,
        closed_at,
        closed_by
      `)
      .eq('conversation_type', 'user_to_admin')
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (messagesError) {
      console.log('❌ Error fetching messages:', messagesError.message);
      return;
    }
    
    console.log(`✅ Found ${adminMessages.length} user_to_admin messages:`);
    adminMessages.forEach((msg, index) => {
      console.log(`\n   Message ${index + 1}:`);
      console.log(`     ID: ${msg.id}`);
      console.log(`     Sender ID: ${msg.sender_id}`);
      console.log(`     Recipient ID: ${msg.recipient_id}`);
      console.log(`     Created: ${msg.created_at}`);
      console.log(`     Type: ${msg.conversation_type}`);
      console.log(`     Status: ${msg.case_status}`);
      console.log(`     Closed At: ${msg.closed_at || 'Not closed'}`);
      console.log(`     Content Preview: ${msg.content.substring(0, 100)}${msg.content.length > 100 ? '...' : ''}`);
    });
    
    // 3. Check for messages that might contain "Nuevo Reporte" but have wrong conversation type
    console.log('\n3. Checking for report messages with incorrect conversation type...');
    const { data: reportMessages, error: reportError } = await supabase
      .from('messages')
      .select(`
        id,
        sender_id,
        recipient_id,
        content,
        created_at,
        conversation_type,
        case_status
      `)
      .ilike('content', '%Nuevo Reporte%')
      .neq('conversation_type', 'user_to_admin')
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (reportError) {
      console.log('❌ Error fetching report messages:', reportError.message);
    } else if (reportMessages.length > 0) {
      console.log(`⚠️  Found ${reportMessages.length} report messages with incorrect conversation type:`);
      reportMessages.forEach((msg, index) => {
        console.log(`\n   Report Message ${index + 1}:`);
        console.log(`     ID: ${msg.id}`);
        console.log(`     Type: ${msg.conversation_type} (should be user_to_admin)`);
        console.log(`     Status: ${msg.case_status}`);
        console.log(`     Content Preview: ${msg.content.substring(0, 100)}${msg.content.length > 100 ? '...' : ''}`);
      });
    } else {
      console.log('✅ No report messages with incorrect conversation type found');
    }
    
    // 4. Test the admin-get-messages function
    console.log('\n4. Testing admin-get-messages function...');
    const response = await fetch(`${supabaseUrl}/functions/v1/admin-get-messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${signInData.session.access_token}`
      }
    });
    
    console.log('   Function response status:', response.status);
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Function executed successfully');
      if (result.conversations) {
        console.log(`   Found ${result.conversations.length} conversations`);
        result.conversations.forEach((conv, index) => {
          console.log(`\n   Conversation ${index + 1}:`);
          console.log(`     User: ${conv.user_name} (${conv.user_email})`);
          console.log(`     Status: ${conv.case_status}`);
          console.log(`     Messages: ${conv.message_count}`);
          console.log(`     Unread: ${conv.unread_count || 0}`);
          console.log(`     Last Message: ${conv.last_message.content.substring(0, 50)}${conv.last_message.content.length > 50 ? '...' : ''}`);
        });
      } else {
        console.log('   No conversations data in response');
        console.log('   Response:', JSON.stringify(result, null, 2));
      }
    } else {
      const errorText = await response.text();
      console.log('❌ Function failed with status', response.status);
      console.log('   Error:', errorText);
    }
    
    console.log('\n=== Diagnosis Complete ===');
    
  } catch (error) {
    console.error('❌ Diagnosis failed with error:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

diagnoseMessages();