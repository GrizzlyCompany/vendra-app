// Test script to verify that users can see messages from the admin
const { createClient } = require('@supabase/supabase-js');

// Supabase configuration - you need to set these environment variables
const supabaseUrl = process.env.SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'your-service-role-key';

if (supabaseUrl.includes('YOUR_SUPABASE_URL') || supabaseKey.includes('your-service-role-key')) {
  console.log('Please set the SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testUserMessages() {
  try {
    console.log('Testing user message visibility...');
    
    // First, let's check if we have an admin user
    const { data: adminUser, error: adminError } = await supabase
      .from('users')
      .select('id, email, name')
      .eq('email', 'admin@vendra.com')
      .single();
    
    if (adminError) {
      console.error('Error fetching admin user:', adminError);
      return;
    }
    
    console.log('Admin user found:', adminUser);
    
    // Let's also check if we have a test user
    const { data: testUsers, error: usersError } = await supabase
      .from('users')
      .select('id, email, name')
      .neq('email', 'admin@vendra.com')
      .limit(1);
    
    if (usersError) {
      console.error('Error fetching test users:', usersError);
      return;
    }
    
    if (testUsers.length === 0) {
      console.log('No test users found');
      return;
    }
    
    const testUser = testUsers[0];
    console.log('Test user:', testUser);
    
    // Check if the test user has a public profile
    const { data: publicProfile, error: profileError } = await supabase
      .from('public_profiles')
      .select('id, name, avatar_url')
      .eq('id', testUser.id)
      .single();
    
    if (profileError) {
      console.log('No public profile found for test user, creating one...');
      
      // Create public profile for test user
      const { error: createError } = await supabase
        .from('public_profiles')
        .insert({
          id: testUser.id,
          name: testUser.name || testUser.email,
          email: testUser.email
        });
      
      if (createError) {
        console.error('Error creating public profile:', createError);
        return;
      }
      
      console.log('Public profile created for test user');
    } else {
      console.log('Public profile found for test user:', publicProfile);
    }
    
    // Check if admin user has a public profile
    const { data: adminProfile, error: adminProfileError } = await supabase
      .from('public_profiles')
      .select('id, name, avatar_url')
      .eq('id', adminUser.id)
      .single();
    
    if (adminProfileError) {
      console.log('No public profile found for admin user, creating one...');
      
      // Create public profile for admin user
      const { error: createError } = await supabase
        .from('public_profiles')
        .insert({
          id: adminUser.id,
          name: adminUser.name || adminUser.email,
          email: adminUser.email
        });
      
      if (createError) {
        console.error('Error creating public profile for admin:', createError);
        return;
      }
      
      console.log('Public profile created for admin user');
    } else {
      console.log('Public profile found for admin user:', adminProfile);
    }
    
    // Send a test message from admin to user
    console.log('\nSending test message from admin to user...');
    const { data: message, error: messageError } = await supabase
      .from('messages')
      .insert({
        sender_id: adminUser.id,
        recipient_id: testUser.id,
        content: 'This is a test message from the admin to verify user can see it'
      })
      .select()
      .single();
    
    if (messageError) {
      console.error('Error sending message:', messageError);
      return;
    }
    
    console.log('Message sent successfully:', message);
    
    // Wait a moment for the message to be processed
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Check if the user can see the conversation with admin
    console.log('\nChecking if user can see conversation with admin...');
    const { data: userMessages, error: userMessagesError } = await supabase
      .from('messages')
      .select('*')
      .or(`sender_id.eq.${testUser.id},recipient_id.eq.${testUser.id}`)
      .order('created_at', { ascending: false });
    
    if (userMessagesError) {
      console.error('Error fetching user messages:', userMessagesError);
      return;
    }
    
    console.log(`Found ${userMessages.length} messages for user`);
    
    // Look for messages from admin
    const messagesFromAdmin = userMessages.filter(msg => 
      msg.sender_id === adminUser.id && msg.recipient_id === testUser.id
    );
    
    if (messagesFromAdmin.length > 0) {
      console.log('✅ User can see messages from admin!');
      console.log('Latest message from admin:', messagesFromAdmin[0].content);
    } else {
      console.log('❌ User cannot see messages from admin');
    }
    
    // Check conversations list for user
    console.log('\nChecking user conversations list...');
    const conversationsMap = {};
    
    userMessages.forEach((message) => {
      const otherId = message.sender_id === testUser.id ? message.recipient_id : message.sender_id;
      // Only keep the most recent message for each conversation
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
    console.log(`User has ${conversationsList.length} conversations`);
    
    // Check if admin is in the conversations list
    const adminConversation = conversationsList.find(conv => conv.otherId === adminUser.id);
    
    if (adminConversation) {
      console.log('✅ Admin appears in user conversations list!');
      console.log('Last message:', adminConversation.lastMessage);
    } else {
      console.log('❌ Admin does not appear in user conversations list');
    }
    
  } catch (err) {
    console.error('Test failed with error:', err);
  }
}

testUserMessages();