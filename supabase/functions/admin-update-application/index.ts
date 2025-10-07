import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
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

    if (authError || !user || user.email !== 'admin@vendra.com') {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - Admin access required' }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Parse the request body
    const { applicationId, status } = await req.json()

    if (!applicationId || !status) {
      return new Response(
        JSON.stringify({ error: 'Missing applicationId or status' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    if (!['approved', 'rejected', 'needs_more_info'].includes(status)) {
      return new Response(
        JSON.stringify({ error: 'Invalid status' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Update the application status
    const { error: appError } = await supabaseClient
      .from('seller_applications')
      .update({
        status,
        reviewed_at: new Date().toISOString(),
        reviewer_id: user.id
      })
      .eq('id', applicationId)

    if (appError) {
      throw appError
    }

    // If approved, update the user's role
    if (status === 'approved') {
      // First get the application to find the user_id
      const { data: application, error: getAppError } = await supabaseClient
        .from('seller_applications')
        .select('user_id')
        .eq('id', applicationId)
        .single()

      if (getAppError) {
        throw getAppError
      }

      if (application) {
        // Update user role to 'vendedor_agente'
        const { error: userError } = await supabaseClient
          .from('users')
          .update({ role: 'vendedor_agente' })
          .eq('id', application.user_id)

        if (userError) {
          console.error('Error updating user role:', userError)
          // Don't fail the request if role update fails, just log it
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Error in admin-update-application:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
