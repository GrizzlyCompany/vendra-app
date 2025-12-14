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

    // Check if user has admin access
    const isAdmin = user.email === 'admin@vendra.com' ||
                    user.email?.endsWith('@admin.com') ||
                    user.email?.endsWith('@vendra.com') ||
                    false

    if (!isAdmin) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - Admin access required', user_email: user.email }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Ensure the request is a POST request
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        {
          status: 405,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Get the request body
    const body = await req.json()
    const { user_id } = body

    // Validate required fields
    if (!user_id) {
      return new Response(
        JSON.stringify({ error: 'User ID is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Get admin user ID
    const adminUserId = user.id

    // Close the conversation by updating all messages between admin and the user
    // Using a simpler query approach to avoid potential syntax issues
    const { data: updatedMessages1, error: updateError1 } = await supabaseClient
      .from('messages')
      .update({
        case_status: 'closed',
        closed_at: new Date().toISOString(),
        closed_by: adminUserId
      })
      .eq('sender_id', adminUserId)
      .eq('recipient_id', user_id)
      .eq('conversation_type', 'user_to_admin')

    const { data: updatedMessages2, error: updateError2 } = await supabaseClient
      .from('messages')
      .update({
        case_status: 'closed',
        closed_at: new Date().toISOString(),
        closed_by: adminUserId
      })
      .eq('sender_id', user_id)
      .eq('recipient_id', adminUserId)
      .eq('conversation_type', 'user_to_admin')

    // Check for errors in either query
    if (updateError1 && updateError2) {
      console.error('Error closing case - Query 1:', updateError1)
      console.error('Error closing case - Query 2:', updateError2)
      return new Response(
        JSON.stringify({ 
          error: 'Failed to close case',
          details: `Query 1: ${updateError1.message}, Query 2: ${updateError2.message}`
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Combine results
    const updatedMessages = [
      ...(updatedMessages1?.data || []),
      ...(updatedMessages2?.data || [])
    ]

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Case closed successfully',
        closed_messages: updatedMessages
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Error in admin-close-case:', error)
    console.error('Error name:', error?.name)
    console.error('Error message:', error?.message)
    console.error('Error stack:', error?.stack)
    
    // Try to get more details about the error
    let errorMessage = 'Unknown error'
    if (error instanceof Error) {
      errorMessage = error.message
    } else if (typeof error === 'string') {
      errorMessage = error
    } else if (error && typeof error === 'object') {
      errorMessage = JSON.stringify(error)
    }
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: errorMessage,
        name: error?.name,
        message: error?.message
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
