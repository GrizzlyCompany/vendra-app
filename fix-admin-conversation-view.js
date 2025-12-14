// Script to fix admin conversation view issues
const { createClient } = require('@supabase/supabase-js');

// Configuration - replace with your actual Supabase credentials
const supabaseUrl = process.env.SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'your-service-role-key';

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixAdminConversationView() {
  try {
    console.log('=== Fixing Admin Conversation View Issues ===\n');
    
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
    
    // 2. Find conversations with potential issues
    console.log('\n2. Finding conversations with potential issues...');
    const { data: conversations, error: convError } = await supabase
      .from('messages')
      .select('sender_id, recipient_id, conversation_type, case_status')
      .order('created_at', { ascending: false })
      .limit(50);
      
    if (convError) {
      console.log('❌ Error fetching conversations:', convError.message);
      return;
    }
    
    // Group conversations by user
    const userConversations = {};
    conversations.forEach(msg => {
      const otherUserId = msg.sender_id === adminUser.id ? msg.recipient_id : msg.sender_id;
      if (!userConversations[otherUserId]) {
        userConversations[otherUserId] = {
          messages: [],
          hasUserToAdmin: false,
          hasWrongType: false
        };
      }
      
      userConversations[otherUserId].messages.push(msg);
      
      if (msg.conversation_type === 'user_to_admin') {
        userConversations[otherUserId].hasUserToAdmin = true;
      }
      
      // Check for messages that should be user_to_admin but aren't
      if (msg.content.includes('Nuevo Reporte') && msg.conversation_type !== 'user_to_admin') {
        userConversations[otherUserId].hasWrongType = true;
      }
    });
    
    console.log(`✅ Found ${Object.keys(userConversations).length} user conversations`);
    
    // 3. Fix conversations with wrong conversation_type
    console.log('\n3. Fixing conversations with wrong conversation_type...');
    let fixedCount = 0;
    
    for (const [userId, convData] of Object.entries(userConversations)) {
      if (convData.hasWrongType) {
        console.log(`   Fixing conversation for user ${userId}...`);
        
        // Update messages that contain "Nuevo Reporte" but have wrong type
        const { data: updatedMessages, error: updateError } = await supabase
          .from('messages')
          .update({
            conversation_type: 'user_to_admin',
            case_status: 'open' // Ensure reports are open
          })
          .ilike('content', '%Nuevo Reporte%')
          .or(`and(sender_id.eq.${adminUser.id},recipient_id.eq.${userId}),and(sender_id.eq.${userId},recipient_id.eq.${adminUser.id})`)
          .select('id, content, conversation_type');
          
        if (updateError) {
          console.log(`   ❌ Error updating messages for user ${userId}:`, updateError.message);
        } else {
          console.log(`   ✅ Fixed ${updatedMessages.length} messages for user ${userId}`);
          fixedCount += updatedMessages.length;
        }
      }
    }
    
    console.log(`✅ Fixed ${fixedCount} messages with wrong conversation_type`);
    
    // 4. Ensure all user_to_admin messages have correct case_status
    console.log('\n4. Ensuring user_to_admin messages have correct case_status...');
    const { data: closedReports, error: closedError } = await supabase
      .from('messages')
      .update({ case_status: 'open' })
      .eq('conversation_type', 'user_to_admin')
      .eq('case_status', 'closed')
      .ilike('content', '%Nuevo Reporte%')
      .select('id');
      
    if (closedError) {
      console.log('❌ Error updating closed reports:', closedError.message);
    } else {
      console.log(`✅ Reopened ${closedReports.length} closed report messages`);
    }
    
    // 5. Verify the fixes
    console.log('\n5. Verifying fixes...');
    const { data: fixedMessages, error: verifyError } = await supabase
      .from('messages')
      .select('id, sender_id, recipient_id, content, conversation_type, case_status')
      .ilike('content', '%Nuevo Reporte%')
      .order('created_at', { ascending: false })
      .limit(10);
      
    if (verifyError) {
      console.log('❌ Error verifying fixes:', verifyError.message);
    } else {
      console.log(`✅ Verification - Found ${fixedMessages.length} report messages:`);
      fixedMessages.forEach((msg, i) => {
        console.log(`   ${i+1}. [${msg.conversation_type}] [${msg.case_status}] ${msg.content.substring(0, 50)}${msg.content.length > 50 ? '...' : ''}`);
      });
    }
    
    // 6. Test real-time functionality
    console.log('\n6. Testing real-time functionality...');
    
    // Get a sample user for testing
    const sampleUserId = Object.keys(userConversations)[0];
    if (sampleUserId) {
      console.log(`   Testing with user ${sampleUserId}...`);
      
      // Insert a test message
      const testMessage = {
        sender_id: adminUser.id,
        recipient_id: sampleUserId,
        content: 'Test message for real-time verification',
        conversation_type: 'user_to_admin',
        case_status: 'open'
      };
      
      const { data: testMsg, error: testError } = await supabase
        .from('messages')
        .insert(testMessage)
        .select('id')
        .single();
        
      if (testError) {
        console.log('   ❌ Error inserting test message:', testError.message);
      } else {
        console.log('   ✅ Test message inserted:', testMsg.id);
        
        // Clean up
        await supabase
          .from('messages')
          .delete()
          .eq('id', testMsg.id);
          
        console.log('   ✅ Test message cleaned up');
      }
    }
    
    console.log('\n=== Admin Conversation View Fix Complete ===');
    console.log('\nNext steps:');
    console.log('1. Refresh the admin panel at /admin');
    console.log('2. Navigate to the messages section');
    console.log('3. Open a conversation with a user');
    console.log('4. User messages should now be visible');
    
  } catch (error) {
    console.error('❌ Fix failed with error:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Run the fix
fixAdminConversationView();