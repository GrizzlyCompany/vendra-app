// Script to fix messages directly using Supabase client
const { createClient } = require('@supabase/supabase-js');

// Use the service role key
const supabaseUrl = 'https://vvuvuibcmvqxtvdadwne.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ2dXZ1aWJjbXZxeHR2ZGFkd25lIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTkwODE5NywiZXhwIjoyMDcxNDg0MTk3fQ.eiZFOQ7wcO2cOYPuIWKV-e2U5Cl4Bv70QOfCiH--Uss';

async function fixMessagesDirect() {
  try {
    console.log('=== Fixing Messages Directly ===\n');
    
    // Create a client with the service role key
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // 1. Update existing report messages to have the correct conversation_type
    console.log('1. Updating report messages to user_to_admin...');
    
    const { data: updatedMessages, error: updateError } = await supabase
      .from('messages')
      .update({ conversation_type: 'user_to_admin' })
      .ilike('content', '%Nuevo Reporte Recibido%');
    
    if (updateError) {
      console.log('❌ Error updating messages:', updateError.message);
    } else {
      console.log('✅ Messages updated successfully');
    }
    
    // 2. Verify the update by checking a few messages
    console.log('\n2. Verifying updates...');
    
    const { data: reportMessages, error: verifyError } = await supabase
      .from('messages')
      .select('id, sender_id, recipient_id, content, created_at, conversation_type, case_status')
      .ilike('content', '%Nuevo Reporte Recibido%')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (verifyError) {
      console.log('❌ Error verifying updates:', verifyError.message);
    } else {
      console.log(`✅ Found ${reportMessages.length} report messages:`);
      reportMessages.forEach((msg, index) => {
        console.log(`   ${index + 1}. ${msg.created_at} - ${msg.conversation_type} - ${msg.case_status}`);
        console.log(`      Content: ${msg.content.substring(0, 100)}${msg.content.length > 100 ? '...' : ''}`);
      });
    }
    
    // 3. Test the admin-get-messages function again
    console.log('\n3. Testing admin-get-messages function...');
    
    // Sign in as admin to get a proper token
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: 'admin@vendra.com',
      password: 'Admin123!'
    });
    
    if (signInError) {
      console.log('❌ Error signing in as admin:', signInError.message);
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
    
    const result = await response.json();
    console.log('   Function response status:', response.status);
    console.log('   Function response:', JSON.stringify(result, null, 2));
    
    console.log('\n=== Fix Complete ===');
    
  } catch (error) {
    console.error('❌ Fix failed with error:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

fixMessagesDirect();