import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface AdminMessage {
  id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  created_at: string;
  read_at: string | null;
  sender_name: string;
  recipient_name: string;
  is_from_admin: boolean;
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

    // Get admin user ID
    const { data: adminUser, error: adminError } = await supabaseClient
      .from('users')
      .select('id')
      .eq('email', 'admin@vendra.com')
      .single()

    if (adminError || !adminUser) {
      // If admin user not found in public.users, try to create it or handle gracefully
      console.log('Admin user not found in public.users, checking auth.users...')
      
      // Get the authenticated admin user's ID from the token
      if (!user) {
        throw new Error('Admin user not found and no authenticated user')
      }
      
      // Use the authenticated user's ID as admin ID
      const adminUserId = user.id
      console.log('Using authenticated user ID as admin ID:', adminUserId)
      
      // Get messages involving the admin (as sender or recipient)
      const { data: messagesData, error: messagesError } = await supabaseClient
        .from('messages')
        .select(`
          id,
          sender_id,
          recipient_id,
          content,
          created_at,
          read_at
        `)
        .or(`sender_id.eq.${adminUserId},recipient_id.eq.${adminUserId}`)
        .order('created_at', { ascending: false })

      if (messagesError) {
        throw messagesError
      }

      // Get user information for senders and recipients
      const userIds = [...new Set([
        ...messagesData.map(msg => msg.sender_id),
        ...messagesData.map(msg => msg.recipient_id)
      ])]

      const { data: usersData, error: usersError } = await supabaseClient
        .from('users')
        .select('id, name')
        .in('id', userIds)

      if (usersError) {
        throw usersError
      }

      // Create a map for quick lookup
      const userMap = new Map(usersData.map(user => [user.id, user]))

      // Transform data to match interface
      const messages: AdminMessage[] = (messagesData || []).map(msg => ({
        id: msg.id,
        sender_id: msg.sender_id,
        recipient_id: msg.recipient_id,
        content: msg.content,
        created_at: msg.created_at,
        read_at: msg.read_at,
        sender_name: userMap.get(msg.sender_id)?.name || 'Unknown',
        recipient_name: userMap.get(msg.recipient_id)?.name || 'Unknown',
        is_from_admin: msg.sender_id === adminUserId
      }))

      return new Response(
        JSON.stringify({ messages }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Get messages involving the admin (as sender or recipient)
    const { data: messagesData, error: messagesError } = await supabaseClient
      .from('messages')
      .select(`
        id,
        sender_id,
        recipient_id,
        content,
        created_at,
        read_at
      `)
      .or(`sender_id.eq.${adminUser.id},recipient_id.eq.${adminUser.id}`)
      .order('created_at', { ascending: false })

    if (messagesError) {
      throw messagesError
    }

    // Get user information for senders and recipients
    const userIds = [...new Set([
      ...messagesData.map(msg => msg.sender_id),
      ...messagesData.map(msg => msg.recipient_id)
    ])]

    const { data: usersData, error: usersError } = await supabaseClient
      .from('users')
      .select('id, name')
      .in('id', userIds)

    if (usersError) {
      throw usersError
    }

    // Create a map for quick lookup
    const userMap = new Map(usersData.map(user => [user.id, user]))

    // Transform data to match interface
    const messages: AdminMessage[] = (messagesData || []).map(msg => ({
      id: msg.id,
      sender_id: msg.sender_id,
      recipient_id: msg.recipient_id,
      content: msg.content,
      created_at: msg.created_at,
      read_at: msg.read_at,
      sender_name: userMap.get(msg.sender_id)?.name || 'Unknown',
      recipient_name: userMap.get(msg.recipient_id)?.name || 'Unknown',
      is_from_admin: msg.sender_id === adminUser.id
    }))

    return new Response(
      JSON.stringify({ messages }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Error in admin-get-messages:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
