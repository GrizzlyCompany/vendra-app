// Enhanced diagnostic for admin conversation issues
const { createClient } = require('@supabase/supabase-js');

// Configuration - replace with your actual Supabase credentials
const supabaseUrl = process.env.SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'your-service-role-key';

const supabase = createClient(supabaseUrl, supabaseKey);

async function detailedConversationDiagnostic() {
  try {
    console.log('=== Detailed Conversation Diagnostic ===\n');
    
    // 1. Get admin user
    console.log('1. Getting admin user...');
    const { data: adminUser, error: adminError } = await supabase
      .from('users')
      .select('id, email, name')
      .eq('email', 'admin@vendra.com')
      .single();

    if (adminError) {
      console.log('❌ Admin user not found:', adminError.message);
      return;
    }
    
    console.log('✅ Admin user:', adminUser);
    
    // 2. Find a conversation with messages
    console.log('\n2. Finding conversations...');
    const { data: conversations, error: convError } = await supabase
      .from('messages')
      .select('sender_id, recipient_id')
      .eq('conversation_type', 'user_to_admin')
      .order('created_at', { ascending: false })
      .limit(10);
      
    if (convError) {
      console.log('❌ Error fetching conversations:', convError.message);
      return;
    }
    
    if (conversations.length === 0) {
      console.log('⚠️  No conversations found');
      return;
    }
    
    // Get unique user IDs
    const userIds = new Set();
    conversations.forEach(msg => {
      if (msg.sender_id !== adminUser.id) userIds.add(msg.sender_id);
      if (msg.recipient_id !== adminUser.id) userIds.add(msg.recipient_id);
    });
    
    const userIdArray = Array.from(userIds);
    console.log(`✅ Found ${userIdArray.length} unique users in conversations`);
    
    // 3. Check details for first user
    const testUserId = userIdArray[0];
    console.log(`\n3. Checking details for user ${testUserId}...`);
    
    // Get user info
    const { data: userInfo, error: userError } = await supabase
      .from('users')
      .select('id, name, email')
      .eq('id', testUserId)
      .single();
      
    if (userError) {
      console.log('⚠️  User not found in users table:', userError.message);
      // Try public_profiles
      const { data: profileInfo, error: profileError } = await supabase
        .from('public_profiles')
        .select('id, name, email')
        .eq('id', testUserId)
        .single();
        
      if (profileError) {
        console.log('❌ User not found in public_profiles either:', profileError.message);
      } else {
        console.log('✅ User found in public_profiles:', profileInfo);
      }
    } else {
      console.log('✅ User found:', userInfo);
    }
    
    // 4. Get all messages in this conversation
    console.log('\n4. Getting all messages in conversation...');
    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select(`
        id,
        sender_id,
        recipient_id,
        content,
        created_at,
        read_at,
        conversation_type,
        case_status
      `)
      .or(`and(sender_id.eq.${adminUser.id},recipient_id.eq.${testUserId}),and(sender_id.eq.${testUserId},recipient_id.eq.${adminUser.id})`)
      .order('created_at', { ascending: true });
      
    if (messagesError) {
      console.log('❌ Error fetching messages:', messagesError.message);
      return;
    }
    
    console.log(`✅ Found ${messages.length} messages:`);
    messages.forEach((msg, i) => {
      const sender = msg.sender_id === adminUser.id ? 'ADMIN' : 'USER';
      const readStatus = msg.read_at ? 'READ' : 'UNREAD';
      const timestamp = new Date(msg.created_at).toLocaleTimeString();
      console.log(`   ${i+1}. [${timestamp}] [${sender}] [${readStatus}] ${msg.content.substring(0, 60)}${msg.content.length > 60 ? '...' : ''}`);
    });
    
    // 5. Check message structure for potential issues
    console.log('\n5. Analyzing message structure...');
    const userMessages = messages.filter(m => m.sender_id === testUserId);
    const adminMessages = messages.filter(m => m.sender_id === adminUser.id);
    
    console.log(`User messages: ${userMessages.length}`);
    console.log(`Admin messages: ${adminMessages.length}`);
    
    // Check for messages that should be visible but aren't
    const unreadUserMessages = userMessages.filter(m => !m.read_at);
    console.log(`Unread user messages: ${unreadUserMessages.length}`);
    
    // 6. Test message insertion
    console.log('\n6. Testing message insertion...');
    const testMessage = {
      sender_id: adminUser.id,
      recipient_id: testUserId,
      content: 'Test message from diagnostic script',
      conversation_type: 'user_to_admin',
      case_status: 'open'
    };
    
    const { data: insertedMessage, error: insertError } = await supabase
      .from('messages')
      .insert(testMessage)
      .select()
      .single();
      
    if (insertError) {
      console.log('❌ Error inserting test message:', insertError.message);
    } else {
      console.log('✅ Test message inserted:', insertedMessage.id);
      
      // Clean up - delete test message
      const { error: deleteError } = await supabase
        .from('messages')
        .delete()
        .eq('id', insertedMessage.id);
        
      if (deleteError) {
        console.log('⚠️  Error deleting test message:', deleteError.message);
      } else {
        console.log('✅ Test message deleted');
      }
    }
    
    // 7. Check real-time functionality
    console.log('\n7. Testing real-time functionality...');
    let realtimeEvents = 0;
    
    const testChannel = supabase
      .channel('diagnostic-channel')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          realtimeEvents++;
          console.log(`   Real-time INSERT event: ${payload.new.id}`);
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'messages' },
        (payload) => {
          realtimeEvents++;
          console.log(`   Real-time UPDATE event: ${payload.new.id}`);
        }
      )
      .subscribe();
    
    // Wait a moment for subscription to establish
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Insert another test message
    const { data: realtimeTestMessage, error: realtimeTestError } = await supabase
      .from('messages')
      .insert({
        sender_id: adminUser.id,
        recipient_id: testUserId,
        content: 'Real-time test message',
        conversation_type: 'user_to_admin',
        case_status: 'open'
      })
      .select()
      .single();
      
    if (realtimeTestError) {
      console.log('❌ Error inserting real-time test message:', realtimeTestError.message);
    } else {
      console.log('✅ Real-time test message inserted:', realtimeTestMessage.id);
      
      // Wait for real-time event
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      console.log(`Real-time events received: ${realtimeEvents}`);
      
      // Clean up
      await supabase
        .from('messages')
        .delete()
        .eq('id', realtimeTestMessage.id);
    }
    
    // Clean up channel
    await supabase.removeChannel(testChannel);
    
    console.log('\n=== Detailed Diagnostic Complete ===');
    
  } catch (error) {
    console.error('❌ Diagnostic failed with error:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Run the detailed diagnostic
detailedConversationDiagnostic();