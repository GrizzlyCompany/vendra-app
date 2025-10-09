// Final test of the admin-get-messages function
const { createClient } = require('@supabase/supabase-js');

// Use the service role key
const supabaseUrl = 'https://vvuvuibcmvqxtvdadwne.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ2dXZ1aWJjbXZxeHR2ZGFkd25lIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTkwODE5NywiZXhwIjoyMDcxNDg0MTk3fQ.eiZFOQ7wcO2cOYPuIWKV-e2U5Cl4Bv70QOfCiH--Uss';

async function testAdminFunctionFinal() {
  try {
    console.log('=== Final Test of Admin Function ===\n');
    
    // Create a client with the service role key
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Sign in as admin to get a proper token
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: 'admin@vendra.com',
      password: 'Admin123!'
    });
    
    if (signInError) {
      console.log('❌ Error signing in as admin:', signInError.message);
      return;
    }
    
    console.log('✅ Signed in as admin successfully');
    
    // Test the function
    console.log('\nTesting admin-get-messages function...');
    
    const response = await fetch(`${supabaseUrl}/functions/v1/admin-get-messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${signInData.session.access_token}`
      }
    });
    
    const result = await response.json();
    console.log('Function response status:', response.status);
    
    if (response.status === 200) {
      console.log('✅ Function executed successfully');
      console.log('Found', result.conversations.length, 'conversations:');
      result.conversations.forEach((conv, index) => {
        console.log(`   ${index + 1}. ${conv.user_name} (${conv.user_email})`);
        console.log(`      Messages: ${conv.message_count}, Unread: ${conv.unread_count}`);
        console.log(`      Last message: ${conv.last_message.content.substring(0, 50)}...`);
      });
    } else {
      console.log('❌ Function failed');
      console.log('Error:', result.error);
      if (result.stack) {
        console.log('Stack trace:', result.stack);
      }
    }
    
    console.log('\n=== Test Complete ===');
    
  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

testAdminFunctionFinal();