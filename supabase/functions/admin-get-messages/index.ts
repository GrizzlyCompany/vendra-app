// Edge Function to get all admin messages/conversations
// Reads case status from support_cases table

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
  case_status: string;
  last_message: {
    content: string;
    created_at: string;
    sender_name: string;
    is_from_admin: boolean;
  };
  message_count: number;
  unread_count: number;
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

    // Get admin user ID
    const { data: adminUser, error: adminUserError } = await supabaseClient
      .from('users')
      .select('id')
      .eq('email', 'admin@vendra.com')
      .single()

    if (adminUserError || !adminUser) {
      throw new Error('Admin user not found')
    }

    // Log admin access to messages
    await supabaseClient
      .from('admin_access_logs')
      .insert({
        admin_id: user.id,
        access_type: 'view_conversations',
        access_reason: 'Viewing admin-user support conversations',
        ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip'),
        user_agent: req.headers.get('user-agent')
      })

    // Get all messages with admin
    const { data: messagesData, error: messagesError } = await supabaseClient
      .from('messages')
      .select('id, sender_id, recipient_id, content, created_at, read_at')
      .or(`sender_id.eq.${adminUser.id},recipient_id.eq.${adminUser.id}`)
      .order('created_at', { ascending: false })
      .limit(1000)

    if (messagesError) {
      throw new Error('Failed to fetch messages: ' + messagesError.message)
    }

    if (!messagesData || messagesData.length === 0) {
      return new Response(
        JSON.stringify({ conversations: [] }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get all unique user IDs
    const userIds = new Set<string>()
    messagesData.forEach((msg: any) => {
      if (msg.sender_id !== adminUser.id) userIds.add(msg.sender_id)
      if (msg.recipient_id !== adminUser.id) userIds.add(msg.recipient_id)
    })

    // Get user information
    const { data: userData } = await supabaseClient
      .from('users')
      .select('id, name, email')
      .in('id', Array.from(userIds))

    const userMap = new Map(userData?.map((u: any) => [u.id, u]) || [])

    // Get case status for each user from support_cases
    const { data: casesData } = await supabaseClient
      .from('support_cases')
      .select('user_id, status')
      .in('user_id', Array.from(userIds))
      .order('created_at', { ascending: false })

    // Create a map of user_id -> latest case status
    const caseStatusMap = new Map<string, string>()
    casesData?.forEach((c: any) => {
      // Only set if not already set (first one is the latest)
      if (!caseStatusMap.has(c.user_id)) {
        caseStatusMap.set(c.user_id, c.status)
      }
    })

    // Group messages by user
    const conversationMap = new Map<string, any>()
    messagesData.forEach((msg: any) => {
      const otherUserId = msg.sender_id === adminUser.id ? msg.recipient_id : msg.sender_id
      const userInfo = userMap.get(otherUserId) as { name: string, email: string } | undefined
      const isFromAdmin = msg.sender_id === adminUser.id

      if (!conversationMap.has(otherUserId)) {
        conversationMap.set(otherUserId, {
          id: otherUserId,
          user_id: otherUserId,
          user_name: userInfo?.name || 'Unknown',
          user_email: userInfo?.email || '',
          case_status: caseStatusMap.get(otherUserId) || 'open',
          message_count: 0,
          unread_count: 0,
          messages: []
        })
      }

      const conv = conversationMap.get(otherUserId)!
      conv.message_count++
      conv.messages.push(msg)

      if (!isFromAdmin && !msg.read_at) {
        conv.unread_count++
      }
    })

    // Transform to final format
    const conversations: Conversation[] = Array.from(conversationMap.values()).map((conv: any) => {
      conv.messages.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      const latestMessage = conv.messages[0] as { content: string, created_at: string, sender_id: string }

      return {
        id: conv.user_id,
        user_id: conv.user_id,
        user_name: conv.user_name,
        user_email: conv.user_email,
        case_status: conv.case_status,
        last_message: {
          content: latestMessage.content,
          created_at: latestMessage.created_at,
          sender_name: latestMessage.sender_id === adminUser.id ? 'Admin' : conv.user_name,
          is_from_admin: latestMessage.sender_id === adminUser.id
        },
        message_count: conv.message_count,
        unread_count: conv.unread_count
      }
    })

    // Sort by latest message
    conversations.sort((a, b) =>
      new Date(b.last_message.created_at).getTime() - new Date(a.last_message.created_at).getTime()
    )

    return new Response(
      JSON.stringify({ conversations }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('Error in admin-get-messages:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})