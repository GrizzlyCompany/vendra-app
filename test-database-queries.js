// Test script to check database queries directly
const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = 'https://vvuvuibcmvqxtvdadwne.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ2dXZ1aWJjbXZxeHR2ZGFkd25lIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTkwODE5NywiZXhwIjoyMDcxNDg0MTk3fQ.eiZFOQ7wcO2cOYPuIWKV-e2U5Cl4Bv70QOfCiH--Uss';

// Create client with service role key for admin access
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testAgentsQuery() {
  try {
    console.log('\n--- Testing agents query ---');
    const { data, error } = await supabase
      .from('users')
      .select('id, name, email, primary_phone, updated_at')
      .eq('role', 'vendedor_agente')
      .order('name')
      .limit(5);

    if (error) {
      console.error('❌ Agents query error:', error);
      return false;
    }

    console.log('✅ Agents query success:', data.length, 'agents found');
    if (data.length > 0) {
      console.log('Sample agent:', data[0]);
    }
    return true;
  } catch (err) {
    console.error('❌ Agents query exception:', err);
    return false;
  }
}

async function testCompaniesQuery() {
  try {
    console.log('\n--- Testing companies query ---');
    const { data, error } = await supabase
      .from('users')
      .select('id, name, email, primary_phone, contact_person, website, inserted_at')
      .eq('role', 'empresa_constructora')
      .order('name')
      .limit(5);

    if (error) {
      console.error('❌ Companies query error:', error);
      return false;
    }

    console.log('✅ Companies query success:', data.length, 'companies found');
    if (data.length > 0) {
      console.log('Sample company:', data[0]);
    }
    return true;
  } catch (err) {
    console.error('❌ Companies query exception:', err);
    return false;
  }
}

async function testApplicationsQuery() {
  try {
    console.log('\n--- Testing applications query ---');
    const { data, error } = await supabase
      .from('seller_applications')
      .select('*')
      .order('submitted_at', { ascending: false })
      .limit(5);

    if (error) {
      console.error('❌ Applications query error:', error);
      return false;
    }

    console.log('✅ Applications query success:', data.length, 'applications found');
    if (data.length > 0) {
      console.log('Sample application:', data[0]);
    }
    return true;
  } catch (err) {
    console.error('❌ Applications query exception:', err);
    return false;
  }
}

async function testMessagesQuery() {
  try {
    console.log('\n--- Testing messages query ---');
    
    // First check if admin user exists
    console.log('Checking for admin user: admin@vendra.com');
    const { data: adminUser, error: adminError } = await supabase
      .from('users')
      .select('id, email, name')
      .eq('email', 'admin@vendra.com')
      .single();

    if (adminError) {
      console.log('Admin user not found with exact match, checking all users...');
      
      // List all users to see what we have
      const { data: allUsers, error: allUsersError } = await supabase
        .from('users')
        .select('id, email, name')
        .order('email');

      if (allUsersError) {
        console.error('❌ All users query error:', allUsersError);
        return false;
      }

      console.log('All users in system:');
      allUsers.forEach(user => {
        console.log(`  - ${user.email} (${user.name}) ${user.email === 'admin@vendra.com' ? '(MATCH)' : ''}`);
      });
      
      // Try to find admin user with case-insensitive match
      const { data: adminUsers, error: adminUsersError } = await supabase
        .from('users')
        .select('id, email, name')
        .ilike('email', '%admin@vendra.com%');

      if (adminUsersError) {
        console.error('❌ Admin users query error:', adminUsersError);
        return false;
      }

      if (adminUsers.length === 0) {
        console.log('No admin users found with partial match either');
        return false;
      }

      console.log('Found admin-like users:', adminUsers);
      // Use the first one as admin for testing
      const adminUser = adminUsers[0];
      console.log('Using', adminUser.email, 'as admin user for testing');
    } else {
      console.log('Found admin user:', adminUser);
    }

    // For now, let's just test if we can query messages table
    const { data, error } = await supabase
      .from('messages')
      .select(`
        id,
        sender_id,
        recipient_id,
        content,
        created_at,
        read_at
      `)
      .limit(5);

    if (error) {
      console.error('❌ Messages query error:', error);
      return false;
    }

    console.log('✅ Messages table query success:', data.length, 'messages found');
    if (data.length > 0) {
      console.log('Sample message:', data[0]);
    }
    return true;
  } catch (err) {
    console.error('❌ Messages query exception:', err);
    return false;
  }
}

async function runAllTests() {
  console.log('Testing database queries directly...');
  
  const tests = [
    testAgentsQuery,
    testCompaniesQuery,
    testApplicationsQuery,
    testMessagesQuery
  ];
  
  let successCount = 0;
  
  for (const test of tests) {
    const success = await test();
    if (success) successCount++;
  }
  
  console.log(`\n--- Summary ---`);
  console.log(`✅ ${successCount}/${tests.length} database queries working correctly`);
  
  if (successCount === tests.length) {
    console.log('🎉 All database queries are working correctly!');
  } else {
    console.log('❌ Some database queries are still having issues');
  }
}

runAllTests();