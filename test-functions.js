// Simple test script to check Supabase functions
const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = 'https://vvuvuibcmvqxtvdadwne.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ2dXZ1aWJjbXZxeHR2ZGFkd25lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU5MDgxOTcsImV4cCI6MjA3MTQ4NDE5N30.4gEyjAnjAAp9zwR7OR8WLIPgX048CAfEHaiDMwZHdNY';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function signIn() {
  try {
    // Replace with actual admin credentials
    const { data, error } = await supabase.auth.signInWithPassword({
      email: 'admin@vendra.com',
      password: 'your-admin-password'
    });

    if (error) {
      console.error('❌ Sign in error:', error);
      return null;
    }

    console.log('✅ Signed in successfully');
    return data.session.access_token;
  } catch (err) {
    console.error('❌ Sign in exception:', err);
    return null;
  }
}

async function testFunction(functionName, accessToken = null) {
  try {
    console.log(`Testing function: ${functionName}`);
    
    // Prepare headers
    const headers = {
      'Content-Type': 'application/json',
    };
    
    // Add authorization header if token is provided
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }
    
    // For testing purposes, we'll make a simple POST request
    const { data, error } = await supabase.functions.invoke(functionName, {
      method: 'POST',
      headers: headers,
    });

    if (error) {
      console.error(`❌ Error calling ${functionName}:`, error);
      return;
    }

    console.log(`✅ Success calling ${functionName}:`, data);
  } catch (err) {
    console.error(`❌ Exception calling ${functionName}:`, err);
  }
}

// Test our functions
async function runTests() {
  console.log('Starting function tests...');
  
  // Test without authentication first
  console.log('\n--- Testing without authentication ---');
  await testFunction('test-property-views');
  
  // Test with authentication
  console.log('\n--- Testing with authentication ---');
  // Note: For actual testing, you would need to sign in with valid credentials
  // const accessToken = await signIn();
  // if (accessToken) {
  //   await testFunction('admin-get-properties', accessToken);
  //   await testFunction('admin-get-stats', accessToken);
  // }
}

runTests();