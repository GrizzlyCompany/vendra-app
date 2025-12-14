// Script to run SQL fixes using Supabase client
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Use the service role key
const supabaseUrl = 'https://vvuvuibcmvqxtvdadwne.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ2dXZ1aWJjbXZxeHR2ZGFkd25lIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTkwODE5NywiZXhwIjoyMDcxNDg0MTk3fQ.eiZFOQ7wcO2cOYPuIWKV-e2U5Cl4Bv70QOfCiH--Uss';

async function runSqlFix() {
  try {
    console.log('=== Running SQL Fix ===\n');
    
    // Create a client with the service role key
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Read the SQL file
    const sqlContent = fs.readFileSync('fix-admin-user-messaging.sql', 'utf8');
    
    // Split the SQL content into individual statements
    const statements = sqlContent.split(';').filter(stmt => stmt.trim() !== '');
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i].trim();
      if (statement) {
        console.log(`Executing statement ${i + 1}: ${statement.substring(0, 50)}...`);
        
        // Execute each statement
        const { data, error } = await supabase.rpc('execute_sql', { sql: statement + ';' });
        
        if (error) {
          console.log(`❌ Error executing statement ${i + 1}:`, error.message);
        } else {
          console.log(`✅ Statement ${i + 1} executed successfully`);
          if (data) {
            console.log('Result:', data);
          }
        }
      }
    }
    
    console.log('\n=== SQL Fix Complete ===');
    
  } catch (error) {
    console.error('❌ SQL fix failed with error:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

runSqlFix();