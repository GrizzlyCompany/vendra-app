// Test script to check database queries directly
const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = 'https://vvuvuibcmvqxtvdadwne.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ2dXZ1aWJjbXZxeHR2ZGFkd25lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU5MDgxOTcsImV4cCI6MjA3MTQ4NDE5N30.4gEyjAnjAAp9zwR7OR8WLIPgX048CAfEHaiDMwZHdNY';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ2dXZ1aWJjbXZxeHR2ZGFkd25lIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTkwODE5NywiZXhwIjoyMDcxNDg0MTk3fQ.eiZFOQ7wcO2cOYPuIWKV-e2U5Cl4Bv70QOfCiH--Uss';

// Create client with service role key for admin access
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testDatabaseQueries() {
  try {
    console.log('Testing database queries with service role key...');
    
    // Test properties query
    console.log('\n--- Testing properties query ---');
    const { data: properties, error: propertiesError } = await supabase
      .from('properties')
      .select(`
        id,
        title,
        description,
        price,
        location,
        address,
        images,
        status,
        type,
        bedrooms,
        bathrooms,
        area,
        currency,
        is_published,
        inserted_at,
        views_count,
        owner_id
      `)
      .order('inserted_at', { ascending: false })
      .limit(5);

    if (propertiesError) {
      console.error('❌ Properties query error:', propertiesError);
    } else {
      console.log('✅ Properties query success:', properties.length, 'properties found');
      console.log('First property:', properties[0]);
      
      // If we have properties with owner_id, get the user information for those owners
      const ownerIds = properties
        .filter(property => property.owner_id)
        .map(property => property.owner_id)
        .filter((id, index, self) => self.indexOf(id) === index); // Remove duplicates

      console.log('Owner IDs to fetch:', ownerIds);

      if (ownerIds.length > 0) {
        const { data: users, error: usersError } = await supabase
          .from('users')
          .select('id, name, email, primary_phone, role')
          .in('id', ownerIds);

        if (usersError) {
          console.error('❌ Users query error:', usersError);
        } else {
          console.log('✅ Users query success:', users.length, 'users found');
          console.log('Users:', users);
        }
      }
    }

    // Test stats queries
    console.log('\n--- Testing stats queries ---');
    
    // Get active properties count
    const { count: activeProperties, error: activePropertiesError } = await supabase
      .from('properties')
      .select('*', { count: 'exact', head: true })
      .eq('is_published', true)
      .eq('status', 'active');

    if (activePropertiesError) {
      console.error('❌ Active properties count error:', activePropertiesError);
    } else {
      console.log('✅ Active properties count:', activeProperties);
    }

    // Get users count by role
    const { data: usersCount, error: usersError } = await supabase
      .from('users')
      .select('role');

    if (usersError) {
      console.error('❌ Users query error:', usersError);
    } else {
      console.log('✅ Users query success:', usersCount.length, 'users found');
      
      // Count users by role
      const roleCounts = usersCount.reduce((acc, user) => {
        acc[user.role] = (acc[user.role] || 0) + 1;
        return acc;
      }, {});
      
      console.log('Role counts:', roleCounts);
    }

    // Get total website visits (total views from property_views)
    const { count: websiteVisits, error: visitsError } = await supabase
      .from('property_views')
      .select('*', { count: 'exact', head: true });

    if (visitsError) {
      console.error('❌ Property views count error:', visitsError);
    } else {
      console.log('✅ Property views count:', websiteVisits);
    }

    // Get properties with assigned agents
    const { count: propertiesWithAgents, error: agentPropsError } = await supabase
      .from('properties')
      .select('*', { count: 'exact', head: true })
      .not('owner_id', 'is', null);

    if (agentPropsError) {
      console.error('❌ Properties with agents count error:', agentPropsError);
    } else {
      console.log('✅ Properties with agents count:', propertiesWithAgents);
    }

  } catch (err) {
    console.error('❌ Exception:', err);
  }
}

testDatabaseQueries();