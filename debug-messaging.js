// Debug script for messaging issues
const { createClient } = require('@supabase/supabase-js');

// Supabase configuration - you need to set these environment variables
const supabaseUrl = process.env.SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'your-service-role-key';

if (supabaseUrl.includes('YOUR_SUPABASE_URL') || supabaseKey.includes('your-service-role-key')) {
  console.log('Please set the SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugMessaging() {
  try {
    console.log('=== Messaging Debug Tool ===\n');
    
    // Check if admin user exists
    console.log('1. Checking admin user...');
    const { data: adminUser, error: adminError } = await supabase
      .from('users')
      .select('id, email, name, role')
      .eq('email', 'admin@vendra.com')
      .single();
    
    if (adminError) {
      console.log('❌ Admin user not found in public.users table');
      console.log('   You need to run the setup-admin-user.sql script');
      return;
    }
    
    console.log('✅ Admin user found:');
    console.log('   ID:', adminUser.id);
    console.log('   Email:', adminUser.email);
    console.log('   Name:', adminUser.name);
    console.log('   Role:', adminUser.role);
    
    // Check if admin has a public profile
    console.log('\n2. Checking admin public profile...');
    const { data: adminProfile, error: profileError } = await supabase
      .from('public_profiles')
      .select('id, name, email, avatar_url')
      .eq('id', adminUser.id)
      .single();
    
    if (profileError) {
      console.log('❌ Admin public profile not found');
      console.log('   You need to run the ensure-admin-public-profile.sql script');
    } else {
      console.log('✅ Admin public profile found:');
      console.log('   Name:', adminProfile.name);
      console.log('   Email:', adminProfile.email);
      console.log('   Avatar URL:', adminProfile.avatar_url || 'None');
    }
    
    // Check for any messages involving the admin
    console.log('\n3. Checking messages involving admin...');
    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select('id, sender_id, recipient_id, content, created_at')
      .or(`sender_id.eq.${adminUser.id},recipient_id.eq.${adminUser.id}`)
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (messagesError) {
      console.log('❌ Error fetching messages:', messagesError);
      return;
    }
    
    console.log(`✅ Found ${messages.length} messages involving admin`);
    
    if (messages.length > 0) {
      console.log('\nLatest messages:');
      messages.forEach((msg, index) => {
        console.log(`   ${index + 1}. ${msg.created_at} - ${msg.sender_id === adminUser.id ? 'TO' : 'FROM'} ${msg.sender_id === adminUser.id ? msg.recipient_id : msg.sender_id}`);
        console.log(`      Content: ${msg.content.substring(0, 50)}${msg.content.length > 50 ? '...' : ''}`);
      });
    }
    
    // Check if there are any regular users
    console.log('\n4. Checking regular users...');
    const { data: regularUsers, error: usersError } = await supabase
      .from('users')
      .select('id, email, name')
      .neq('email', 'admin@vendra.com')
      .limit(5);
    
    if (usersError) {
      console.log('❌ Error fetching regular users:', usersError);
      return;
    }
    
    console.log(`✅ Found ${regularUsers.length} regular users`);
    
    if (regularUsers.length > 0) {
      console.log('\nSample users:');
      regularUsers.forEach((user, index) => {
        console.log(`   ${index + 1}. ${user.name || user.email} (${user.email})`);
      });
      
      // Check if first user has public profile
      const firstUser = regularUsers[0];
      console.log(`\n5. Checking public profile for ${firstUser.name || firstUser.email}...`);
      const { data: userProfile, error: userProfileError } = await supabase
        .from('public_profiles')
        .select('id, name, email, avatar_url')
        .eq('id', firstUser.id)
        .single();
      
      if (userProfileError) {
        console.log('❌ User public profile not found');
      } else {
        console.log('✅ User public profile found');
      }
      
      // Check messages between admin and this user
      console.log(`\n6. Checking messages between admin and ${firstUser.name || firstUser.email}...`);
      const { data: userMessages, error: userMessagesError } = await supabase
        .from('messages')
        .select('id, sender_id, recipient_id, content, created_at')
        .or(`sender_id.eq.${adminUser.id},recipient_id.eq.${adminUser.id}`)
        .or(`sender_id.eq.${firstUser.id},recipient_id.eq.${firstUser.id}`)
        .order('created_at', { ascending: false });
      
      if (userMessagesError) {
        console.log('❌ Error fetching user messages:', userMessagesError);
        return;
      }
      
      const directMessages = userMessages.filter(msg => 
        (msg.sender_id === adminUser.id && msg.recipient_id === firstUser.id) ||
        (msg.sender_id === firstUser.id && msg.recipient_id === adminUser.id)
      );
      
      console.log(`✅ Found ${directMessages.length} direct messages between admin and user`);
      
      if (directMessages.length > 0) {
        console.log('\nDirect messages:');
        directMessages.forEach((msg, index) => {
          const direction = msg.sender_id === adminUser.id ? 'Admin → User' : 'User → Admin';
          console.log(`   ${index + 1}. ${msg.created_at} ${direction}`);
          console.log(`      Content: ${msg.content.substring(0, 50)}${msg.content.length > 50 ? '...' : ''}`);
        });
      }
    }
    
    console.log('\n=== Debug Complete ===');
    
  } catch (err) {
    console.error('Debug failed with error:', err);
  }
}

debugMessaging();