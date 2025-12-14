import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface AdminAgent {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  properties_count: number;
  last_login: string;
  status: 'active' | 'inactive';
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

    // Get all agents (users with role 'vendedor_agente')
    const { data: agentsData, error: agentsError } = await supabaseClient
      .from('users')
      .select('id, name, email, primary_phone, updated_at')
      .eq('role', 'vendedor_agente')
      .order('name')

    if (agentsError) {
      throw agentsError
    }

    // Get property counts for each agent
    const agents: AdminAgent[] = await Promise.all(
      (agentsData || []).map(async (agent) => {
        const { count: propertiesCount, error: countError } = await supabaseClient
          .from('properties')
          .select('*', { count: 'exact', head: true })
          .eq('owner_id', agent.id)
          .eq('is_published', true)
          .eq('status', 'active')

        if (countError) {
          console.error('Error counting properties for agent:', agent.id, countError)
        }

        return {
          id: agent.id,
          name: agent.name || 'N/A',
          email: agent.email || 'N/A',
          phone: agent.primary_phone || null,
          properties_count: countError ? 0 : (propertiesCount || 0),
          last_login: agent.updated_at || agent.updated_at || new Date().toISOString(),
          status: 'active' as const // All agents are marked as active for now
        }
      })
    )

    return new Response(
      JSON.stringify({ agents }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Error in admin-get-agents:', error)
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
