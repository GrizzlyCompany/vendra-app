// Edge Function: Escalate Support Case to User Report
// Allows admin to convert a support ticket into a user report for moderation
// Links the report back to the original support case for traceability

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

const VALID_REASONS = [
    'harassment',
    'spam',
    'fraud',
    'fake_listing',
    'inappropriate',
    'impersonation',
    'other'
] as const

type ReportReason = typeof VALID_REASONS[number]

interface EscalateRequest {
    user_id: string           // The user who contacted support (reporter)
    reported_user_id: string  // The user being reported
    reason: ReportReason
    description?: string
    support_case_id?: string  // Optional link to support case
}

serve(async (req) => {
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

        // Parse request body
        const body: EscalateRequest = await req.json()
        const { user_id, reported_user_id, reason, description, support_case_id } = body

        // Validate required fields
        if (!user_id || !reported_user_id || !reason) {
            return new Response(
                JSON.stringify({ error: 'Missing required fields: user_id, reported_user_id, and reason are required' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
            )
        }

        // Validate reason
        if (!VALID_REASONS.includes(reason)) {
            return new Response(
                JSON.stringify({ error: 'Invalid reason', valid_reasons: VALID_REASONS }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
            )
        }

        // Verify both users exist
        const { data: users, error: usersError } = await supabaseClient
            .from('users')
            .select('id, email')
            .in('id', [user_id, reported_user_id])

        if (usersError || !users || users.length < 2) {
            return new Response(
                JSON.stringify({ error: 'One or both users not found' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
            )
        }

        // Check if reported user is admin (can't report admins)
        const reportedUser = users.find(u => u.id === reported_user_id)
        if (reportedUser?.email?.includes('@vendra.com') || reportedUser?.email?.includes('@admin.com')) {
            return new Response(
                JSON.stringify({ error: 'Cannot create report against admin users' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
            )
        }

        // Check for existing pending report
        const { data: existingReport } = await supabaseClient
            .from('conversation_reports')
            .select('id')
            .eq('reporter_id', user_id)
            .eq('reported_user_id', reported_user_id)
            .in('status', ['pending', 'reviewing'])
            .single()

        if (existingReport) {
            return new Response(
                JSON.stringify({
                    error: 'A pending report already exists for this user pair',
                    existing_report_id: existingReport.id
                }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 409 }
            )
        }

        // Build description with escalation note
        const escalationNote = `[Escalado desde Soporte por Admin]${support_case_id ? ` (Caso: ${support_case_id})` : ''}`
        const fullDescription = description
            ? `${escalationNote}\n\n${description}`
            : escalationNote

        // Create the report
        const { data: report, error: reportError } = await supabaseClient
            .from('conversation_reports')
            .insert({
                reporter_id: user_id,
                reported_user_id,
                reason,
                description: fullDescription,
                status: 'reviewing',  // Auto-set to reviewing since admin is already involved
                assigned_admin_id: user.id  // Auto-assign to the escalating admin
            })
            .select('id, created_at')
            .single()

        if (reportError) {
            console.error('Error creating escalated report:', reportError)
            return new Response(
                JSON.stringify({ error: 'Failed to create report', details: reportError.message }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
            )
        }

        // Log the admin action
        await supabaseClient
            .from('admin_access_logs')
            .insert({
                admin_id: user.id,
                user_id: user_id,
                report_id: report.id,
                access_type: 'view_reported_conversation',
                access_reason: `Escalated support case to report. Reason: ${reason}`,
                ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip'),
                user_agent: req.headers.get('user-agent')
            })

        console.log(`Support case escalated to report ${report.id} by admin ${user.id}`)

        return new Response(
            JSON.stringify({
                success: true,
                message: 'Case escalated to reports successfully',
                report_id: report.id,
                created_at: report.created_at
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 201 }
        )

    } catch (error: any) {
        console.error('Error in admin-escalate-to-report:', error)
        return new Response(
            JSON.stringify({ error: 'Internal server error', details: error.message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        )
    }
})
