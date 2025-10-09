// Script to check if admin user exists and create it if needed
const { createClient } = require('@supabase/supabase-js');

// Supabase configuration - you need to set these environment variables
const supabaseUrl = process.env.SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'your-service-role-key';

if (supabaseUrl.includes('YOUR_SUPABASE_URL') || supabaseKey.includes('your-service-role-key')) {
  console.log('Please set the SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAndCreateAdmin() {
  try {
    console.log('Checking if admin user exists...');
    
    // Check if admin user exists
    const { data: adminUser, error: adminError } = await supabase
      .from('users')
      .select('id, email, name')
      .eq('email', 'admin@vendra.com')
      .single();
    
    if (adminError && adminError.code !== 'PGRST116') {
      console.error('Error fetching admin user:', adminError);
      return;
    }
    
    if (adminUser) {
      console.log('✅ Admin user found:', adminUser);
      return adminUser;
    }
    
    console.log('Admin user not found. Creating admin user...');
    
    // Create admin user in auth.users first
    // Note: This would typically be done through the Supabase dashboard or CLI
    console.log('Note: You need to create the admin user through the Supabase Auth interface');
    console.log('1. Go to your Supabase project dashboard');
    console.log('2. Navigate to Authentication > Users');
    console.log('3. Click "Add user"');
    console.log('4. Enter email: admin@vendra.com');
    console.log('5. Enter a secure password');
    console.log('6. Click "Add user"');
    
    // Then create the user in public.users table
    console.log('\nAfter creating the auth user, run this SQL in the Supabase SQL editor:');
    console.log(`
INSERT INTO public.users (id, email, name, role)
SELECT id, 'admin@vendra.com', 'Administrator', 'comprador'
FROM auth.users 
WHERE email = 'admin@vendra.com'
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  name = EXCLUDED.name,
  role = 'comprador';
    `);
    
  } catch (err) {
    console.error('Error:', err);
  }
}

checkAndCreateAdmin();