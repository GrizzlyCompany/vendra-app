import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface AdminCompany {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  contact_person: string | null;
  projects_count: number;
  verification_status: 'approved' | 'pending' | 'rejected';
  created_at: string;
  website?: string;
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

    // Get all companies (users with role 'empresa_constructora')
    const { data: companiesData, error: companiesError } = await supabaseClient
      .from('users')
      .select('id, name, email, primary_phone, contact_person, website, inserted_at')
      .eq('role', 'empresa_constructora')
      .order('name')

    if (companiesError) {
      throw companiesError
    }

    // Get project counts for each company
    const companies: AdminCompany[] = await Promise.all(
      (companiesData || []).map(async (company) => {
        const { count: projectsCount, error: countError } = await supabaseClient
          .from('projects')
          .select('*', { count: 'exact', head: true })
          .eq('owner_id', company.id)

        if (countError) {
          console.error('Error counting projects for company:', company.id, countError)
        }

        return {
          id: company.id,
          name: company.name || 'N/A',
          email: company.email || 'N/A',
          phone: company.primary_phone || null,
          contact_person: company.contact_person || null,
          projects_count: countError ? 0 : (projectsCount || 0),
          verification_status: 'approved' as const, // Companies are approved by default
          created_at: company.inserted_at || new Date().toISOString(),
          website: company.website || undefined
        }
      })
    )

    return new Response(
      JSON.stringify({ companies }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Error in admin-get-companies:', error)
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
