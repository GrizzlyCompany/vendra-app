// Edge Function: Get Reported Conversations for Admin
// Returns all conversation reports with user details and message preview
// Includes audit logging for compliance

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ReportWithDetails {
    id: string
    reporter: {
        id: string
        name: string
        email: string
    }
    reported_user: {
        id: string
        name: string
        email: string
    }
    reason: string
    description: string | null
    status: string
    assigned_admin_id: string | null
    resolution_notes: string | null
    created_at: string
    updated_at: string
    resolved_at: string | null
    last_message_preview?: string
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

        // Check admin status
        const isAdmin = user.email === 'admin@vendra.com' ||
            user.email?.endsWith('@admin.com') ||
            user.email?.endsWith('@vendra.com')

        if (!isAdmin) {
            return new Response(
                JSON.stringify({ error: 'Admin access required' }),
                { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // Parse query parameters
        const url = new URL(req.url)
        const statusFilter = url.searchParams.get('status') // pending, reviewing, resolved, dismissed, all
        const limit = parseInt(url.searchParams.get('limit') || '50')
        const offset = parseInt(url.searchParams.get('offset') || '0')

        // Log admin access
        await supabaseClient
            .from('admin_access_logs')
            .insert({
                admin_id: user.id,
                access_type: 'view_conversations',
                access_reason: `Viewing reported conversations (filter: ${statusFilter || 'all'})`,
                ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip'),
                user_agent: req.headers.get('user-agent')
            })

        // Build query
        let query = supabaseClient
            .from('conversation_reports')
            .select('*')
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1)

        // Apply status filter
        if (statusFilter && statusFilter !== 'all') {
            query = query.eq('status', statusFilter)
        }

        const { data: reports, error: reportsError } = await query

        if (reportsError) {
            throw new Error('Failed to fetch reports: ' + reportsError.message)
        }

        if (!reports || reports.length === 0) {
            // Get counts even if no reports in current filter
            const { data: counts } = await supabaseClient.rpc('get_report_counts')

            return new Response(
                JSON.stringify({
                    reports: [],
                    counts: counts?.[0] || { pending_count: 0, reviewing_count: 0, resolved_count: 0, dismissed_count: 0, total_count: 0 }
                }),
                { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // Get all unique user IDs
        const userIds = new Set<string>()
        reports.forEach((report: any) => {
            userIds.add(report.reporter_id)
            userIds.add(report.reported_user_id)
        })

        // Fetch user information
        const { data: usersData } = await supabaseClient
            .from('users')
            .select('id, name, email')
            .in('id', Array.from(userIds))

        const userMap = new Map(usersData?.map((u: any) => [u.id, u]) || [])

        // Get latest message between reporter and reported for context
        const reporterReportedPairs = reports.map((r: any) => ({
            reporter_id: r.reporter_id,
            reported_user_id: r.reported_user_id
        }))

        // Transform reports with user details
        const reportsWithDetails: ReportWithDetails[] = await Promise.all(
            reports.map(async (report: any) => {
                const reporter = userMap.get(report.reporter_id)
                const reportedUser = userMap.get(report.reported_user_id)

                // Get last message between these users for context
                const { data: lastMessage } = await supabaseClient
                    .from('messages')
                    .select('content, created_at')
                    .or(`and(sender_id.eq.${report.reporter_id},recipient_id.eq.${report.reported_user_id}),and(sender_id.eq.${report.reported_user_id},recipient_id.eq.${report.reporter_id})`)
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .single()

                return {
                    id: report.id,
                    reporter: {
                        id: report.reporter_id,
                        name: reporter?.name || 'Unknown',
                        email: reporter?.email || ''
                    },
                    reported_user: {
                        id: report.reported_user_id,
                        name: reportedUser?.name || 'Unknown',
                        email: reportedUser?.email || ''
                    },
                    reason: report.reason,
                    description: report.description,
                    status: report.status,
                    assigned_admin_id: report.assigned_admin_id,
                    resolution_notes: report.resolution_notes,
                    created_at: report.created_at,
                    updated_at: report.updated_at,
                    resolved_at: report.resolved_at,
                    last_message_preview: lastMessage?.content?.substring(0, 100) + (lastMessage?.content?.length > 100 ? '...' : '') || null
                }
            })
        )

        // Get report counts
        const { data: counts } = await supabaseClient.rpc('get_report_counts')

        return new Response(
            JSON.stringify({
                reports: reportsWithDetails,
                counts: counts?.[0] || { pending_count: 0, reviewing_count: 0, resolved_count: 0, dismissed_count: 0, total_count: 0 }
            }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error: any) {
        console.error('Error in admin-get-reported-conversations:', error)
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
