// Script to fix admin user role directly using Supabase client
const { createClient } = require('@supabase/supabase-js');

// Use the service role key
const supabaseUrl = 'https://vvuvuibcmvqxtvdadwne.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ2dXZ1aWJjbXZxeHR2ZGFkd25lIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTkwODE5NywiZXhwIjoyMDcxNDg0MTk3fQ.eiZFOQ7wcO2cOYPuIWKV-e2U5Cl4Bv70QOfCiH--Uss';

async function fixAdminRoleDirect() {
  try {
    console.log('=== Fixing Admin Role Directly ===\n');
    
    // Create a client with the service role key
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // 1. Update admin user role to empresa_constructora
    console.log('1. Updating admin user role to empresa_constructora...');
    
    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update({ role: 'empresa_constructora' })
      .eq('email', 'admin@vendra.com');
    
    if (updateError) {
      console.log('❌ Error updating admin role:', updateError.message);
    } else {
      console.log('✅ Admin role updated successfully');
    }
    
    // 2. Verify the update
    console.log('\n2. Verifying update...');
    
    const { data: adminUser, error: verifyError } = await supabase
      .from('users')
      .select('id, email, name, role')
      .eq('email', 'admin@vendra.com')
      .single();
    
    if (verifyError) {
      console.log('❌ Error verifying update:', verifyError.message);
    } else {
      console.log('✅ Admin user verified:');
      console.log('   ID:', adminUser.id);
      console.log('   Email:', adminUser.email);
      console.log('   Name:', adminUser.name);
      console.log('   Role:', adminUser.role);
    }
    
    // 3. Test the admin-get-messages function again
    console.log('\n3. Testing admin-get-messages function...');
    
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
    
    console.log('\n=== Fix Complete ===');
    
  } catch (error) {
    console.error('❌ Fix failed with error:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

fixAdminRoleDirect();