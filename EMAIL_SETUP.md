# Email Setup for Report Submissions

## Overview
The `send-report` function can send emails via Resend when properly configured. To ensure reports are sent to solutionsvendra@gmail.com, you need to set up the appropriate environment variables in your Supabase project.

## Required Environment Variables

### ADMIN_EMAIL
- **Value**: solutionsvendra@gmail.com
- **Purpose**: This is the email address where reports will be sent
- **Required**: Yes

### RESEND_API_KEY (Optional but recommended)
- **Value**: Your Resend API key
- **Purpose**: Enables email delivery via Resend service
- **Required**: No (but needed for actual email delivery)

## Domain Verification

Resend requires domain verification to prevent abuse. You need to either:

1. **Verify the vendra.com domain** (recommended for production):
   - Add DNS records provided by Resend to your domain's DNS settings
   - This typically involves adding TXT and CNAME records
   - See [RESSEND_SETUP.md](file:///C:/Users/Grizzly/Documents/vendra-main/RESSEND_SETUP.md) for detailed instructions

2. **Use a verified sender email** (easier for testing):
   - Add `reports@vendra.com` as an authorized sender in your Resend dashboard
   - Verify this email address through the verification email Resend will send

## Setting Environment Variables in Supabase

1. Go to your Supabase project dashboard
2. Navigate to Settings > Configuration > Environment Variables
3. Add the following variables:

```
ADMIN_EMAIL=solutionsvendra@gmail.com
RESEND_API_KEY=your-resend-api-key-here  # Optional but recommended
```

## How the send-report Function Uses These Variables

The function will attempt to deliver reports in this order:
1. Webhook (if `REPORTS_WEBHOOK_URL` is set)
2. Email via Resend (if `RESEND_API_KEY` is set)
3. Console logging (fallback for development)

When `RESEND_API_KEY` is set, the function will send emails to the address specified in `ADMIN_EMAIL`.

## Detailed Resend Setup

For detailed instructions on setting up Resend, including domain verification, please refer to [RESSEND_SETUP.md](file:///C:/Users/Grizzly/Documents/vendra-main/RESSEND_SETUP.md).

## Testing Email Delivery

After setting these variables, you can test the email delivery:

1. Deploy the updated function:
   ```bash
   npx supabase functions deploy send-report
   ```

2. Submit a test report through the application or use the test page at `/test-email`

3. Check solutionsvendra@gmail.com for the received report

## Without Resend API Key

If you don't set up a Resend API key, reports will still be processed by the function but will only be logged to the console. You can view these logs in the Supabase dashboard under Functions > Logs.

## Resend Setup (Recommended)

To get actual email delivery:

1. Sign up for a Resend account at https://resend.com/
2. Create an API key in your Resend dashboard
3. Verify your domain or set up a verified sender email address
4. Add the API key as `RESEND_API_KEY` in your Supabase environment variables
5. Deploy the function again

Note: For Resend to work properly, you must verify solutionsvendra@gmail.com as a sender domain or use a verified sender address through Resend.