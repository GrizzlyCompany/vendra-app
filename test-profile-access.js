/**
 * Script to test profile access and identify the exact error
 */

const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client (you'll need to set these environment variables)
const supabaseUrl = process.env.SUPABASE_URL || 'YOUR_SUPABASE_URL';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testProfileAccess() {
  try {
    console.log('Testing profile access...');
    
    // First, let's sign up a test user to see if the issue occurs
    const testEmail = `test-user-${Date.now()}@example.com`;
    const testPassword = 'test-password-123';
    const testName = 'Test User';
    
    console.log(`Creating test user: ${testEmail}`);
    
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
      options: {
        data: {
          name: testName,
          role: 'comprador'
        }
      }
    });
    
    if (signUpError) {
      console.error('Error signing up test user:', signUpError);
      return;
    }
    
    console.log('Test user created successfully');
    console.log('User ID:', signUpData.user?.id);
    
    // Now try to access the user's profile
    if (signUpData.user?.id) {
      console.log('Testing profile access for user:', signUpData.user.id);
      
      // Try to fetch from public.users table
      try {
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('id,name,email,bio,role,avatar_url,subscription_active')
          .eq('id', signUpData.user.id)
          .single();
          
        if (userError) {
          console.error('Error fetching user data:', userError);
        } else {
          console.log('User data fetched successfully:', userData);
        }
      } catch (error) {
        console.error('Exception while fetching user data:', error);
      }
      
      // Try to fetch from public.public_profiles table
      try {
        const { data: profileData, error: profileError } = await supabase
          .from('public_profiles')
          .select('id,name,email,bio,avatar_url,role')
          .eq('id', signUpData.user.id)
          .single();
          
        if (profileError) {
          console.error('Error fetching profile data:', profileError);
        } else {
          console.log('Profile data fetched successfully:', profileData);
        }
      } catch (error) {
        console.error('Exception while fetching profile data:', error);
      }
    }
    
    // Clean up - delete the test user
    if (signUpData.user?.id) {
      console.log('Cleaning up test user...');
      
      // Note: In a real scenario, you might want to delete the test user
      // This is just for demonstration - actual user deletion would require
      // additional steps and permissions
    }
    
  } catch (error) {
    console.error('Unexpected error in testProfileAccess:', error);
  }
}

// Run the test
testProfileAccess()
  .then(() => console.log('Test completed'))
  .catch(error => console.error('Test failed:', error));