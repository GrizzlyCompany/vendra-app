// Script to run the admin messages fix
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

async function runAdminMessagesFix() {
  try {
    console.log('Running admin messages fix...\n');

    // 1. Check if admin user exists
    console.log('1. Checking if admin user exists...');
    const { data: adminUser, error: adminError } = await supabase
      .from('users')
      .select('id, email, name, role')
      .eq('email', 'admin@vendra.com')
      .single();

    if (adminError) {
      console.log('Admin user not found, creating one...');
      // Create admin user
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert({
          email: 'admin@vendra.com',
          name: 'Administrador Vendra',
          role: 'empresa_constructora'
        })
        .select()
        .single();

      if (createError) {
        console.error('Error creating admin user:', createError.message);
        return;
      }
      
      console.log('Admin user created successfully:', newUser);
    } else {
      console.log('Admin user found:', adminUser);
      
      // Ensure admin has correct role
      if (adminUser.role !== 'empresa_constructora') {
        const { error: updateError } = await supabase
          .from('users')
          .update({ role: 'empresa_constructora' })
          .eq('id', adminUser.id);
          
        if (updateError) {
          console.error('Error updating admin role:', updateError.message);
        } else {
          console.log('Admin role updated to empresa_constructora');
        }
      }
    }

    // 2. Ensure admin user has a public profile
    console.log('\n2. Ensuring admin user has a public profile...');
    const { data: adminProfile, error: profileError } = await supabase
      .from('public_profiles')
      .select('id')
      .eq('email', 'admin@vendra.com')
      .single();

    if (profileError || !adminProfile) {
      console.log('Creating public profile for admin user...');
      const { error: insertError } = await supabase
        .from('public_profiles')
        .insert({
          id: adminUser.id,
          name: 'Administrador Vendra',
          email: 'admin@vendra.com',
          role: 'empresa_constructora'
        });

      if (insertError) {
        console.error('Error creating admin public profile:', insertError.message);
      } else {
        console.log('Admin public profile created successfully');
      }
    } else {
      console.log('Admin public profile exists');
    }

    // 3. Fix messages with wrong conversation_type
    console.log('\n3. Fixing messages with wrong conversation_type...');
    const { data: fixedMessages1, error: fixError1 } = await supabase
      .from('messages')
      .update({
        conversation_type: 'user_to_admin',
        case_status: 'open'
      })
      .ilike('content', '%Nuevo Reporte%')
      .neq('conversation_type', 'user_to_admin')
      .select();

    if (fixError1) {
      console.error('Error fixing messages conversation_type:', fixError1.message);
    } else {
      console.log(`Fixed ${fixedMessages1.length} messages with wrong conversation_type`);
    }

    // 4. Fix messages with wrong case_status
    console.log('\n4. Fixing messages with wrong case_status...');
    const { data: fixedMessages2, error: fixError2 } = await supabase
      .from('messages')
      .update({
        case_status: 'open'
      })
      .ilike('content', '%Nuevo Reporte%')
      .eq('case_status', 'closed')
      .select();

    if (fixError2) {
      console.error('Error fixing messages case_status:', fixError2.message);
    } else {
      console.log(`Fixed ${fixedMessages2.length} messages with wrong case_status`);
    }

    // 5. Show summary of recent admin messages
    console.log('\n5. Summary of recent admin messages...');
    const { data: recentMessages, error: recentError } = await supabase
      .from('messages')
      .select(`
        id,
        sender_id,
        recipient_id,
        content,
        created_at,
        conversation_type,
        case_status,
        sender:sender_id(email, name),
        recipient:recipient_id(email, name)
      `)
      .or(`sender_id.eq.${adminUser.id},recipient_id.eq.${adminUser.id}`)
      .order('created_at', { ascending: false })
      .limit(10);

    if (recentError) {
      console.error('Error fetching recent messages:', recentError.message);
    } else {
      console.log(`Found ${recentMessages.length} recent messages involving admin:`);
      recentMessages.forEach((msg, index) => {
        const sender = msg.sender ? `${msg.sender.name || msg.sender.email}` : 'Unknown';
        const recipient = msg.recipient ? `${msg.recipient.name || msg.recipient.email}` : 'Unknown';
        console.log(`  ${index + 1}. ${sender} -> ${recipient}: ${msg.content.substring(0, 50)}${msg.content.length > 50 ? '...' : ''} [${msg.conversation_type}] [${msg.case_status}]`);
      });
    }

    console.log('\n✅ Admin messages fix completed successfully!');
  } catch (error) {
    console.error('❌ Fix failed with error:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Run the fix
runAdminMessagesFix();