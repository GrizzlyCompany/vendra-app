// Script to check available RPC functions
const { createClient } = require('@supabase/supabase-js');

// Use the service role key
const supabaseUrl = 'https://vvuvuibcmvqxtvdadwne.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ2dXZ1aWJjbXZxeHR2ZGFkd25lIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTkwODE5NywiZXhwIjoyMDcxNDg0MTk3fQ.eiZFOQ7wcO2cOYPuIWKV-e2U5Cl4Bv70QOfCiH--Uss';

async function checkRpcFunctions() {
  try {
    console.log('=== Checking RPC Functions ===\n');
    
    // Create a client with the service role key
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Try to get a list of available RPC functions
    // This is a bit tricky, so let's try a few common ones
    
    console.log('1. Checking if execute_sql RPC exists...');
    try {
      const { data, error } = await supabase.rpc('execute_sql', { sql: 'SELECT 1;' });
      if (error) {
        console.log('❌ execute_sql RPC not available:', error.message);
      } else {
        console.log('✅ execute_sql RPC is available');
        console.log('Data:', data);
      }
    } catch (e) {
      console.log('❌ execute_sql RPC not available:', e.message);
    }
    
    console.log('\n2. Trying raw SQL execution...');
    try {
      // Try to run a simple query directly
      const { data, error } = await supabase
        .from('messages')
        .select('count(*)');
      
      if (error) {
        console.log('❌ Direct SQL query failed:', error.message);
      } else {
        console.log('✅ Direct SQL query works');
        console.log('Data:', data);
      }
    } catch (e) {
      console.log('❌ Direct SQL query failed:', e.message);
    }
    
    console.log('\n=== RPC Check Complete ===');
    
  } catch (error) {
    console.error('❌ RPC check failed with error:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

checkRpcFunctions();