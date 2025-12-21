// Edge Function: Update Report Status
// Allows admins to update report status (assign, resolve, dismiss)
// Includes audit logging

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, PUT, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

const VALID_STATUSES = ['pending', 'reviewing', 'resolved', 'dismissed'] as const
type ReportStatus = typeof VALID_STATUSES[number]

interface UpdateRequest {
    report_id: string
    status?: ReportStatus
    resolution_notes?: string
    assign_to_me?: boolean
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders, status: 204 })
    }

    try {
        if (req.method !== 'POST' && req.method !== 'PUT') {
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
        const body: UpdateRequest = await req.json()
        const { report_id, status, resolution_notes, assign_to_me } = body

        if (!report_id) {
            return new Response(
                JSON.stringify({ error: 'report_id is required' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
            )
        }

        // Validate status if provided
        if (status && !VALID_STATUSES.includes(status)) {
            return new Response(
                JSON.stringify({ error: 'Invalid status', valid_statuses: VALID_STATUSES }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
            )
        }

        // Get current report
        const { data: currentReport, error: fetchError } = await supabaseClient
            .from('conversation_reports')
            .select('*')
            .eq('id', report_id)
            .single()

        if (fetchError || !currentReport) {
            return new Response(
                JSON.stringify({ error: 'Report not found' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
            )
        }

        // Build update object
        const updates: any = {}

        if (status) {
            updates.status = status
        }

        if (resolution_notes !== undefined) {
            updates.resolution_notes = resolution_notes
        }

        if (assign_to_me) {
            updates.assigned_admin_id = user.id
            // Auto-set to reviewing if assigning
            if (!status && currentReport.status === 'pending') {
                updates.status = 'reviewing'
            }
        }

        if (Object.keys(updates).length === 0) {
            return new Response(
                JSON.stringify({ error: 'No updates provided' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
            )
        }

        // Update the report
        const { data: updatedReport, error: updateError } = await supabaseClient
            .from('conversation_reports')
            .update(updates)
            .eq('id', report_id)
            .select()
            .single()

        if (updateError) {
            console.error('Error updating report:', updateError)
            return new Response(
                JSON.stringify({ error: 'Failed to update report', details: updateError.message }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
            )
        }

        // Log the admin action
        let accessType = 'view_reported_conversation'
        if (status === 'resolved') accessType = 'resolve_report'
        else if (status === 'dismissed') accessType = 'dismiss_report'

        await supabaseClient
            .from('admin_access_logs')
            .insert({
                admin_id: user.id,
                report_id: report_id,
                user_id: currentReport.reported_user_id,
                access_type: accessType,
                access_reason: `Updated report: ${JSON.stringify(updates)}`,
                ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip'),
                user_agent: req.headers.get('user-agent')
            })

        console.log(`Report ${report_id} updated by admin ${user.id}: ${JSON.stringify(updates)}`)

        return new Response(
            JSON.stringify({
                success: true,
                message: 'Report updated successfully',
                report: updatedReport
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        )

    } catch (error: any) {
        console.error('Error in admin-update-report:', error)
        return new Response(
            JSON.stringify({ error: 'Internal server error', details: error.message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        )
    }
})
