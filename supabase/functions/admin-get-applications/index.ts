import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SellerApplication {
  id: string
  user_id: string
  status: string
  role_choice: string
  full_name: string | null
  email: string | null
  created_at: string
  submitted_at: string | null
  review_notes: string | null
  reviewer_id: string | null
  user_name: string
  user_email: string
}

serve(async (req) => {
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

    if (authError) {
      console.error('❌ Token validation error:', authError)
      return new Response(
        JSON.stringify({
          error: 'Token validation failed',
          details: authError.message
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
          details: 'No user associated with this token'
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

    // Fetch seller applications
    const { data: appsData, error: appsError } = await supabaseClient
      .from('seller_applications')
      .select('*')
      .order('submitted_at', { ascending: false })

    if (appsError) {
      throw appsError
    }

    // Fetch user details for all applicants
    const userIds = (appsData || []).map(app => app.user_id)
    const { data: usersData, error: usersError } = await supabaseClient
      .from('users')
      .select('id, name, email')
      .in('id', userIds)

    // Create a map of user data
    const userMap = new Map((usersData || []).map(u => [u.id, u]))

    // Combine the data
    const applications: SellerApplication[] = (appsData || []).map((app: any) => {
      const user = userMap.get(app.user_id)
      return {
        ...app,
        user_name: user?.name || 'Unknown',
        user_email: user?.email || 'Unknown'
      }
    })

    return new Response(
      JSON.stringify({ applications }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Error in admin-get-applications:', error)
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
