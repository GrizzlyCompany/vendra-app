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

async function testCloseCaseFunction() {
  try {
    console.log('=== Testing admin-close-case Function ===\n');
    
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
    
    // 2. Get a user ID to test with (let's use the first user from conversations)
    console.log('\n2. Getting conversations to find a user ID...');
    const { data: conversationsData, error: conversationsError } = await supabase.functions.invoke('admin-get-messages', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${signInData.session.access_token}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (conversationsError) {
      console.log('❌ Error fetching conversations:', conversationsError.message);
      return;
    }
    
    if (!conversationsData || !conversationsData.conversations || conversationsData.conversations.length === 0) {
      console.log('❌ No conversations found');
      return;
    }
    
    const testUserId = conversationsData.conversations[0].user_id;
    console.log(`✅ Found user ID to test with: ${testUserId}`);
    
    // 3. Test the admin-close-case function
    console.log('\n3. Calling admin-close-case function...');
    const { data: closeData, error: closeError } = await supabase.functions.invoke('admin-close-case', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${signInData.session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: { user_id: testUserId }
    });
    
    if (closeError) {
      console.log('❌ Error calling admin-close-case function:', closeError.message);
      console.log('Error details:', closeError);
      return;
    }
    
    console.log('✅ admin-close-case function executed successfully');
    console.log('Response:', JSON.stringify(closeData, null, 2));
    
    // 4. Test the admin-reopen-case function
    console.log('\n4. Calling admin-reopen-case function...');
    const { data: reopenData, error: reopenError } = await supabase.functions.invoke('admin-reopen-case', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${signInData.session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: { user_id: testUserId }
    });
    
    if (reopenError) {
      console.log('❌ Error calling admin-reopen-case function:', reopenError.message);
      console.log('Error details:', reopenError);
      return;
    }
    
    console.log('✅ admin-reopen-case function executed successfully');
    console.log('Response:', JSON.stringify(reopenData, null, 2));
    
    console.log('\n=== Test Complete ===');
    console.log('\nYou should now be able to close and reopen cases in the admin panel without errors.');
    
  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

testCloseCaseFunction();