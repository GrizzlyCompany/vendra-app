// Script to verify that messages are correctly updated
const { createClient } = require('@supabase/supabase-js');

// Use the service role key
const supabaseUrl = 'https://vvuvuibcmvqxtvdadwne.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ2dXZ1aWJjbXZxeHR2ZGFkd25lIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTkwODE5NywiZXhwIjoyMDcxNDg0MTk3fQ.eiZFOQ7wcO2cOYPuIWKV-e2U5Cl4Bv70QOfCiH--Uss';

async function verifyMessagesFix() {
  try {
    console.log('=== Verifying Messages Fix ===\n');
    
    // Create a client with the service role key
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // 1. Get admin user ID
    console.log('1. Getting admin user ID...');
    
    const { data: adminUser, error: adminError } = await supabase
      .from('users')
      .select('id')
      .eq('email', 'admin@vendra.com')
      .single();
    
    if (adminError) {
      console.log('❌ Error getting admin user:', adminError.message);
      return;
    }
    
    console.log('✅ Admin user ID:', adminUser.id);
    
    // 2. Check messages between admin and users with user_to_admin conversation type
    console.log('\n2. Checking messages with user_to_admin conversation type...');
    
    const { data: messagesData, error: messagesError } = await supabase
      .from('messages')
      .select(`
        id,
        sender_id,
        recipient_id,
        content,
        created_at,
        read_at,
        conversation_type,
        case_status,
        closed_at,
        closed_by
      `)
      .or(`sender_id.eq.${adminUser.id},recipient_id.eq.${adminUser.id}`)
      .eq('conversation_type', 'user_to_admin')
      .order('created_at', { ascending: false });
    
    if (messagesError) {
      console.log('❌ Error fetching messages:', messagesError.message);
      return;
    }
    
    console.log(`✅ Found ${messagesData.length} messages with user_to_admin type:`);
    messagesData.forEach((msg, index) => {
      console.log(`   ${index + 1}. ${msg.created_at} - ${msg.case_status}`);
      console.log(`      From: ${msg.sender_id}`);
      console.log(`      To: ${msg.recipient_id}`);
      console.log(`      Content: ${msg.content.substring(0, 100)}${msg.content.length > 100 ? '...' : ''}`);
    });
    
    // 3. Get user information for all involved users
    if (messagesData.length > 0) {
      console.log('\n3. Getting user information...');
      
      const userIds = new Set();
      messagesData.forEach((msg) => {
        if (msg.sender_id !== adminUser.id) userIds.add(msg.sender_id);
        if (msg.recipient_id !== adminUser.id) userIds.add(msg.recipient_id);
      });
      
      console.log('User IDs involved:', Array.from(userIds));
      
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, name, email')
        .in('id', Array.from(userIds));
      
      if (userError) {
        console.log('❌ Error fetching users:', userError.message);
      } else {
        console.log('✅ Found user data:');
        userData.forEach((user, index) => {
          console.log(`   ${index + 1}. ${user.id} - ${user.name} - ${user.email}`);
        });
      }
    }
    
    console.log('\n=== Verification Complete ===');
    
  } catch (error) {
    console.error('❌ Verification failed with error:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

verifyMessagesFix();