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

async function testAdminFix() {
  try {
    console.log('=== Testing Admin Message Visibility Fix ===\n');
    
    // 1. Try to sign in as admin
    console.log('1. Signing in as admin...');
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: 'admin@vendra.com',
      password: 'Admin123!'
    });
    
    if (signInError) {
      console.log('❌ Error signing in as admin:', signInError.message);
      // Try to continue without auth for basic checks
    } else {
      console.log('✅ Signed in as admin successfully');
    }
    
    // 2. Check if admin user exists in users table
    console.log('\n2. Checking for admin user in users table...');
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email, name, role')
      .eq('email', 'admin@vendra.com');
    
    if (usersError) {
      console.log('❌ Error querying users table:', usersError.message);
    } else if (users && users.length > 0) {
      console.log('✅ Admin user found in users table:');
      users.forEach((user, index) => {
        console.log(`   ${index + 1}. ${user.email} - ${user.name} - ${user.role}`);
      });
    } else {
      console.log('⚠️  Admin user not found in users table');
      console.log('   (This might be expected if only public_profiles exist)');
    }
    
    // 3. Check admin public profile
    console.log('\n3. Checking admin public profile...');
    const { data: profiles, error: profilesError } = await supabase
      .from('public_profiles')
      .select('id, name, email, role')
      .eq('email', 'admin@vendra.com');
    
    if (profilesError) {
      console.log('❌ Error querying public_profiles table:', profilesError.message);
    } else if (profiles && profiles.length > 0) {
      console.log('✅ Admin public profile found:');
      profiles.forEach((profile, index) => {
        console.log(`   ${index + 1}. ${profile.email} - ${profile.name} - ${profile.role}`);
      });
    } else {
      console.log('❌ Admin public profile not found');
    }
    
    // 4. Check messages table structure
    console.log('\n4. Checking messages table structure...');
    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select('id, sender_id, recipient_id, content, created_at, conversation_type, case_status')
      .order('created_at', { ascending: false })
      .limit(3);
    
    if (messagesError) {
      console.log('❌ Error querying messages table:', messagesError.message);
    } else {
      console.log(`✅ Found ${messages.length} messages in table:`);
      messages.forEach((msg, index) => {
        console.log(`   ${index + 1}. ${msg.created_at} - ${msg.conversation_type} - ${msg.case_status}`);
        console.log(`      From: ${msg.sender_id} To: ${msg.recipient_id}`);
        console.log(`      Content: ${msg.content.substring(0, 50)}${msg.content.length > 50 ? '...' : ''}`);
      });
    }
    
    // 5. Check specifically for user_to_admin messages
    console.log('\n5. Checking for user_to_admin messages...');
    const { data: userAdminMessages, error: userAdminError } = await supabase
      .from('messages')
      .select('id, sender_id, recipient_id, content, created_at, conversation_type')
      .eq('conversation_type', 'user_to_admin')
      .order('created_at', { ascending: false })
      .limit(3);
    
    if (userAdminError) {
      console.log('❌ Error querying user_to_admin messages:', userAdminError.message);
    } else {
      console.log(`✅ Found ${userAdminMessages.length} user_to_admin messages:`);
      userAdminMessages.forEach((msg, index) => {
        console.log(`   ${index + 1}. ${msg.created_at}`);
        console.log(`      From: ${msg.sender_id} To: ${msg.recipient_id}`);
        console.log(`      Content: ${msg.content.substring(0, 50)}${msg.content.length > 50 ? '...' : ''}`);
      });
    }
    
    // 6. Check for messages with "Nuevo Reporte" content
    console.log('\n6. Checking for messages with "Nuevo Reporte" content...');
    const { data: reportMessages, error: reportError } = await supabase
      .from('messages')
      .select('id, sender_id, recipient_id, content, created_at, conversation_type, case_status')
      .ilike('content', '%Nuevo Reporte%')
      .order('created_at', { ascending: false })
      .limit(3);
    
    if (reportError) {
      console.log('❌ Error querying report messages:', reportError.message);
    } else {
      console.log(`✅ Found ${reportMessages.length} messages with "Nuevo Reporte":`);
      reportMessages.forEach((msg, index) => {
        console.log(`   ${index + 1}. ${msg.created_at} - ${msg.conversation_type} - ${msg.case_status}`);
        console.log(`      From: ${msg.sender_id} To: ${msg.recipient_id}`);
        console.log(`      Content: ${msg.content.substring(0, 50)}${msg.content.length > 50 ? '...' : ''}`);
      });
    }
    
    console.log('\n=== Test Complete ===');
    console.log('\nNext steps:');
    console.log('1. Refresh the admin panel at /admin');
    console.log('2. Check if user messages are now visible');
    console.log('3. If not, check the browser console for errors');
    
  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

testAdminFix();