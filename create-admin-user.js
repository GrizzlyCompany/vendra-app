// Script to create admin user in public.users table
const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = 'https://vvuvuibcmvqxtvdadwne.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ2dXZ1aWJjbXZxeHR2ZGFkd25lIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTkwODE5NywiZXhwIjoyMDcxNDg0MTk3fQ.eiZFOQ7wcO2cOYPuIWKV-e2U5Cl4Bv70QOfCiH--Uss';

// Create client with service role key for admin access
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createAdminUser() {
  try {
    console.log('Creating admin user in public.users table...');
    
    // First, let's check if the admin user exists in auth.users
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.error('❌ Error fetching auth users:', authError);
      return;
    }
    
    // Find admin user in auth.users
    const adminAuthUser = authUsers.users.find(user => user.email === 'admin@vendra.com');
    
    if (!adminAuthUser) {
      console.log('Admin user not found in auth.users');
      return;
    }
    
    console.log('Found admin user in auth.users:', adminAuthUser.email, adminAuthUser.id);
    
    // Check if admin user already exists in public.users
    const { data: existingUser, error: existingUserError } = await supabase
      .from('users')
      .select('id')
      .eq('id', adminAuthUser.id)
      .single();
    
    if (existingUser) {
      console.log('Admin user already exists in public.users');
      return;
    }
    
    // Create admin user in public.users
    const { data, error } = await supabase
      .from('users')
      .insert({
        id: adminAuthUser.id,
        email: adminAuthUser.email,
        name: 'Admin User',
        role: 'admin'
      });
    
    if (error) {
      console.error('❌ Error creating admin user:', error);
      return;
    }
    
    console.log('✅ Admin user created successfully in public.users');
  } catch (err) {
    console.error('❌ Exception:', err);
  }
}

createAdminUser();