import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import webpush from 'https://esm.sh/web-push'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

        const payload = await req.json()
        const { record } = payload

        if (!record) {
            return new Response(JSON.stringify({ error: 'No record found in payload' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400,
            })
        }

        const { recipient_id, content, sender_id } = record

        // Get sender info
        const { data: sender } = await supabaseClient
            .from('public_profiles')
            .select('name')
            .eq('id', sender_id)
            .single()

        // Get recipient subscriptions
        const { data: subscriptions } = await supabaseClient
            .from('push_subscriptions')
            .select('*')
            .eq('user_id', recipient_id)

        if (!subscriptions || subscriptions.length === 0) {
            return new Response(JSON.stringify({ message: 'No subscriptions found' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            })
        }

        const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY')
        const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')

        if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
            return new Response(JSON.stringify({ error: 'VAPID keys not configured in Edge Function environment' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 500,
            })
        }

        webpush.setVapidDetails(
            'mailto:info@vendra.com',
            VAPID_PUBLIC_KEY,
            VAPID_PRIVATE_KEY
        )

        const pushPromises = subscriptions.map((sub) => {
            const pushSubscription = {
                endpoint: sub.endpoint,
                keys: {
                    p256dh: sub.p256dh,
                    auth: sub.auth,
                },
            }

            return webpush.sendNotification(
                pushSubscription,
                JSON.stringify({
                    title: `Nuevo mensaje de ${sender?.name || 'Vendra'}`,
                    body: content,
                    url: `/messages?to=${sender_id}`,
                })
            ).catch(async (err) => {
                if (err.statusCode === 410 || err.statusCode === 404) {
                    // Subscription has expired or is no longer valid
                    await supabaseClient.from('push_subscriptions').delete().eq('id', sub.id)
                    return { success: false, error: 'Expired' }
                }
                return { success: false, error: err.message }
            })
        })

        await Promise.all(pushPromises)

        return new Response(JSON.stringify({ success: true }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        })
    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
        })
    }
})
