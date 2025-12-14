// Test script to check all admin functions with proper authentication
const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = 'https://vvuvuibcmvqxtvdadwne.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ2dXZ1aWJjbXZxeHR2ZGFkd25lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU5MDgxOTcsImV4cCI6MjA3MTQ4NDE5N30.4gEyjAnjAAp9zwR7OR8WLIPgX048CAfEHaiDMwZHdNY';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function signInAsAdmin() {
  try {
    // Note: You would need to replace these with actual admin credentials
    const { data, error } = await supabase.auth.signInWithPassword({
      email: 'admin@vendra.com',
      password: 'your-admin-password'
    });

    if (error) {
      console.error('❌ Admin sign in error:', error);
      return null;
    }

    console.log('✅ Signed in as admin');
    return data.session.access_token;
  } catch (err) {
    console.error('❌ Admin sign in exception:', err);
    return null;
  }
}

async function testAdminFunction(functionName, accessToken = null) {
  try {
    console.log(`\n--- Testing ${functionName} ---`);
    
    // Prepare headers
    const headers = {
      'Content-Type': 'application/json',
    };
    
    // Add authorization header if token is provided
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }
    
    const { data, error } = await supabase.functions.invoke(functionName, {
      method: 'POST',
      headers: headers,
    });

    if (error) {
      console.error(`❌ Error calling ${functionName}:`, error.message);
      if (error.status) {
        console.error(`   Status: ${error.status}`);
      }
      return false;
    }

    console.log(`✅ Success calling ${functionName}:`, Object.keys(data)[0], 'received');
    return true;
  } catch (err) {
    console.error(`❌ Exception calling ${functionName}:`, err.message);
    return false;
  }
}

async function runAllTests() {
  console.log('Testing all admin functions...');
  
  // Test without authentication first (should fail)
  console.log('\n--- Testing without authentication (expected to fail) ---');
  await testAdminFunction('admin-get-properties');
  
  // Note: For actual testing with authentication, you would need to sign in with valid admin credentials
  // const accessToken = await signInAsAdmin();
  // if (accessToken) {
  //   console.log('\n--- Testing with authentication ---');
  //   const functions = [
  //     'admin-get-agents',
  //     'admin-get-companies',
  //     'admin-get-applications',
  //     'admin-get-messages',
  //     'admin-get-properties',
  //     'admin-get-stats'
  //   ];
  //   
  //   let successCount = 0;
  //   
  //   for (const func of functions) {
  //     const success = await testAdminFunction(func, accessToken);
  //     if (success) successCount++;
  //   }
  //   
  //   console.log(`\n--- Summary ---`);
  //   console.log(`✅ ${successCount}/${functions.length} functions working correctly`);
  // }
}

runAllTests();