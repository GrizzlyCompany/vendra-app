// Test script for simplified report messaging functionality
const { createClient } = require('@supabase/supabase-js');

// Supabase configuration - you need to set these environment variables
const supabaseUrl = process.env.SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'your-service-role-key';

if (supabaseUrl.includes('YOUR_SUPABASE_URL') || supabaseKey.includes('your-service-role-key')) {
  console.log('Please set the SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testSimpleReport() {
  try {
    console.log('Testing simplified report messaging functionality...');
    
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
    
    // Test sending a report
    console.log('\nTesting report submission...');
    const reportData = {
      title: 'Test Report - Simplified Version',
      description: 'This is a test report to verify the simplified messaging functionality',
      category: 'general',
      userEmail: testUser.email,
      userName: testUser.name || testUser.email,
      userId: testUser.id
    };
    
    const response = await fetch(`${supabaseUrl}/functions/v1/send-report`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(reportData)
    });
    
    const responseText = await response.text();
    console.log('Response status:', response.status);
    console.log('Response text:', responseText);
    
    if (!response.ok) {
      console.error('Error sending report:', responseText);
      return;
    }
    
    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Error parsing response:', parseError);
      return;
    }
    
    console.log('Report sent successfully:', responseData);
    
    // Wait a moment for the message to be created
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Check if a message was created for the admin
    console.log('\nChecking for messages to admin...');
    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select('*')
      .eq('recipient_id', adminUser.id)
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (messagesError) {
      console.error('Error fetching messages:', messagesError);
      return;
    }
    
    console.log(`Found ${messages.length} recent messages for admin`);
    
    // Look for our test message
    const testMessage = messages.find(msg => 
      msg.content.includes('Test Report - Simplified Version') && 
      msg.content.includes(testUser.email)
    );
    
    if (testMessage) {
      console.log('✅ Test message found in admin messages!');
      console.log('Message content:', testMessage.content);
    } else {
      console.log('❌ Test message not found in admin messages');
      if (messages.length > 0) {
        console.log('Most recent message:', messages[0].content);
      }
    }
    
  } catch (err) {
    console.error('Test failed with error:', err);
  }
}

testSimpleReport();