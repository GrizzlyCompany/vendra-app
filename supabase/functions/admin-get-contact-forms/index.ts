import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface AdminContactForm {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  message: string;
  status: string;
  admin_response: string | null;
  response_date: string | null;
  created_at: string;
  property_id: string | null;
  property_title?: string;
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

    // Check if user has admin access (either by email or user metadata)
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

    // Get all contact forms with optional property information
    const { data: contactFormsData, error: contactFormsError } = await supabaseClient
      .from('contact_forms')
      .select(`
        id,
        name,
        email,
        phone,
        message,
        status,
        admin_response,
        response_date,
        created_at,
        property_id,
        property:properties(title)
      `)
      .order('created_at', { ascending: false })

    if (contactFormsError) {
      throw contactFormsError
    }

    // Transform data to match interface
    const contactForms: AdminContactForm[] = (contactFormsData || []).map(form => ({
      id: form.id,
      name: form.name,
      email: form.email,
      phone: form.phone,
      message: form.message,
      status: form.status,
      admin_response: form.admin_response,
      response_date: form.response_date,
      created_at: form.created_at,
      property_id: form.property_id,
      property_title: form.property?.title || undefined
    }))

    return new Response(
      JSON.stringify({ contact_forms: contactForms }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Error in admin-get-contact-forms:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
