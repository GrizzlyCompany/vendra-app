# Send Report Function

This is a Supabase Edge Function that handles report submissions from the Vendra application.

## Features

1. **Multiple Delivery Methods**:
   - Webhook integration (configurable via `REPORTS_WEBHOOK_URL`)
   - Email via Resend (when `RESEND_API_KEY` is set)
   - Console logging (fallback for development)

2. **Environment Variable Configuration**:
   - `REPORTS_WEBHOOK_URL`: Webhook endpoint for report delivery
   - `RESEND_API_KEY`: Resend API key for email delivery
   - `ADMIN_EMAIL`: Email address for report notifications

## Important Note

This function is written for the Deno runtime used by Supabase Edge Functions. The TypeScript errors you see in your IDE are expected because:

1. It imports modules directly from URLs (Deno feature)
2. It uses the `Deno` global object for environment variables
3. The `serve` function has a different signature in Deno

These errors will not prevent the function from working when deployed to Supabase.

**Update**: The function now uses the modern `Deno.serve` API instead of the deprecated `serve` function from the Deno standard library for better compatibility with current Supabase Edge Runtime versions.

## Deployment

To deploy this function:

```bash
supabase functions deploy send-report
```

## Environment Variables

Make sure these environment variables are set in your Supabase project:

- `RESEND_API_KEY`: Your Resend API key (optional, for email delivery)
- `ADMIN_EMAIL`: The email address where reports should be sent (optional)
- `REPORTS_WEBHOOK_URL`: Webhook URL for report delivery (optional)

## Testing

To test locally:

```bash
supabase functions serve
```

Then send a POST request to `http://localhost:54321/functions/v1/send-report` with a JSON body containing:
- title
- description
- category
- userEmail
- userName
- userId

## Delivery Priority

The function will attempt to deliver reports in this order:
1. Webhook (if `REPORTS_WEBHOOK_URL` is set)
2. Email via Resend (if `RESEND_API_KEY` is set)
3. Console logging (fallback)