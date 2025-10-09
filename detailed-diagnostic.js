const { createClient } = require('@supabase/supabase-js');

// Use the service role key to have full access
const supabaseUrl = 'https://vvuvuibcmvqxtvdadwne.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ2dXZ1aWJjbXZxeHR2ZGFkd25lIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTkwODE5NywiZXhwIjoyMDcxNDg0MTk3fQ.eiZFOQ7wcO2cOYPuIWKV-e2U5Cl4Bv70QOfCiH--Uss';

// Create client with service role key for admin access
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function detailedDiagnostic() {
  try {
    console.log('=== Detailed Admin Messaging Diagnostic ===\n');
    
    // 1. Check auth.users table for admin user
    console.log('1. Checking auth.users table for admin user...');
    
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.log('❌ Error querying auth.users:', authError.message);
      return;
    }
    
    console.log(`✅ Found ${authUsers.users.length} auth users:`);
    authUsers.users.forEach((user, index) => {
      console.log(`   ${index + 1}. ${user.email} - ${user.id}`);
    });
    
    // Find admin user in auth.users
    const adminAuthUser = authUsers.users.find(user => user.email === 'admin@vendra.com');
    
    if (adminAuthUser) {
      console.log('✅ Admin user found in auth.users:');
      console.log('   ID:', adminAuthUser.id);
      console.log('   Email:', adminAuthUser.email);
      console.log('   Email confirmed:', adminAuthUser.email_confirmed_at);
    } else {
      console.log('❌ Admin user not found in auth.users');
    }
    
    // 2. Check public.users table for admin user
    console.log('\n2. Checking public.users table for admin user...');
    
    const { data: publicUsers, error: publicError } = await supabase
      .from('users')
      .select('id, email, name, role')
      .eq('email', 'admin@vendra.com');
    
    if (publicError) {
      console.log('❌ Error querying public.users:', publicError.message);
    } else if (!publicUsers || publicUsers.length === 0) {
      console.log('❌ Admin user not found in public.users');
    } else {
      const adminUser = publicUsers[0];
      console.log('✅ Admin user found in public.users:');
      console.log('   ID:', adminUser.id);
      console.log('   Email:', adminUser.email);
      console.log('   Name:', adminUser.name);
      console.log('   Role:', adminUser.role);
    }
    
    // 3. Check messages with "Nuevo Reporte Recibido" content
    console.log('\n3. Checking messages with "Nuevo Reporte Recibido" content...');
    const { data: reportMessages, error: reportMessagesError } = await supabase
      .from('messages')
      .select('id, sender_id, recipient_id, content, created_at, conversation_type, case_status')
      .ilike('content', '%Nuevo Reporte Recibido%')
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (reportMessagesError) {
      console.log('❌ Error fetching report messages:', reportMessagesError.message);
    } else {
      console.log(`✅ Found ${reportMessages.length} report messages:`);
      reportMessages.forEach((msg, index) => {
        console.log(`   ${index + 1}. ${msg.created_at} - ${msg.conversation_type} - ${msg.case_status}`);
        console.log(`      From: ${msg.sender_id}`);
        console.log(`      To: ${msg.recipient_id}`);
        console.log(`      Content: ${msg.content.substring(0, 100)}${msg.content.length > 100 ? '...' : ''}`);
      });
    }
    
    // 4. Check the specific admin-get-messages function with proper authentication
    console.log('\n4. Testing admin-get-messages function with service role key...');
    
    try {
      // Create a new client with the service role key for the function call
      const adminSupabase = createClient(supabaseUrl, supabaseServiceKey);
      
      // Get a valid session for the admin user
      if (adminAuthUser) {
        // Try to get the admin user's data
        const { data: adminSession, error: sessionError } = await adminSupabase.auth.admin.getUserById(adminAuthUser.id);
        
        if (sessionError) {
          console.log('❌ Error getting admin session:', sessionError.message);
        } else {
          console.log('✅ Got admin user data');
          
          // Now test the function
          const response = await fetch(`${supabaseUrl}/functions/v1/admin-get-messages`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseServiceKey}`
            }
          });
          
          const result = await response.json();
          console.log('   Function response status:', response.status);
          console.log('   Function response:', JSON.stringify(result, null, 2));
        }
      } else {
        console.log('❌ Cannot test function - admin user not found in auth.users');
      }
    } catch (functionError) {
      console.log('❌ Error calling function:', functionError.message);
    }
    
    console.log('\n=== Detailed Diagnostic Complete ===');
    
  } catch (error) {
    console.error('❌ Detailed diagnostic failed with error:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

detailedDiagnostic();