// Script to reset admin password and test authentication
const { createClient } = require('@supabase/supabase-js');

// Use the service role key
const supabaseUrl = 'https://vvuvuibcmvqxtvdadwne.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ2dXZ1aWJjbXZxeHR2ZGFkd25lIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTkwODE5NywiZXhwIjoyMDcxNDg0MTk3fQ.eiZFOQ7wcO2cOYPuIWKV-e2U5Cl4Bv70QOfCiH--Uss';

async function resetAdminPassword() {
  try {
    console.log('=== Resetting admin password ===\n');
    
    // Create a client with the service role key
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get the admin user
    const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (authError) {
      console.log('❌ Error getting auth users:', authError.message);
      return;
    }
    
    // Find the admin user
    const adminUser = authUsers.users.find(user => user.email === 'admin@vendra.com');
    
    if (!adminUser) {
      console.log('❌ Admin user not found');
      return;
    }
    
    console.log('✅ Found admin user:', adminUser.email, adminUser.id);
    
    // Reset the admin user's password
    const newPassword = 'Admin123!'; // Simple password for testing
    const { data: updateData, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      adminUser.id,
      { password: newPassword }
    );
    
    if (updateError) {
      console.log('❌ Error updating admin password:', updateError.message);
      return;
    }
    
    console.log('✅ Admin password updated successfully');
    
    // Now try to sign in as the admin user
    console.log('\n=== Testing sign in ===');
    
    // Create a new client for regular user authentication
    const supabaseUser = createClient(supabaseUrl, supabaseServiceKey);
    
    const { data: signInData, error: signInError } = await supabaseUser.auth.signInWithPassword({
      email: 'admin@vendra.com',
      password: newPassword
    });
    
    if (signInError) {
      console.log('❌ Error signing in as admin:', signInError.message);
      return;
    }
    
    console.log('✅ Signed in as admin successfully');
    console.log('User token:', signInData.session.access_token);
    
    // Test the admin-get-messages function with the user token
    console.log('\n=== Testing admin-get-messages function ===');
    
    const response = await fetch(`${supabaseUrl}/functions/v1/admin-get-messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${signInData.session.access_token}`
      }
    });
    
    const result = await response.json();
    console.log('   Response status:', response.status);
    console.log('   Response:', JSON.stringify(result, null, 2));
    
    console.log('\n=== Reset Complete ===');
    
  } catch (error) {
    console.error('❌ Reset failed with error:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

resetAdminPassword();