// Script to test the exact .in() query used in the function
const { createClient } = require('@supabase/supabase-js');

// Use the service role key
const supabaseUrl = 'https://vvuvuibcmvqxtvdadwne.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ2dXZ1aWJjbXZxeHR2ZGFkd25lIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTkwODE5NywiZXhwIjoyMDcxNDg0MTk3fQ.eiZFOQ7wcO2cOYPuIWKV-e2U5Cl4Bv70QOfCiH--Uss';

async function testInQuery() {
  try {
    console.log('=== Testing .in() Query ===\n');
    
    // Create a client with the service role key
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const userIds = ['503e1035-8781-4b87-b1fe-46305d8f6842'];
    
    console.log('Testing .in() query with user IDs:', userIds);
    
    // Test the exact query from the function
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, name, email')
      .in('id', userIds);
    
    if (userError) {
      console.log('❌ Error with .in() query:', userError.message);
      console.log('Error details:', userError);
    } else {
      console.log('✅ .in() query successful');
      console.log('Found', userData.length, 'users:');
      userData.forEach((user, index) => {
        console.log(`   ${index + 1}. ${user.id} - ${user.name} - ${user.email}`);
      });
    }
    
    // Test individual query
    console.log('\nTesting individual query...');
    
    const { data: singleUser, error: singleError } = await supabase
      .from('users')
      .select('id, name, email')
      .eq('id', '503e1035-8781-4b87-b1fe-46305d8f6842')
      .single();
    
    if (singleError) {
      console.log('❌ Error with single query:', singleError.message);
    } else {
      console.log('✅ Single query successful');
      console.log('User:', singleUser.id, '-', singleUser.name, '-', singleUser.email);
    }
    
    console.log('\n=== Test Complete ===');
    
  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

testInQuery();