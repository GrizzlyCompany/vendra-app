// Edge Function: Report Conversation
// Allows users to report problematic conversations with other users
// Creates entry in conversation_reports table

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

// Valid report reasons
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

interface ReportRequest {
    reported_user_id: string
    reason: ReportReason
    description?: string
}

serve(async (req) => {
    // Handle CORS preflight
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

        // Get authorization token
        const authHeader = req.headers.get('Authorization')
        if (!authHeader) {
            return new Response(
                JSON.stringify({ error: 'No authorization header' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
            )
        }

        // Create Supabase client
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            {
                global: {
                    headers: { Authorization: authHeader }
                }
            }
        )

        // Get current user
        const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
        if (authError || !user) {
            return new Response(
                JSON.stringify({ error: 'Unauthorized' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
            )
        }

        // Parse request body
        const body: ReportRequest = await req.json()
        const { reported_user_id, reason, description } = body

        // Validate required fields
        if (!reported_user_id || !reason) {
            return new Response(
                JSON.stringify({ error: 'Missing required fields: reported_user_id and reason are required' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
            )
        }

        // Validate reason
        if (!VALID_REASONS.includes(reason)) {
            return new Response(
                JSON.stringify({
                    error: 'Invalid reason',
                    valid_reasons: VALID_REASONS
                }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
            )
        }

        // Can't report yourself
        if (reported_user_id === user.id) {
            return new Response(
                JSON.stringify({ error: 'You cannot report yourself' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
            )
        }

        // Use service role for database operations
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        // Check if reported user exists
        const { data: reportedUser, error: userError } = await supabaseAdmin
            .from('users')
            .select('id, email')
            .eq('id', reported_user_id)
            .single()

        if (userError || !reportedUser) {
            return new Response(
                JSON.stringify({ error: 'Reported user not found' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
            )
        }

        // Check if user is trying to report admin
        if (reportedUser.email?.includes('@vendra.com') || reportedUser.email?.includes('@admin.com')) {
            return new Response(
                JSON.stringify({ error: 'Cannot report admin users' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
            )
        }

        // Check if there's already a pending report from this user for the same person
        const { data: existingReport } = await supabaseAdmin
            .from('conversation_reports')
            .select('id, status')
            .eq('reporter_id', user.id)
            .eq('reported_user_id', reported_user_id)
            .in('status', ['pending', 'reviewing'])
            .single()

        if (existingReport) {
            return new Response(
                JSON.stringify({
                    error: 'You already have a pending report for this user',
                    existing_report_id: existingReport.id
                }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 409 }
            )
        }

        // Create the report
        const { data: report, error: reportError } = await supabaseAdmin
            .from('conversation_reports')
            .insert({
                reporter_id: user.id,
                reported_user_id,
                reason,
                description: description || null,
                status: 'pending'
            })
            .select('id, created_at')
            .single()

        if (reportError) {
            console.error('Error creating report:', reportError)
            return new Response(
                JSON.stringify({ error: 'Failed to create report', details: reportError.message }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
            )
        }

        console.log(`Report created: ${report.id} by user ${user.id} against ${reported_user_id}`)

        return new Response(
            JSON.stringify({
                success: true,
                message: 'Report submitted successfully',
                report_id: report.id,
                created_at: report.created_at
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 201 }
        )

    } catch (error: any) {
        console.error('Error in report-conversation:', error)
        return new Response(
            JSON.stringify({ error: 'Internal server error', details: error.message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        )
    }
})
