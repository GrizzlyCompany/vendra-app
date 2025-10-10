/**
 * Script to fix missing public profiles for existing users
 * Run this script to ensure all users have corresponding public profiles
 */

const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function fixMissingProfiles() {
  try {
    console.log('Starting profile synchronization fix...');
    
    // Get all users from the users table
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, name, email, bio, avatar_url, role');
      
    if (usersError) {
      console.error('Error fetching users:', usersError);
      return;
    }
    
    console.log(`Found ${users.length} users in the system`);
    
    // Get all existing public profiles
    const { data: existingProfiles, error: profilesError } = await supabase
      .from('public_profiles')
      .select('id');
      
    if (profilesError) {
      console.error('Error fetching public profiles:', profilesError);
      return;
    }
    
    const existingProfileIds = new Set(existingProfiles.map(p => p.id));
    const usersWithoutProfiles = users.filter(user => !existingProfileIds.has(user.id));
    
    console.log(`Found ${usersWithoutProfiles.length} users without public profiles`);
    
    if (usersWithoutProfiles.length === 0) {
      console.log('All users have public profiles. No action needed.');
      return;
    }
    
    // Create public profiles for users that don't have them
    for (const user of usersWithoutProfiles) {
      try {
        const { error: insertError } = await supabase
          .from('public_profiles')
          .insert({
            id: user.id,
            name: user.name,
            email: user.email,
            bio: user.bio,
            avatar_url: user.avatar_url,
            role: user.role
          });
          
        if (insertError) {
          console.error(`Error creating profile for user ${user.id}:`, insertError);
        } else {
          console.log(`Successfully created profile for user ${user.id}`);
        }
      } catch (insertError) {
        console.error(`Error creating profile for user ${user.id}:`, insertError);
      }
    }
    
    console.log('Profile synchronization fix completed.');
  } catch (error) {
    console.error('Error in fixMissingProfiles:', error);
  }
}

// Run the fix function
fixMissingProfiles();