import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface DashboardStats {
  activeProperties: number;
  buyersCount: number;
  agentsCount: number;
  companiesCount: number;
  websiteVisits: number;
  propertiesWithAgents: number;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('🔍 Admin stats request received:', {
      method: req.method,
      url: req.url,
      headers: Object.fromEntries(req.headers.entries())
    })

    // Check environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    console.log('🔍 Environment check:', {
      hasUrl: !!supabaseUrl,
      hasServiceKey: !!serviceRoleKey,
      urlPrefix: supabaseUrl?.substring(0, 20) + '...'
    })

    if (!supabaseUrl || !serviceRoleKey) {
      console.error('❌ Missing environment variables')
      return new Response(
        JSON.stringify({
          error: 'Server configuration error',
          details: 'Missing required environment variables'
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Create a Supabase client with the service role key
    const supabaseClient = createClient(supabaseUrl, serviceRoleKey)

    // Get the authorization header from the request
    const authHeader = req.headers.get('Authorization')
    console.log('🔍 Authorization header:', authHeader ? 'Present' : 'Missing')

    if (!authHeader) {
      console.log('❌ No authorization header provided')
      return new Response(
        JSON.stringify({
          error: 'No authorization header',
          details: 'Authorization header is required',
          receivedHeaders: Object.fromEntries(req.headers.entries())
        }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Verify the user is authenticated and is admin
    const token = authHeader.replace('Bearer ', '')
    console.log('🔍 Validating token...', {
      tokenPrefix: token.substring(0, Math.min(20, token.length)) + (token.length > 20 ? '...' : ''),
      tokenLength: token.length
    })

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token)

    console.log('🔍 Token validation result:', {
      hasUser: !!user,
      hasError: !!authError,
      userId: user?.id,
      userEmail: user?.email,
      error: authError?.message
    })

    if (authError) {
      console.error('❌ Token validation error:', authError)
      return new Response(
        JSON.stringify({
          error: 'Token validation failed',
          details: authError.message,
          tokenPrefix: token.substring(0, Math.min(10, token.length)) + (token.length > 10 ? '...' : ''),
          tokenLength: token.length
        }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    if (!user) {
      console.log('❌ No user found in token')
      return new Response(
        JSON.stringify({
          error: 'Invalid token',
          details: 'No user associated with this token',
          tokenPrefix: token.substring(0, Math.min(10, token.length)) + (token.length > 10 ? '...' : ''),
          tokenLength: token.length
        }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log('✅ User authenticated:', {
      email: user.email,
      id: user.id,
      metadata: user.user_metadata
    })

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
      console.log('❌ Admin access denied for user:', user.email)
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

    console.log('✅ Admin access granted for user:', user.email)

    // Get active properties count
    const { count: activeProperties, error: propertiesError } = await supabaseClient
      .from('properties')
      .select('*', { count: 'exact', head: true })
      .eq('is_published', true)
      .eq('status', 'active')

    console.log('🔍 Properties count query result:', {
      count: activeProperties,
      hasError: !!propertiesError,
      error: propertiesError
    })

    if (propertiesError) {
      console.error('❌ Properties count error:', propertiesError)
      throw propertiesError
    }

    // Get users count by role
    const { data: usersCount, error: usersError } = await supabaseClient
      .from('users')
      .select('role')

    console.log('🔍 Users query result:', {
      hasData: !!usersCount,
      hasError: !!usersError,
      dataLength: usersCount?.length,
      error: usersError
    })

    if (usersError) {
      console.error('❌ Users query error:', usersError)
      throw usersError
    }

    // Count users by role
    const roleCounts = usersCount?.reduce((acc: Record<string, number>, user: { role: string }) => {
      acc[user.role] = (acc[user.role] || 0) + 1
      return acc
    }, {} as Record<string, number>) || {}

    // Get total website visits (total views from property_views)
    const { count: websiteVisits, error: visitsError } = await supabaseClient
      .from('property_views')
      .select('*', { count: 'exact', head: true })

    console.log('🔍 Property views count result:', {
      count: websiteVisits,
      hasError: !!visitsError,
      error: visitsError
    })

    if (visitsError) {
      console.error('❌ Property views count error:', visitsError)
      throw visitsError
    }

    // Get properties with assigned agents (properties that have owner_id and the owner is an agent)
    const { count: propertiesWithAgents, error: agentPropsError } = await supabaseClient
      .from('properties')
      .select('*', { count: 'exact', head: true })
      .not('owner_id', 'is', null)

    console.log('🔍 Properties with agents count result:', {
      count: propertiesWithAgents,
      hasError: !!agentPropsError,
      error: agentPropsError
    })

    if (agentPropsError) {
      console.error('❌ Properties with agents count error:', agentPropsError)
      throw agentPropsError
    }

    const stats: DashboardStats = {
      activeProperties: activeProperties || 0,
      buyersCount: roleCounts['comprador'] || 0,
      agentsCount: (roleCounts['vendedor'] || 0) + (roleCounts['agente'] || 0),
      companiesCount: roleCounts['empresa_constructora'] || 0,
      websiteVisits: websiteVisits || 0,
      propertiesWithAgents: propertiesWithAgents || 0
    }

    return new Response(
      JSON.stringify({ stats }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Error in admin-get-stats:', error)
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
