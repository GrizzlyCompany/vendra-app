// Edge Function to send reports via messages system
// Creates a support case and sends the initial message

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders, status: 204 })
  }

  try {
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 405 }
      )
    }

    const body = await req.json()
    const { title, description, category, userEmail, userName, userId } = body

    if (!title || !description || !userId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    console.log('Creating support case for user:', userId)

    // Create Supabase client with service role key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get admin user ID
    const { data: adminUser, error: adminError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', 'admin@vendra.com')
      .single()

    if (adminError || !adminUser) {
      console.error('Admin user not found:', adminError)
      return new Response(
        JSON.stringify({ error: 'Admin user not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    // Step 1: Create support case
    const { data: supportCase, error: caseError } = await supabaseAdmin
      .from('support_cases')
      .insert({
        user_id: userId,
        status: 'open',
        title: title,
        description: description,
        category: category || 'general'
      })
      .select('id')
      .single()

    if (caseError) {
      console.error('Error creating support case:', caseError)
      return new Response(
        JSON.stringify({ error: 'Failed to create support case', details: caseError.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    console.log('Support case created:', supportCase.id)

    // Step 2: Create the initial message
    const messageContent = `🆕 NUEVO REPORTE RECIBIDO 🆕
Usuario: ${userName} (${userEmail})
Categoría: ${category}
Título: ${title}
Descripción: ${description}

📋 Este mensaje ha sido enviado como un nuevo reporte.
🔄 Para continuar la conversación, utiliza el sistema de mensajes normalmente.`

    const { data: message, error: msgError } = await supabaseAdmin
      .from('messages')
      .insert({
        sender_id: userId,
        recipient_id: adminUser.id,
        content: messageContent,
        conversation_type: 'user_to_admin',
        case_id: supportCase.id
      })
      .select('id')
      .single()

    if (msgError) {
      console.error('Error creating message:', msgError)
      // Case was created but message failed - still return success but log warning
    }

    console.log('Report submitted successfully, case:', supportCase.id)

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Report submitted successfully',
        case_id: supportCase.id
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error: any) {
    console.error('Error in send-report:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
