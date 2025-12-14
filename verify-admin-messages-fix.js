// Script to verify that the admin messages fix worked
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Configuration - replace with your actual Supabase credentials
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyAdminMessagesFix() {
  try {
    console.log('Verifying admin messages fix...\n');

    // 1. Check if admin user exists and has correct role
    console.log('1. Checking admin user...');
    const { data: adminUser, error: adminError } = await supabase
      .from('users')
      .select('id, email, name, role')
      .eq('email', 'admin@vendra.com')
      .single();

    if (adminError) {
      console.error('❌ Admin user not found:', adminError.message);
      return;
    }

    console.log('✅ Admin user found:', adminUser);
    
    if (adminUser.role !== 'empresa_constructora') {
      console.warn('⚠️  Warning: Admin user does not have empresa_constructora role');
    } else {
      console.log('✅ Admin user has correct role');
    }

    // 2. Check admin user has public profile
    console.log('\n2. Checking admin public profile...');
    const { data: adminProfile, error: profileError } = await supabase
      .from('public_profiles')
      .select('id, name, email, role')
      .eq('email', 'admin@vendra.com')
      .single();

    if (profileError) {
      console.error('❌ Error fetching admin public profile:', profileError.message);
    } else {
      console.log('✅ Admin public profile found:', adminProfile);
    }

    // 3. Check for messages with "Nuevo Reporte" content
    console.log('\n3. Checking for report messages...');
    const { data: reportMessages, error: reportError } = await supabase
      .from('messages')
      .select(`
        id,
        sender_id,
        recipient_id,
        content,
        created_at,
        conversation_type,
        case_status
      `)
      .ilike('content', '%Nuevo Reporte%')
      .order('created_at', { ascending: false })
      .limit(10);

    if (reportError) {
      console.error('❌ Error fetching report messages:', reportError.message);
    } else {
      console.log(`✅ Found ${reportMessages.length} report messages:`);
      reportMessages.forEach((msg, index) => {
        console.log(`   ${index + 1}. [${msg.conversation_type}] [${msg.case_status}] ${msg.content.substring(0, 50)}${msg.content.length > 50 ? '...' : ''}`);
        
        // Check if conversation type is correct
        if (msg.conversation_type !== 'user_to_admin') {
          console.warn('   ⚠️  Warning: Incorrect conversation type');
        }
        
        // Check if case status is open
        if (msg.case_status === 'closed') {
          console.warn('   ⚠️  Warning: Report is marked as closed');
        }
      });
    }

    // 4. Test the admin-get-messages function
    console.log('\n4. Testing admin-get-messages function...');
    
    // Sign in as admin first
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: 'admin@vendra.com',
      password: 'Admin123!'
    });
    
    if (signInError) {
      console.error('❌ Error signing in as admin:', signInError.message);
      return;
    }
    
    console.log('✅ Signed in as admin successfully');
    
    // Test the function
    const response = await fetch(`${supabaseUrl}/functions/v1/admin-get-messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${signInData.session.access_token}`
      }
    });
    
    console.log('   Function response status:', response.status);
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Function executed successfully');
      if (result.conversations) {
        console.log(`   Found ${result.conversations.length} conversations`);
        
        // Check if any conversations contain "Nuevo Reporte"
        let reportConversationCount = 0;
        result.conversations.forEach(conv => {
          if (conv.last_message.content.includes('Nuevo Reporte')) {
            reportConversationCount++;
          }
        });
        
        console.log(`   Found ${reportConversationCount} conversations with reports`);
        
        if (reportConversationCount > 0) {
          console.log('✅ Fix successful! Report messages are now visible in admin panel');
        } else {
          console.warn('⚠️  No report conversations found. Check if reports have been sent recently');
        }
      } else {
        console.warn('   No conversations data in response');
      }
    } else {
      const errorText = await response.text();
      console.error('❌ Function failed with status', response.status);
      console.error('   Error:', errorText);
    }

    console.log('\n✅ Verification completed!');
  } catch (error) {
    console.error('❌ Verification failed with error:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Run the verification
verifyAdminMessagesFix();