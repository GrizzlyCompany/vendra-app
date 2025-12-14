const { createClient } = require('@supabase/supabase-js');

// Load environment variables from .env.local
require('dotenv').config({ path: '.env.local' });

// Check if required environment variables are set
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Environment variables not set');
  console.error('Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function diagnoseAdminMessages() {
  try {
    console.log('=== Admin Messaging Diagnostic ===\n');
    
    // 1. Check all users in the database
    console.log('1. Checking all users in database...');
    
    const { data: allUsers, error: usersError } = await supabase
      .from('users')
      .select('id, email, name, role')
      .limit(10);
    
    if (usersError) {
      console.log('❌ Error querying users:', usersError.message);
      return;
    }
    
    console.log(`✅ Found ${allUsers.length} users:`);
    allUsers.forEach((user, index) => {
      console.log(`   ${index + 1}. ${user.email} - ${user.name} - ${user.role}`);
    });
    
    // 2. Check specifically for admin user
    console.log('\n2. Checking specifically for admin user...');
    
    const { data: adminUsers, error: adminError } = await supabase
      .from('users')
      .select('id, email, name, role')
      .eq('email', 'admin@vendra.com');
    
    if (adminError) {
      console.log('❌ Error querying admin user:', adminError.message);
      return;
    }
    
    if (!adminUsers || adminUsers.length === 0) {
      console.log('❌ Admin user not found in database');
    } else {
      const adminUser = adminUsers[0];
      console.log('✅ Admin user found:');
      console.log('   ID:', adminUser.id);
      console.log('   Email:', adminUser.email);
      console.log('   Name:', adminUser.name);
      console.log('   Role:', adminUser.role);
    }
    
    // 3. Check admin public profile
    console.log('\n3. Checking admin public profile...');
    const { data: adminProfiles, error: profileError } = await supabase
      .from('public_profiles')
      .select('id, name, email, role')
      .eq('email', 'admin@vendra.com');
    
    if (profileError) {
      console.log('❌ Error querying admin public profile:', profileError.message);
    } else if (!adminProfiles || adminProfiles.length === 0) {
      console.log('❌ Admin public profile not found');
    } else {
      const adminProfile = adminProfiles[0];
      console.log('✅ Admin public profile found:');
      console.log('   ID:', adminProfile.id);
      console.log('   Name:', adminProfile.name);
      console.log('   Email:', adminProfile.email);
      console.log('   Role:', adminProfile.role);
    }
    
    // 4. Test the admin-get-messages function directly
    console.log('\n4. Testing admin-get-messages function...');
    
    try {
      const response = await fetch(`${supabaseUrl}/functions/v1/admin-get-messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseKey}`
        }
      });
      
      const result = await response.json();
      console.log('   Function response status:', response.status);
      console.log('   Function response:', JSON.stringify(result, null, 2));
      
      if (response.ok) {
        console.log('✅ Function executed successfully');
      } else {
        console.log('❌ Function execution failed');
        console.log('   Status:', response.status);
        console.log('   Error:', result.error || 'Unknown error');
      }
    } catch (functionError) {
      console.log('❌ Error calling function:', functionError.message);
    }
    
    // 5. Check messages in database
    console.log('\n5. Checking messages in database...');
    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select('id, sender_id, recipient_id, content, created_at, conversation_type, case_status')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (messagesError) {
      console.log('❌ Error fetching messages:', messagesError.message);
    } else {
      console.log(`✅ Found ${messages.length} recent messages:`);
      messages.forEach((msg, index) => {
        console.log(`   ${index + 1}. ${msg.created_at} - ${msg.conversation_type} - ${msg.case_status}`);
        console.log(`      Content: ${msg.content.substring(0, 50)}${msg.content.length > 50 ? '...' : ''}`);
      });
    }
    
    console.log('\n=== Diagnostic Complete ===');
    
  } catch (error) {
    console.error('❌ Diagnostic failed with error:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

diagnoseAdminMessages();