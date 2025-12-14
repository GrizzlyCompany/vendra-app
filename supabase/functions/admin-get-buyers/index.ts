import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface AdminBuyer {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  properties_favorited: number;
  last_login: string;
  status: 'active' | 'inactive';
}

// Use Deno.serve instead of serve for better compatibility
Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create a Supabase client with the service role key
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get the authorization header from the request
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Verify the user is authenticated and is admin
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token)

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - Authentication required' }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Check if user has admin access (either by email or user metadata)
    const isAdmin = user.email === 'admin@vendra.com' ||
                    user.email?.endsWith('@admin.com') ||
                    user.email?.endsWith('@vendra.com') ||
                    user.user_metadata?.role === 'admin' ||
                    false

    console.log('🔍 Admin check:', {
      email: user.email,
      isAdmin,
      emailEndsWithAdmin: user.email?.endsWith('@admin.com'),
      emailEndsWithVendra: user.email?.endsWith('@vendra.com'),
      metadataRole: user.user_metadata?.role
    })

    if (!isAdmin) {
      return new Response(
        JSON.stringify({ 
          error: 'Unauthorized - Admin access required',
          details: 'User does not have admin privileges',
          user_email: user.email 
        }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Get all buyers (users with role 'comprador')
    // Let's simplify the query first to see if it works
    const { data: buyersData, error: buyersError } = await supabaseClient
      .from('users')
      .select('id, name, email, primary_phone, updated_at')
      .eq('role', 'comprador')
      .order('name')
      .limit(10) // Limit to 10 records for testing

    if (buyersError) {
      console.error('Database query error:', buyersError)
      throw buyersError
    }

    // Get favorite counts for each buyer (this would require a favorites table)
    const buyers: AdminBuyer[] = (buyersData || []).map((buyer) => {
      return {
        id: buyer.id,
        name: buyer.name || 'N/A',
        email: buyer.email || 'N/A',
        phone: buyer.primary_phone || null,
        properties_favorited: 0, // For now, we'll set favorites to 0
        last_login: buyer.updated_at || new Date().toISOString(),
        status: 'active' // All buyers are marked as active for now
      }
    })

    return new Response(
      JSON.stringify({ buyers }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Error in admin-get-buyers:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    return new Response(
      JSON.stringify({
        error: errorMessage,
        details: 'Internal server error'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})