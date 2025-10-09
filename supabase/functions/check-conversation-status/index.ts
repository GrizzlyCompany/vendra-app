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

    // Verify the user is authenticated
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
    const { recipient_id, conversation_type } = body

    // Validate required fields
    if (!recipient_id || !conversation_type) {
      return new Response(
        JSON.stringify({ error: 'Recipient ID and conversation type are required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Check if this is a user-to-admin conversation
    if (conversation_type === 'user_to_admin') {
      // Get admin user ID
      const { data: adminUser, error: adminError } = await supabaseClient
        .from('users')
        .select('id')
        .eq('email', 'admin@vendra.com')
        .single()

      if (adminError || !adminUser) {
        return new Response(
          JSON.stringify({ error: 'Admin user not found' }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }

      // Check if there's an existing conversation with case_status = 'closed'
      const { data: closedMessages, error: checkError } = await supabaseClient
        .from('messages')
        .select('case_status')
        .or(`and(sender_id.eq.${user.id},recipient_id.eq.${recipient_id}),and(sender_id.eq.${recipient_id},recipient_id.eq.${user.id})`)
        .eq('conversation_type', 'user_to_admin')
        .eq('case_status', 'closed')
        .limit(1)

      if (checkError) {
        console.error('Error checking conversation status:', checkError)
        return new Response(
          JSON.stringify({ error: 'Failed to check conversation status' }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }

      // If there are closed messages, the conversation is closed
      const isClosed = closedMessages && closedMessages.length > 0

      return new Response(
        JSON.stringify({
          is_closed: isClosed,
          message: isClosed 
            ? 'Esta conversación ha sido cerrada. Por favor, crea un nuevo reporte si tienes otra inquietud.' 
            : 'Conversation is open'
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // For non-admin conversations, allow messages
    return new Response(
      JSON.stringify({
        is_closed: false,
        message: 'Conversation is open'
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Error in check-conversation-status:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})