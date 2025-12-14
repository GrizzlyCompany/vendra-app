// Edge Function to close a support case
// Updates the support_cases table and sends a closing message

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Verify admin authentication
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token)

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const isAdmin = user.email === 'admin@vendra.com' ||
      user.email?.endsWith('@admin.com') ||
      user.email?.endsWith('@vendra.com')

    if (!isAdmin) {
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const body = await req.json()
    const { user_id } = body

    if (!user_id) {
      return new Response(
        JSON.stringify({ error: 'User ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Closing case for user:', user_id)

    // Step 1: Find all OPEN cases for this user and close them
    const { data: openCases, error: findError } = await supabaseClient
      .from('support_cases')
      .select('id')
      .eq('user_id', user_id)
      .eq('status', 'open')

    if (findError) {
      console.error('Error finding open cases:', findError)
      return new Response(
        JSON.stringify({ error: 'Failed to find cases', details: findError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Found open cases:', openCases?.length || 0)

    // Step 2: Close all open cases
    const { error: closeError } = await supabaseClient
      .from('support_cases')
      .update({
        status: 'closed',
        closed_at: new Date().toISOString(),
        closed_by: user.id
      })
      .eq('user_id', user_id)
      .eq('status', 'open')

    if (closeError) {
      console.error('Error closing cases:', closeError)
      return new Response(
        JSON.stringify({ error: 'Failed to close cases', details: closeError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Step 3: Send closing message
    const { error: msgError } = await supabaseClient
      .from('messages')
      .insert({
        sender_id: user.id,
        recipient_id: user_id,
        content: '✅ Tu caso ha sido resuelto y cerrado. Si tienes otra inquietud, puedes crear un nuevo reporte en la sección de Reportes. ¡Gracias por contactarnos!',
        conversation_type: 'user_to_admin'
      })

    if (msgError) {
      console.warn('Warning: Could not send closing message:', msgError)
    }

    console.log('Case closed successfully for user:', user_id)

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Case closed successfully',
        cases_closed: openCases?.length || 0
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('Error in admin-close-case:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
