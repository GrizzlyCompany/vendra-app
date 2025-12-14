// Script to fix admin message visibility issues
const { createClient } = require('@supabase/supabase-js');

// Configuration - replace with your actual Supabase credentials
const supabaseUrl = process.env.SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'your-service-role-key';

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixAdminMessageVisibility() {
  try {
    console.log('=== Fixing Admin Message Visibility Issues ===\n');
    
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
    
    // 2. Fix messages that should be user_to_admin but aren't
    console.log('\n2. Fixing misclassified messages...');
    
    // Update messages containing "Nuevo Reporte" to have correct conversation_type
    const { data: updatedReports, error: updateReportsError } = await supabase
      .from('messages')
      .update({
        conversation_type: 'user_to_admin',
        case_status: 'open' // Ensure reports are open
      })
      .ilike('content', '%Nuevo Reporte%')
      .neq('conversation_type', 'user_to_admin')
      .select('id, content, conversation_type');
      
    if (updateReportsError) {
      console.log('❌ Error updating report messages:', updateReportsError.message);
    } else {
      console.log(`✅ Fixed ${updatedReports.length} report messages:`);
      updatedReports.forEach((msg, index) => {
        console.log(`   ${index + 1}. ${msg.content.substring(0, 50)}${msg.content.length > 50 ? '...' : ''}`);
      });
    }
    
    // 3. Ensure all messages between users and admin are properly classified
    console.log('\n3. Ensuring all user-admin messages are properly classified...');
    
    // Get all messages involving admin
    const { data: allAdminMessages, error: allMessagesError } = await supabase
      .from('messages')
      .select('id, sender_id, recipient_id, content, conversation_type')
      .or(`sender_id.eq.${adminUser.id},recipient_id.eq.${adminUser.id}`)
      .order('created_at', { ascending: false })
      .limit(100);
      
    if (allMessagesError) {
      console.log('❌ Error fetching admin messages:', allMessagesError.message);
      return;
    }
    
    // Identify messages that should be user_to_admin but aren't
    const messagesToFix = allAdminMessages.filter(msg => {
      // Messages between admin and users should be user_to_admin
      const isAdminSender = msg.sender_id === adminUser.id;
      const isAdminRecipient = msg.recipient_id === adminUser.id;
      
      // If it's between admin and user, it should be user_to_admin
      if ((isAdminSender || isAdminRecipient) && msg.conversation_type !== 'user_to_admin') {
        return true;
      }
      
      return false;
    });
    
    console.log(`Found ${messagesToFix.length} messages to fix`);
    
    // Update these messages
    let fixedCount = 0;
    for (const msg of messagesToFix) {
      const { error: updateError } = await supabase
        .from('messages')
        .update({ conversation_type: 'user_to_admin' })
        .eq('id', msg.id);
        
      if (updateError) {
        console.log(`❌ Error updating message ${msg.id}:`, updateError.message);
      } else {
        fixedCount++;
      }
    }
    
    console.log(`✅ Fixed ${fixedCount} additional messages`);
    
    // 4. Verify the fixes
    console.log('\n4. Verifying fixes...');
    
    // Check user_to_admin messages
    const { data: userAdminMessages, error: userAdminError } = await supabase
      .from('messages')
      .select(`
        id,
        sender_id,
        recipient_id,
        content,
        created_at,
        conversation_type,
        case_status,
        sender:sender_id(email, name),
        recipient:recipient_id(email, name)
      `)
      .eq('conversation_type', 'user_to_admin')
      .order('created_at', { ascending: false })
      .limit(5);
      
    if (userAdminError) {
      console.log('❌ Error fetching user_to_admin messages:', userAdminError.message);
    } else {
      console.log(`✅ Found ${userAdminMessages.length} user_to_admin messages:`);
      userAdminMessages.forEach((msg, index) => {
        const sender = msg.sender ? `${msg.sender.name || msg.sender.email}` : 'Unknown';
        const recipient = msg.recipient ? `${msg.recipient.name || msg.recipient.email}` : 'Unknown';
        console.log(`  ${index + 1}. ${sender} -> ${recipient}`);
        console.log(`     Content: ${msg.content.substring(0, 60)}${msg.content.length > 60 ? '...' : ''}`);
      });
    }
    
    // 5. Test the admin-get-messages function
    console.log('\n5. Testing admin-get-messages function...');
    
    // Sign in as admin (you'll need to provide the admin password)
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: 'admin@vendra.com',
      password: 'Admin123!' // Replace with actual admin password
    });
    
    if (signInError) {
      console.log('❌ Error signing in as admin:', signInError.message);
      return;
    }
    
    console.log('✅ Signed in as admin');
    
    // Test the function
    const response = await fetch(`${supabaseUrl}/functions/v1/admin-get-messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${signInData.session.access_token}`
      }
    });
    
    console.log('Function response status:', response.status);
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Function executed successfully');
      console.log('Conversations found:', result.conversations?.length || 0);
      
      if (result.conversations && result.conversations.length > 0) {
        console.log('\nFirst 3 conversations:');
        result.conversations.slice(0, 3).forEach((conv, index) => {
          console.log(`  ${index + 1}. ${conv.user_name} (${conv.user_email}) - ${conv.message_count} messages`);
          console.log(`     Last message: ${conv.last_message.content.substring(0, 50)}${conv.last_message.content.length > 50 ? '...' : ''}`);
        });
      } else {
        console.log('⚠️  No conversations found - this indicates the issue might still exist');
      }
    } else {
      const errorText = await response.text();
      console.log('❌ Function failed:', errorText);
    }
    
    console.log('\n=== Fix Complete ===');
    console.log('\nNext steps:');
    console.log('1. Refresh the admin panel at /admin');
    console.log('2. Check if user messages are now visible');
    console.log('3. If not, check the browser console for errors');
    
  } catch (error) {
    console.error('❌ Fix failed with error:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Run the fix
fixAdminMessageVisibility();