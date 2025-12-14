// Test script for admin-get-applications function
const { createClient } = require('@supabase/supabase-js');

// Supabase configuration - you need to set these environment variables
const supabaseUrl = process.env.SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'your-service-role-key';

if (supabaseUrl.includes('YOUR_SUPABASE_URL') || supabaseKey.includes('your-service-role-key')) {
  console.log('Please set the SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testApplicationsFunction() {
  try {
    console.log('Testing admin-get-applications function...');
    
    // First, let's check if we have any seller applications in the database
    const { data: apps, error: appsError } = await supabase
      .from('seller_applications')
      .select('*')
      .limit(5);
    
    if (appsError) {
      console.error('Error fetching seller applications:', appsError);
      return;
    }
    
    console.log(`Found ${apps.length} seller applications in database`);
    if (apps.length > 0) {
      console.log('Sample application:', apps[0]);
    }
    
    // Test the Edge Function
    console.log('\nTesting Edge Function call...');
    const { data, error } = await supabase.functions.invoke('admin-get-applications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (error) {
      console.error('Error calling admin-get-applications function:', error);
      return;
    }
    
    console.log('Function response:', data);
    console.log(`Retrieved ${data.applications?.length || 0} applications`);
    
  } catch (err) {
    console.error('Test failed with error:', err);
  }
}

testApplicationsFunction();