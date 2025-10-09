// Script to test admin messaging functionality
// This script verifies that users can see messages from the admin in their chat interface

const { createClient } = require('@supabase/supabase-js');

// Configuration - replace with your actual Supabase credentials
const supabaseUrl = process.env.SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'your-service-role-key';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testAdminMessaging() {
  try {
    console.log('Testing admin messaging functionality...\n');

    // 1. Check admin user exists and has correct role
    console.log('1. Checking admin user...');
    const { data: adminUser, error: adminError } = await supabase
      .from('users')
      .select('id, email, name, role')
      .eq('email', 'admin@vendra.com')
      .single();

    if (adminError) {
      console.error('Error fetching admin user:', adminError.message);
      return;
    }

    console.log('Admin user found:', adminUser);
    
    if (adminUser.role !== 'empresa_constructora') {
      console.warn('Warning: Admin user does not have empresa_constructora role');
    }

    // 2. Check admin user has public profile
    console.log('\n2. Checking admin public profile...');
    const { data: adminProfile, error: profileError } = await supabase
      .from('public_profiles')
      .select('id, name, email, role')
      .eq('email', 'admin@vendra.com')
      .single();

    if (profileError) {
      console.error('Error fetching admin public profile:', profileError.message);
    } else {
      console.log('Admin public profile found:', adminProfile);
    }

    // 3. Check recent messages involving admin
    console.log('\n3. Checking recent messages with admin...');
    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select(`
        id,
        sender_id,
        recipient_id,
        content,
        created_at,
        sender:sender_id(email, name),
        recipient:recipient_id(email, name)
      `)
      .or(`sender_id.eq.${adminUser.id},recipient_id.eq.${adminUser.id}`)
      .order('created_at', { ascending: false })
      .limit(10);

    if (messagesError) {
      console.error('Error fetching messages:', messagesError.message);
    } else {
      console.log(`Found ${messages.length} messages involving admin:`);
      messages.forEach(msg => {
        console.log(`  - ${msg.sender.email} -> ${msg.recipient.email}: ${msg.content.substring(0, 50)}${msg.content.length > 50 ? '...' : ''}`);
      });
    }

    // 4. Test conversation list for a sample user
    if (messages && messages.length > 0) {
      // Get a user who has messaged the admin
      const sampleUser = messages.find(msg => msg.sender_id !== adminUser.id)?.sender || 
                         messages.find(msg => msg.recipient_id !== adminUser.id)?.recipient;
      
      if (sampleUser) {
        console.log(`\n4. Testing conversation list for user ${sampleUser.email}...`);
        
        // Get all messages for this user
        const { data: userMessages, error: userMessagesError } = await supabase
          .from('messages')
          .select('id, sender_id, recipient_id, content, created_at')
          .or(`sender_id.eq.${sampleUser.id},recipient_id.eq.${sampleUser.id}`)
          .order('created_at', { ascending: false });

        if (userMessagesError) {
          console.error('Error fetching user messages:', userMessagesError.message);
        } else {
          // Group by conversation partner
          const conversationsMap = {};
          userMessages.forEach(message => {
            const otherId = message.sender_id === sampleUser.id ? message.recipient_id : message.sender_id;
            if (!conversationsMap[otherId]) {
              conversationsMap[otherId] = {
                otherId,
                lastAt: message.created_at,
                lastMessage: message.content,
                lastMessageId: message.id
              };
            }
          });

          const conversationsList = Object.values(conversationsMap);
          console.log(`User has ${conversationsList.length} conversations:`);
          
          // Get public profiles for conversation partners
          const { data: profiles, error: profilesError } = await supabase
            .from('public_profiles')
            .select('id, name, email')
            .in('id', conversationsList.map(c => c.otherId));

          if (profilesError) {
            console.error('Error fetching conversation partner profiles:', profilesError.message);
          } else {
            const profileMap = {};
            profiles.forEach(profile => {
              profileMap[profile.id] = profile;
            });

            conversationsList.forEach(conv => {
              const profile = profileMap[conv.otherId];
              console.log(`  - ${profile ? profile.name || profile.email : 'Unknown'}: ${conv.lastMessage.substring(0, 30)}${conv.lastMessage.length > 30 ? '...' : ''}`);
            });
          }
        }
      }
    }

    console.log('\nTest completed successfully!');
  } catch (error) {
    console.error('Test failed with error:', error.message);
  }
}

// Run the test
testAdminMessaging();