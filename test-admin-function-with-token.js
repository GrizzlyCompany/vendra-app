// Test the admin-get-messages function with a proper user token
const { createClient } = require('@supabase/supabase-js');

// Use the service role key to sign in as admin and get a user token
const supabaseUrl = 'https://vvuvuibcmvqxtvdadwne.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ2dXZ1aWJjbXZxeHR2ZGFkd25lIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTkwODE5NywiZXhwIjoyMDcxNDg0MTk3fQ.eiZFOQ7wcO2cOYPuIWKV-e2U5Cl4Bv70QOfCiH--Uss';

async function testAdminFunctionWithToken() {
  try {
    console.log('=== Testing admin-get-messages function with user token ===\n');
    
    // Create a client with the service role key to sign in as admin
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get the admin user data
    const { data: adminUsers, error: adminError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (adminError) {
      console.log('❌ Error getting admin users:', adminError.message);
      return;
    }
    
    // Find the admin user
    const adminUser = adminUsers.users.find(user => user.email === 'admin@vendra.com');
    
    if (!adminUser) {
      console.log('❌ Admin user not found');
      return;
    }
    
    console.log('✅ Found admin user:', adminUser.email);
    
    // Create a session for the admin user
    const { data: sessionData, error: sessionError } = await supabaseAdmin.auth.admin.createSession(adminUser.id);
    
    if (sessionError) {
      console.log('❌ Error creating session:', sessionError.message);
      return;
    }
    
    const userToken = sessionData.session.access_token;
    console.log('✅ Got user token');
    
    // Test the function with the user token
    console.log('\n1. Testing with user token in Authorization header...');
    
    const response = await fetch(`${supabaseUrl}/functions/v1/admin-get-messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userToken}`
      }
    });
    
    const result = await response.json();
    console.log('   Response status:', response.status);
    console.log('   Response:', JSON.stringify(result, null, 2));
    
    console.log('\n=== Test Complete ===');
    
  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

testAdminFunctionWithToken();