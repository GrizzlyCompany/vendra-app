// Script to fix user auth metadata for angelf.delarosa@gmail.com
// This script should be run with the Supabase service role key

const { createClient } = require('@supabase/supabase-js');

// IMPORTANT: Replace these with your actual Supabase URL and service role key
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://vvuvuibcmvqxtvdadwne.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'your-service-role-key-here';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function fixUserMetadata() {
  try {
    // Update the user's auth metadata
    const { data, error } = await supabase.auth.admin.updateUserById(
      '503e1035-8781-4b87-b1fe-46305d8f6842', // User ID
      { 
        user_metadata: { 
          role: 'vendedor_agente',
          name: 'Angel Felix De La Rosa'
        } 
      }
    );

    if (error) {
      console.error('Error updating user metadata:', error);
      return;
    }

    console.log('Successfully updated user metadata:', data);
  } catch (error) {
    console.error('Error:', error);
  }
}

// Run the function
fixUserMetadata();