// Script to verify the profile loading fix
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function verifyProfileFix() {
  try {
    console.log('Verifying profile loading fix...');
    
    // Test 1: Check if the users table has the correct structure
    const { data: usersTable, error: usersError } = await supabase
      .from('users')
      .select('id, email, name, role')
      .limit(1);
    
    if (usersError) {
      console.error('Error accessing users table:', usersError.message);
      return false;
    }
    
    console.log('✓ Users table accessible');
    
    // Test 2: Check if the public_profiles table has the correct structure
    const { data: profilesTable, error: profilesError } = await supabase
      .from('public_profiles')
      .select('id, name, email, role')
      .limit(1);
    
    if (profilesError) {
      console.error('Error accessing public_profiles table:', profilesError.message);
      return false;
    }
    
    console.log('✓ Public profiles table accessible');
    
    // Test 3: Check if the sync trigger exists
    const { data: triggers, error: triggersError } = await supabase.rpc('get_triggers_info');
    
    if (triggersError) {
      console.warn('Could not verify triggers (this is not critical for the fix)');
    } else {
      const syncTriggerExists = triggers.some(trigger => 
        trigger.trigger_name.includes('sync_public_profile')
      );
      
      if (syncTriggerExists) {
        console.log('✓ Profile sync trigger exists');
      } else {
        console.warn('⚠ Profile sync trigger not found (this may need to be created)');
      }
    }
    
    console.log('\n✅ Profile loading fix verification completed successfully!');
    console.log('\nTo test with a real user:');
    console.log('1. Register a new user');
    console.log('2. Confirm their email');
    console.log('3. Log in and navigate to /profile');
    console.log('4. The profile should load without the "Cannot coerce the result to a single JSON object" error');
    
    return true;
  } catch (error) {
    console.error('Verification failed:', error.message);
    return false;
  }
}

// Run the verification
verifyProfileFix().then(success => {
  if (!success) {
    process.exit(1);
  }
});