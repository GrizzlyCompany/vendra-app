// Test script to verify that new reports automatically open in the admin messages section
const { createClient } = require('@supabase/supabase-js');

// Configuration
const supabaseUrl = 'https://vvuvuibcmvqxtvdadwne.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ2dXZ1aWJjbXZxeHR2ZGFkd25lIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTkwODE5NywiZXhwIjoyMDcxNDg0MTk3fQ.eiZFOQ7wcO2cOYPuIWKV-e2U5Cl4Bv70QOfCiH--Uss';

async function testReportAutoOpen() {
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  console.log('=== Testing Automatic Report Opening ===\n');
  
  try {
    // 1. Sign in as a regular user (simulating a user creating a report)
    console.log('1. Signing in as test user...');
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: 'testuser@example.com',
      password: 'TestUser123!'
    });
    
    if (signInError) {
      console.log('❌ Error signing in:', signInError.message);
      return;
    }
    
    console.log('✅ Signed in successfully');
    const userId = signInData.user.id;
    const userName = signInData.user.user_metadata?.name || 'Test User';
    const userEmail = signInData.user.email;
    
    // 2. Create a test report by calling the send-report function
    console.log('\n2. Creating a test report...');
    const reportData = {
      title: 'Test Report for Auto-Open Verification',
      description: 'This is a test report to verify that new reports automatically appear in the admin messages section as open cases.',
      category: 'technical',
      userEmail: userEmail,
      userName: userName,
      userId: userId
    };
    
    const response = await fetch(`${supabaseUrl}/functions/v1/send-report`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(reportData)
    });
    
    const result = await response.json();
    console.log('   Send report response status:', response.status);
    
    if (!response.ok) {
      console.log('❌ Error sending report:', result.error || result.message);
      return;
    }
    
    console.log('✅ Report sent successfully');
    console.log('   Response:', result.message);
    
    // 3. Wait a moment for the database to process
    console.log('\n3. Waiting for database processing...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 4. Sign in as admin to check the messages
    console.log('\n4. Signing in as admin...');
    const { data: adminSignInData, error: adminSignInError } = await supabase.auth.signInWithPassword({
      email: 'admin@vendra.com',
      password: 'Admin123!'
    });
    
    if (adminSignInError) {
      console.log('❌ Error signing in as admin:', adminSignInError.message);
      return;
    }
    
    console.log('✅ Signed in as admin successfully');
    
    // 5. Call the admin-get-messages function to see if the report appears
    console.log('\n5. Checking admin messages for the new report...');
    const messagesResponse = await fetch(`${supabaseUrl}/functions/v1/admin-get-messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminSignInData.session.access_token}`
      }
    });
    
    const messagesResult = await messagesResponse.json();
    console.log('   Admin messages response status:', messagesResponse.status);
    
    if (!messagesResponse.ok) {
      console.log('❌ Error fetching admin messages:', messagesResult.error || messagesResult.message);
      return;
    }
    
    console.log('✅ Admin messages fetched successfully');
    
    // 6. Check if our test report appears in the conversations
    console.log('\n6. Looking for our test report in conversations...');
    if (messagesResult.conversations && messagesResult.conversations.length > 0) {
      const testReportConversation = messagesResult.conversations.find(conv => 
        conv.last_message.content.includes('Test Report for Auto-Open Verification')
      );
      
      if (testReportConversation) {
        console.log('✅ Test report found in admin conversations!');
        console.log('   User:', testReportConversation.user_name);
        console.log('   Email:', testReportConversation.user_email);
        console.log('   Case Status:', testReportConversation.case_status);
        console.log('   Message Count:', testReportConversation.message_count);
        console.log('   Last Message Preview:', testReportConversation.last_message.content.substring(0, 100) + '...');
        
        // Verify it's marked as open
        if (testReportConversation.case_status === 'open') {
          console.log('✅ Report is correctly marked as open!');
        } else {
          console.log('⚠️  Report is not marked as open. Status:', testReportConversation.case_status);
        }
      } else {
        console.log('⚠️  Test report not found in conversations. Here are the recent conversations:');
        messagesResult.conversations.slice(0, 3).forEach((conv, index) => {
          console.log(`   ${index + 1}. ${conv.user_name} - ${conv.last_message.content.substring(0, 50)}...`);
        });
      }
    } else {
      console.log('⚠️  No conversations found in admin messages');
    }
    
    console.log('\n=== Test Complete ===');
    console.log('\nIf the test report appears in the admin conversations and is marked as "open",');
    console.log('then the automatic case opening feature is working correctly.');
    
  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Run the test
testReportAutoOpen();