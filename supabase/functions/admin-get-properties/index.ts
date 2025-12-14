import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface AdminProperty {
  id: string;
  title: string;
  description: string | null;
  price: number;
  location: string;
  address: string | null;
  images: string[];
  status: string;
  type: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  area: number | null;
  currency: string | null;
  is_published: boolean;
  created_at: string;
  owner_id: string | null;
  agent_name: string | null;
  agent_email: string | null;
  agent_phone: string | null;
  agent_role: string | null;
  views_count: number;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('🔍 Admin properties request received:', {
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

    // Check if user has admin access (check user metadata or email patterns for admin)
    const isAdmin = user.email === 'admin@vendra.com' ||
                    user.email?.endsWith('@admin.com') ||
                    user.email?.endsWith('@vendra.com') ||
                    user.user_metadata?.role === 'admin' ||
                    user.app_metadata?.role === 'admin' ||
                    false

    console.log('🔍 Admin check:', {
      email: user.email,
      isAdmin,
      emailEndsWithAdmin: user.email?.endsWith('@admin.com'),
      emailEndsWithVendra: user.email?.endsWith('@vendra.com'),
      metadataRole: user.user_metadata?.role,
      appMetadataRole: user.app_metadata?.role
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

    // Get all properties
    const { data: properties, error: propertiesError } = await supabaseClient
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

    console.log('🔍 Properties query result:', {
      hasData: !!properties,
      hasError: !!propertiesError,
      dataLength: properties?.length,
      error: propertiesError
    })

    if (propertiesError) {
      console.error('❌ Properties query error:', propertiesError)
      throw propertiesError
    }

    // If we have properties with owner_id, get the user information for those owners
    const ownerIds = properties
      ?.filter(property => property.owner_id)
      .map(property => property.owner_id)
      .filter((id, index, self) => self.indexOf(id) === index) // Remove duplicates

    let usersMap: Record<string, any> = {}
    if (ownerIds && ownerIds.length > 0) {
      const { data: users, error: usersError } = await supabaseClient
        .from('users')
        .select('id, name, email, primary_phone, role')
        .in('id', ownerIds)

      console.log('🔍 Users query result:', {
        hasData: !!users,
        hasError: !!usersError,
        dataLength: users?.length,
        error: usersError
      })

      if (usersError) {
        console.error('❌ Users query error:', usersError)
        throw usersError
      }

      // Create a map for quick lookup
      usersMap = (users || []).reduce((acc, user) => {
        acc[user.id] = user
        return acc
      }, {} as Record<string, any>)
    }

    // Format the data for admin dashboard
    const adminProperties: AdminProperty[] = (properties || []).map((property: any) => {
      const owner = property.owner_id ? usersMap[property.owner_id] : null
      return {
        id: property.id,
        title: property.title,
        description: property.description,
        price: property.price,
        location: property.location,
        address: property.address,
        images: property.images || [],
        status: property.status,
        type: property.type,
        bedrooms: property.bedrooms,
        bathrooms: property.bathrooms,
        area: property.area,
        currency: property.currency,
        is_published: property.is_published,
        created_at: property.inserted_at,
        owner_id: property.owner_id,
        agent_name: owner?.name || null,
        agent_email: owner?.email || null,
        agent_phone: owner?.primary_phone || null,
        agent_role: owner?.role || null,
        views_count: property.views_count || 0
      }
    })

    return new Response(
      JSON.stringify({ properties: adminProperties }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Error in admin-get-properties:', error)
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
