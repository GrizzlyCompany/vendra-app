import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface Conversation {
  id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  conversation_type: string;
  case_status: string;
  last_message: {
    content: string;
    created_at: string;
    sender_name: string;
    is_from_admin: boolean;
  };
  message_count: number;
  unread_count?: number;
  closed_at?: string;
  closed_by?: string;
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
        JSON.stringify({ error: 'Unauthorized - Authentication required', details: authError?.message }),
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
    const { data: adminUser, error: adminUserError } = await supabaseClient
      .from('users')
      .select('id')
      .eq('email', 'admin@vendra.com')
      .single()

    if (adminUserError || !adminUser) {
      console.error('Error getting admin user:', adminUserError)
      throw new Error('Admin user not found: ' + (adminUserError?.message || 'Unknown error'))
    }

    // First, get messages between admin and users with improved query
    // Include messages that might have been misclassified
    const { data: messagesData, error: messagesError } = await supabaseClient
      .from('messages')
      .select(`
        id,
        sender_id,
        recipient_id,
        content,
        created_at,
        read_at,
        conversation_type,
        case_status,
        closed_at,
        closed_by
      `)
      .or(`sender_id.eq.${adminUser.id},recipient_id.eq.${adminUser.id}`)
      .or('conversation_type.eq.user_to_admin,conversation_type.eq.admin_to_user') // Include both types
      .order('created_at', { ascending: false })
      .limit(1000) // Increase limit to ensure we get all recent messages

    if (messagesError) {
      console.error('Error fetching messages:', messagesError)
      throw new Error('Failed to fetch messages: ' + messagesError.message)
    }

    // If no messages, return empty array
    if (!messagesData || messagesData.length === 0) {
      return new Response(
        JSON.stringify({ conversations: [] }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Filter and correct messages that should be user_to_admin conversations
    const correctedMessages = messagesData.map((msg: any) => {
      // If message contains "Nuevo Reporte" but isn't marked as user_to_admin, correct it
      if (msg.content.includes('Nuevo Reporte') && msg.conversation_type !== 'user_to_admin') {
        return {
          ...msg,
          conversation_type: 'user_to_admin',
          case_status: msg.case_status === 'closed' ? 'open' : msg.case_status // Reopen closed reports
        };
      }
      return msg;
    });

    // Get all user IDs involved in conversations
    const userIds = new Set<string>()
    correctedMessages.forEach((msg: any) => {
      if (msg.sender_id !== adminUser.id) userIds.add(msg.sender_id)
      if (msg.recipient_id !== adminUser.id) userIds.add(msg.recipient_id)
    })

    // Get user information for all involved users
    let userData: any[] = []
    let userError: any = null
    
    if (userIds.size > 0) {
      const { data, error } = await supabaseClient
        .from('users')
        .select('id, name, email')
        .in('id', Array.from(userIds))

      userData = data || []
      userError = error
    }

    if (userError) {
      console.error('Error fetching users:', userError)
      throw new Error('Failed to fetch user data: ' + userError.message)
    }

    // Create a user map for quick lookup
    const userMap = new Map(userData?.map((user: any) => [user.id, user]) || [])

    // Group messages by user conversation
    const conversationMap: Map<string, any> = new Map()

    correctedMessages.forEach((msg: any) => {
      // Only process user_to_admin conversations
      if (msg.conversation_type !== 'user_to_admin') return;
      
      const otherUserId = msg.sender_id === adminUser.id ? msg.recipient_id : msg.sender_id
      const userInfo = userMap.get(otherUserId)
      const isFromAdmin = msg.sender_id === adminUser.id

      if (!conversationMap.has(otherUserId)) {
        // Initialize new conversation
        conversationMap.set(otherUserId, {
          id: otherUserId,
          user_id: otherUserId,
          user_name: userInfo?.name || 'Unknown',
          user_email: userInfo?.email || '',
          conversation_type: 'user_to_admin',
          case_status: msg.case_status || 'open',
          message_count: 0,
          unread_count: 0,
          messages: []
        })
      }

      const conversation = conversationMap.get(otherUserId)!
      conversation.message_count++;
      conversation.messages.push(msg)

      // Count unread messages (messages from users that admin hasn't read)
      if (!isFromAdmin && !msg.read_at) {
        conversation.unread_count++;
      }
    })

    // Transform to final format with latest message info
    const conversations: Conversation[] = Array.from(conversationMap.values()).map((conv: any) => {
      // Sort messages by date to get the latest
      conv.messages.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      const latestMessage = conv.messages[0]

      return {
        id: conv.user_id,
        user_id: conv.user_id,
        user_name: conv.user_name,
        user_email: conv.user_email,
        conversation_type: conv.conversation_type,
        case_status: conv.case_status,
        last_message: {
          content: latestMessage.content,
          created_at: latestMessage.created_at,
          sender_name: latestMessage.sender_id === adminUser.id ? 'Admin' : conv.user_name,
          is_from_admin: latestMessage.sender_id === adminUser.id
        },
        message_count: conv.message_count,
        unread_count: conv.unread_count,
        closed_at: conv.messages.find((m: any) => m.closed_at)?.closed_at,
        closed_by: conv.messages.find((m: any) => m.closed_by)?.closed_by
      }
    })

    // Sort conversations by latest message date
    conversations.sort((a, b) =>
      new Date(b.last_message.created_at).getTime() - new Date(a.last_message.created_at).getTime()
    )

    return new Response(
      JSON.stringify({ conversations }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Error in admin-get-messages:', error)
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})