// supabase/functions/admin-get-conversation/index.ts
// Edge Function to fetch conversation between two users for admin panel (bypasses RLS)

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        // Create Supabase client with service role key to bypass RLS
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

        // Check if user is admin
        const isAdmin = user.email === 'admin@vendra.com' ||
            user.email?.endsWith('@admin.com') ||
            user.email?.endsWith('@vendra.com')

        if (!isAdmin) {
            return new Response(
                JSON.stringify({ error: 'Admin access required' }),
                { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // Get user IDs from request body
        const { user1_id, user2_id } = await req.json()

        if (!user1_id || !user2_id) {
            return new Response(
                JSON.stringify({ error: 'user1_id and user2_id are required' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // Log admin access for audit
        await supabaseClient
            .from('admin_access_logs')
            .insert({
                admin_id: user.id,
                access_type: 'view_user_conversation',
                access_reason: `Viewing conversation between users ${user1_id} and ${user2_id}`,
                ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip'),
                user_agent: req.headers.get('user-agent')
            })

        // Fetch messages between the two users (bypasses RLS with service role)
        const { data: messages, error: messagesError } = await supabaseClient
            .from('messages')
            .select('id, sender_id, recipient_id, content, created_at, read_at')
            .or(`and(sender_id.eq.${user1_id},recipient_id.eq.${user2_id}),and(sender_id.eq.${user2_id},recipient_id.eq.${user1_id})`)
            .order('created_at', { ascending: true })

        if (messagesError) {
            console.error('Error fetching messages:', messagesError)
            return new Response(
                JSON.stringify({ error: 'Failed to fetch messages', details: messagesError.message }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        return new Response(
            JSON.stringify({ messages: messages || [] }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error) {
        console.error('Error in admin-get-conversation:', error)
        return new Response(
            JSON.stringify({ error: 'Internal server error', details: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
