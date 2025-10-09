const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Configuration from environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Environment variables not set correctly');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testAdminFunction() {
  try {
    console.log('=== Testing admin-get-messages Function ===\n');
    
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
    
    // 2. Test the admin-get-messages function
    console.log('\n2. Calling admin-get-messages function...');
    
    // Using the Supabase functions API
    const { data, error } = await supabase.functions.invoke('admin-get-messages', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (error) {
      console.log('❌ Error calling admin-get-messages function:', error.message);
      console.log('Error details:', error);
      return;
    }
    
    console.log('✅ Function executed successfully');
    console.log('Response:', JSON.stringify(data, null, 2));
    
    if (data && data.conversations) {
      console.log(`\n✅ Found ${data.conversations.length} conversations:`);
      data.conversations.slice(0, 3).forEach((conv, index) => {
        console.log(`  ${index + 1}. ${conv.user_name} (${conv.user_email})`);
        console.log(`     Messages: ${conv.message_count}, Unread: ${conv.unread_count || 0}`);
        console.log(`     Last message: ${conv.last_message.content.substring(0, 50)}${conv.last_message.content.length > 50 ? '...' : ''}`);
      });
    } else {
      console.log('⚠️  No conversations found in response');
    }
    
    console.log('\n=== Test Complete ===');
    
  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

testAdminFunction();