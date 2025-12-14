// Script to check database directly with service role key
const { createClient } = require('@supabase/supabase-js');

// Use the service role key from the create-admin-user script
const supabaseUrl = 'https://vvuvuibcmvqxtvdadwne.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ2dXZ1aWJjbXZxeHR2ZGFkd25lIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTkwODE5NywiZXhwIjoyMDcxNDg0MTk3fQ.eiZFOQ7wcO2cOYPuIWKV-e2U5Cl4Bv70QOfCiH--Uss';

// Create client with service role key for admin access
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkDatabase() {
  try {
    console.log('=== Database Check ===\n');
    
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
    
    // 4. Check messages with user_to_admin conversation type
    console.log('\n4. Checking messages with user_to_admin conversation type...');
    const { data: adminMessages, error: adminMessagesError } = await supabase
      .from('messages')
      .select('id, sender_id, recipient_id, content, created_at, conversation_type, case_status')
      .eq('conversation_type', 'user_to_admin')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (adminMessagesError) {
      console.log('❌ Error fetching admin messages:', adminMessagesError.message);
    } else {
      console.log(`✅ Found ${adminMessages.length} admin messages:`);
      adminMessages.forEach((msg, index) => {
        console.log(`   ${index + 1}. ${msg.created_at} - ${msg.case_status}`);
        console.log(`      Content: ${msg.content.substring(0, 100)}${msg.content.length > 100 ? '...' : ''}`);
      });
    }
    
    // 5. Check messages with admin_to_user conversation type
    console.log('\n5. Checking messages with admin_to_user conversation type...');
    const { data: adminToUserMessages, error: adminToUserMessagesError } = await supabase
      .from('messages')
      .select('id, sender_id, recipient_id, content, created_at, conversation_type, case_status')
      .eq('conversation_type', 'admin_to_user')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (adminToUserMessagesError) {
      console.log('❌ Error fetching admin_to_user messages:', adminToUserMessagesError.message);
    } else {
      console.log(`✅ Found ${adminToUserMessages.length} admin_to_user messages:`);
      adminToUserMessages.forEach((msg, index) => {
        console.log(`   ${index + 1}. ${msg.created_at} - ${msg.case_status}`);
        console.log(`      Content: ${msg.content.substring(0, 100)}${msg.content.length > 100 ? '...' : ''}`);
      });
    }
    
    // 6. Check messages with user_to_user conversation type
    console.log('\n6. Checking messages with user_to_user conversation type...');
    const { data: userMessages, error: userMessagesError } = await supabase
      .from('messages')
      .select('id, sender_id, recipient_id, content, created_at, conversation_type, case_status')
      .eq('conversation_type', 'user_to_user')
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (userMessagesError) {
      console.log('❌ Error fetching user messages:', userMessagesError.message);
    } else {
      console.log(`✅ Found ${userMessages.length} user messages:`);
      userMessages.forEach((msg, index) => {
        console.log(`   ${index + 1}. ${msg.created_at} - ${msg.case_status}`);
        console.log(`      Content: ${msg.content.substring(0, 100)}${msg.content.length > 100 ? '...' : ''}`);
      });
    }
    
    // 7. Check all messages
    console.log('\n7. Checking all messages in database...');
    const { data: allMessages, error: allMessagesError } = await supabase
      .from('messages')
      .select('id, sender_id, recipient_id, content, created_at, conversation_type, case_status')
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (allMessagesError) {
      console.log('❌ Error fetching all messages:', allMessagesError.message);
    } else {
      console.log(`✅ Found ${allMessages.length} messages:`);
      allMessages.forEach((msg, index) => {
        console.log(`   ${index + 1}. ${msg.created_at} - ${msg.conversation_type} - ${msg.case_status}`);
        console.log(`      Content: ${msg.content.substring(0, 100)}${msg.content.length > 100 ? '...' : ''}`);
      });
    }
    
    // 8. Check specific messages that look like reports
    console.log('\n8. Checking messages that look like reports...');
    const { data: reportMessages, error: reportMessagesError } = await supabase
      .from('messages')
      .select('id, sender_id, recipient_id, content, created_at, conversation_type, case_status')
      .ilike('content', '%Nuevo Reporte Recibido%')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (reportMessagesError) {
      console.log('❌ Error fetching report messages:', reportMessagesError.message);
    } else {
      console.log(`✅ Found ${reportMessages.length} report messages:`);
      reportMessages.forEach((msg, index) => {
        console.log(`   ${index + 1}. ${msg.created_at} - ${msg.conversation_type} - ${msg.case_status}`);
        console.log(`      Content: ${msg.content.substring(0, 100)}${msg.content.length > 100 ? '...' : ''}`);
      });
    }
    
    console.log('\n=== Database Check Complete ===');
    
  } catch (error) {
    console.error('❌ Database check failed with error:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

checkDatabase();