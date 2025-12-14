// Script to debug the admin-get-messages function step by step
const { createClient } = require('@supabase/supabase-js');

// Use the service role key
const supabaseUrl = 'https://vvuvuibcmvqxtvdadwne.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ2dXZ1aWJjbXZxeHR2ZGFkd25lIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTkwODE5NywiZXhwIjoyMDcxNDg0MTk3fQ.eiZFOQ7wcO2cOYPuIWKV-e2U5Cl4Bv70QOfCiH--Uss';

async function debugAdminFunction() {
  try {
    console.log('=== Debugging Admin Function Step by Step ===\n');
    
    // Create a client with the service role key
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // 1. Sign in as admin to get a proper token
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
    
    // 2. Test each step of the admin-get-messages function
    console.log('\n2. Testing function steps...');
    
    // Step 1: Get admin user ID
    console.log('   Step 1: Getting admin user ID...');
    
    const { data: adminUser, error: adminError } = await supabase
      .from('users')
      .select('id')
      .eq('email', 'admin@vendra.com')
      .single();
    
    if (adminError) {
      console.log('   ❌ Error getting admin user:', adminError.message);
      return;
    }
    
    console.log('   ✅ Admin user ID:', adminUser.id);
    
    // Step 2: Get messages between admin and users with user_to_admin conversation type
    console.log('   Step 2: Getting messages with user_to_admin type...');
    
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
      console.log('   ❌ Error fetching messages:', messagesError.message);
      return;
    }
    
    console.log(`   ✅ Found ${messagesData.length} messages with user_to_admin type`);
    
    if (messagesData.length === 0) {
      console.log('   ✅ No messages found, function should return empty array');
      
      // Test the actual function
      const response = await fetch(`${supabaseUrl}/functions/v1/admin-get-messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${signInData.session.access_token}`
        }
      });
      
      const result = await response.json();
      console.log('   Function response status:', response.status);
      console.log('   Function response:', JSON.stringify(result, null, 2));
      
      return;
    }
    
    // Step 3: Get all user IDs involved in conversations
    console.log('   Step 3: Getting user IDs involved in conversations...');
    
    const userIds = new Set();
    messagesData.forEach((msg) => {
      if (msg.sender_id !== adminUser.id) userIds.add(msg.sender_id);
      if (msg.recipient_id !== adminUser.id) userIds.add(msg.recipient_id);
    });
    
    console.log('   User IDs involved:', Array.from(userIds));
    
    // Step 4: Get user information for all involved users
    console.log('   Step 4: Getting user information...');
    
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, name, email')
      .in('id', Array.from(userIds));
    
    if (userError) {
      console.log('   ❌ Error fetching users:', userError.message);
      return;
    }
    
    console.log('   ✅ Found user data for', userData.length, 'users');
    userData.forEach((user, index) => {
      console.log(`      ${index + 1}. ${user.id} - ${user.name} - ${user.email}`);
    });
    
    // Step 5: Test the actual function
    console.log('   Step 5: Testing the actual function...');
    
    const response = await fetch(`${supabaseUrl}/functions/v1/admin-get-messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${signInData.session.access_token}`
      }
    });
    
    const result = await response.json();
    console.log('   Function response status:', response.status);
    console.log('   Function response:', JSON.stringify(result, null, 2));
    
    console.log('\n=== Debug Complete ===');
    
  } catch (error) {
    console.error('❌ Debug failed with error:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

debugAdminFunction();