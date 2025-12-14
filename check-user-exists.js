// Script to check if a specific user exists
const { createClient } = require('@supabase/supabase-js');

// Use the service role key
const supabaseUrl = 'https://vvuvuibcmvqxtvdadwne.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ2dXZ1aWJjbXZxeHR2ZGFkd25lIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTkwODE5NywiZXhwIjoyMDcxNDg0MTk3fQ.eiZFOQ7wcO2cOYPuIWKV-e2U5Cl4Bv70QOfCiH--Uss';

async function checkUserExists() {
  try {
    console.log('=== Checking if User Exists ===\n');
    
    // Create a client with the service role key
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const userId = '503e1035-8781-4b87-b1fe-46305d8f6842';
    
    // Check if user exists in auth.users
    console.log('1. Checking if user exists in auth.users...');
    
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.log('❌ Error getting auth users:', authError.message);
      return;
    }
    
    const authUser = authUsers.users.find(user => user.id === userId);
    
    if (authUser) {
      console.log('✅ User found in auth.users:');
      console.log('   ID:', authUser.id);
      console.log('   Email:', authUser.email);
      console.log('   Email confirmed:', authUser.email_confirmed_at);
    } else {
      console.log('❌ User not found in auth.users');
    }
    
    // Check if user exists in public.users
    console.log('\n2. Checking if user exists in public.users...');
    
    const { data: publicUser, error: publicError } = await supabase
      .from('users')
      .select('id, email, name, role')
      .eq('id', userId)
      .single();
    
    if (publicError) {
      console.log('❌ Error getting user from public.users:', publicError.message);
    } else if (!publicUser) {
      console.log('❌ User not found in public.users');
    } else {
      console.log('✅ User found in public.users:');
      console.log('   ID:', publicUser.id);
      console.log('   Email:', publicUser.email);
      console.log('   Name:', publicUser.name);
      console.log('   Role:', publicUser.role);
    }
    
    // Check if user exists in public_profiles
    console.log('\n3. Checking if user exists in public_profiles...');
    
    const { data: publicProfile, error: profileError } = await supabase
      .from('public_profiles')
      .select('id, name, email, role')
      .eq('id', userId)
      .single();
    
    if (profileError) {
      console.log('❌ Error getting user from public_profiles:', profileError.message);
    } else if (!publicProfile) {
      console.log('❌ User not found in public_profiles');
    } else {
      console.log('✅ User found in public_profiles:');
      console.log('   ID:', publicProfile.id);
      console.log('   Name:', publicProfile.name);
      console.log('   Email:', publicProfile.email);
      console.log('   Role:', publicProfile.role);
    }
    
    console.log('\n=== Check Complete ===');
    
  } catch (error) {
    console.error('❌ Check failed with error:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

checkUserExists();