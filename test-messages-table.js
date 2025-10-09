// Test script to verify MessagesTable component functionality
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Configuration from environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Environment variables not set correctly');
  console.error('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? 'SET' : 'MISSING');
  console.error('NEXT_PUBLIC_SUPABASE_ANON_KEY:', supabaseAnonKey ? 'SET' : 'MISSING');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testMessagesTable() {
  try {
    console.log('=== Testing MessagesTable Component Functionality ===\n');
    
    // 1. Sign in as admin
    console.log('1. Signing in as admin...');
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: 'admin@vendra.com',
      password: 'Admin123!'
    });
    
    if (signInError) {
      console.log('❌ Error signing in as admin:', signInError.message);
      return;
    }
    
    console.log('✅ Signed in as admin successfully');
    const accessToken = signInData.session.access_token;
    
    // 2. Test fetching conversations (same as MessagesTable does)
    console.log('\n2. Fetching conversations (as MessagesTable does)...');
    
    const { data: conversationsData, error: conversationsError } = await supabase.functions.invoke('admin-get-messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (conversationsError) {
      console.log('❌ Error fetching conversations:', conversationsError.message);
      return;
    }
    
    console.log('✅ Conversations fetched successfully');
    console.log(`Found ${conversationsData.conversations.length} conversations:`);
    
    conversationsData.conversations.forEach((conversation, index) => {
      console.log(`  ${index + 1}. ${conversation.user_name} (${conversation.user_email})`);
      console.log(`     Status: ${conversation.case_status}, Messages: ${conversation.message_count}`);
      console.log(`     Last message: ${conversation.last_message.content.substring(0, 50)}${conversation.last_message.content.length > 50 ? '...' : ''}`);
    });
    
    console.log('\n=== Test Complete ===');
    console.log('\nIf you see conversations listed above but still don\'t see them in the admin panel:');
    console.log('1. Check browser console for JavaScript errors');
    console.log('2. Verify the MessagesTable component is properly rendering the data');
    console.log('3. Check if there are any CSS issues hiding the elements');
    
  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

testMessagesTable();