// Diagnostic script to check conversation issues in the admin panel
const { createClient } = require('@supabase/supabase-js');

// Configuration - replace with your actual Supabase credentials
const supabaseUrl = process.env.SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'your-service-role-key';

const supabase = createClient(supabaseUrl, supabaseKey);

async function diagnoseConversationIssues() {
  try {
    console.log('=== Diagnosing Conversation Issues ===\n');
    
    // 1. Check if admin user exists
    console.log('1. Checking admin user...');
    const { data: adminUser, error: adminError } = await supabase
      .from('users')
      .select('id, email, name')
      .eq('email', 'admin@vendra.com')
      .single();

    if (adminError) {
      console.log('❌ Admin user not found:', adminError.message);
      return;
    }
    
    console.log('✅ Admin user found:', adminUser);
    
    // 2. Get a sample conversation ID from the messages table
    console.log('\n2. Getting sample conversation...');
    const { data: sampleMessages, error: sampleError } = await supabase
      .from('messages')
      .select('sender_id, recipient_id, conversation_type')
      .eq('conversation_type', 'user_to_admin')
      .limit(5);

    if (sampleError) {
      console.log('❌ Error fetching sample messages:', sampleError.message);
      return;
    }
    
    if (sampleMessages.length === 0) {
      console.log('⚠️  No user_to_admin conversations found');
      // Check for messages that might contain "Nuevo Reporte" but have wrong type
      const { data: reportMessages, error: reportError } = await supabase
        .from('messages')
        .select('sender_id, recipient_id, content, conversation_type')
        .ilike('content', '%Nuevo Reporte%')
        .limit(5);
      
      if (reportError) {
        console.log('❌ Error checking for report messages:', reportError.message);
      } else if (reportMessages.length > 0) {
        console.log('⚠️  Found report messages with potentially wrong conversation type:');
        reportMessages.forEach((msg, i) => {
          console.log(`   ${i+1}. Type: ${msg.conversation_type} | Content: ${msg.content.substring(0, 50)}...`);
        });
      } else {
        console.log('❌ No report messages found either');
      }
      return;
    }
    
    console.log(`✅ Found ${sampleMessages.length} user_to_admin conversations`);
    
    // Get a sample user ID (assuming the first message has a valid user)
    const sampleUserId = sampleMessages[0].sender_id === adminUser.id ? 
                         sampleMessages[0].recipient_id : 
                         sampleMessages[0].sender_id;
    
    console.log('Sample user ID for testing:', sampleUserId);
    
    // 3. Check user exists
    console.log('\n3. Checking sample user...');
    const { data: sampleUser, error: userError } = await supabase
      .from('users')
      .select('id, name, email')
      .eq('id', sampleUserId)
      .single();
      
    if (userError) {
      console.log('⚠️  Sample user not found:', userError.message);
      // Try to get user from public_profiles
      const { data: publicProfile, error: profileError } = await supabase
        .from('public_profiles')
        .select('id, name, email')
        .eq('id', sampleUserId)
        .single();
        
      if (profileError) {
        console.log('❌ Sample user not found in public profiles either:', profileError.message);
      } else {
        console.log('✅ Sample user found in public profiles:', publicProfile);
      }
    } else {
      console.log('✅ Sample user found:', sampleUser);
    }
    
    // 4. Check messages between admin and sample user
    console.log('\n4. Checking messages between admin and sample user...');
    const { data: conversationMessages, error: convError } = await supabase
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
      .or(`and(sender_id.eq.${adminUser.id},recipient_id.eq.${sampleUserId}),and(sender_id.eq.${sampleUserId},recipient_id.eq.${adminUser.id})`)
      .order('created_at', { ascending: true });
      
    if (convError) {
      console.log('❌ Error fetching conversation messages:', convError.message);
      return;
    }
    
    console.log(`✅ Found ${conversationMessages.length} messages in conversation:`);
    conversationMessages.forEach((msg, i) => {
      const sender = msg.sender_id === adminUser.id ? 'ADMIN' : 'USER';
      const status = msg.read_at ? 'READ' : 'UNREAD';
      console.log(`   ${i+1}. [${sender}] [${status}] [${msg.conversation_type}] ${msg.content.substring(0, 50)}${msg.content.length > 50 ? '...' : ''}`);
    });
    
    // 5. Check if messages are being marked as read
    console.log('\n5. Checking read status...');
    const unreadMessages = conversationMessages.filter(msg => 
      msg.recipient_id === adminUser.id && !msg.read_at
    );
    
    console.log(`Unread messages for admin: ${unreadMessages.length}`);
    
    if (unreadMessages.length > 0) {
      console.log('Attempting to mark messages as read...');
      const { error: readError } = await supabase
        .from('messages')
        .update({ read_at: new Date().toISOString() })
        .eq('recipient_id', adminUser.id)
        .in('id', unreadMessages.map(m => m.id));
        
      if (readError) {
        console.log('❌ Error marking messages as read:', readError.message);
      } else {
        console.log('✅ Messages marked as read successfully');
      }
    }
    
    // 6. Test real-time subscription
    console.log('\n6. Testing real-time subscription...');
    console.log('Setting up subscription for 10 seconds...');
    
    let messageCount = 0;
    const channel = supabase
      .channel('test-conversation')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'messages' },
        (payload) => {
          messageCount++;
          console.log(`   Real-time event #${messageCount}:`, payload.eventType, payload.new?.id);
        }
      )
      .subscribe();
      
    // Wait 10 seconds
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    console.log(`Received ${messageCount} real-time events`);
    
    // Clean up
    await supabase.removeChannel(channel);
    
    console.log('\n=== Diagnosis Complete ===');
    
  } catch (error) {
    console.error('❌ Diagnosis failed with error:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Run the diagnosis
diagnoseConversationIssues();