# Resend Email Setup Guide

## Overview
To enable actual email delivery for the report submission feature, you need to set up Resend and configure the environment variables in your Supabase project.

## Step 1: Sign up for Resend

1. Go to [https://resend.com/](https://resend.com/)
2. Click "Sign up" and create an account
3. Verify your email address

## Step 2: Create an API Key

1. After logging in, go to the API Keys section
2. Click "Create API Key"
3. Give it a name (e.g., "Vendra Reports")
4. Copy the generated API key - you'll need this for the next step

## Step 3: Verify Your Domain

Resend requires domain verification to prevent abuse. You need to verify the `vendra.com` domain:

1. Go to the Domains section in your Resend dashboard
2. Click "Add Domain"
3. Enter `vendra.com` as your domain
4. Follow the DNS verification instructions:
   - Add the provided DNS records to your domain's DNS settings
   - This typically involves adding TXT and CNAME records
5. Wait for DNS propagation (this can take a few minutes to several hours)
6. Click "Verify" in the Resend dashboard

Alternatively, for testing purposes, you can use a single sender email address:
1. In the Resend dashboard, go to the "Senders" section
2. Add `reports@vendra.com` as an authorized sender
3. Verify this email address through the verification email Resend will send

## Step 4: Configure Supabase Environment Variables

1. Go to your Supabase project dashboard
2. Navigate to Settings > Configuration > Environment Variables
3. Add the following variables:

```
ADMIN_EMAIL=solutionsvendra@gmail.com
RESEND_API_KEY=your-resend-api-key-here
```

Replace `your-resend-api-key-here` with the API key you generated in Step 2.

## Step 5: Deploy the Function

After setting the environment variables, redeploy the function:

```bash
npx supabase functions deploy send-report
```

## Step 6: Test the Setup

1. Submit a test report through the application or use the test page at `/test-email`
2. Check solutionsvendra@gmail.com for the received report

## Troubleshooting

If you don't receive emails:

1. Check the Supabase function logs:
   - Go to your Supabase project dashboard
   - Navigate to Functions > Logs
   - Look for any error messages

2. Verify your environment variables are set correctly:
   - Make sure there are no typos in the variable names
   - Ensure the API key is correct

3. Check that your domain or sender email is properly verified in Resend:
   - In your Resend dashboard, go to Domains or Senders
   - Make sure the status shows as "Verified"

## How It Works

Once configured, the send-report function will:
1. Use the RESEND_API_KEY to authenticate with Resend
2. Send emails to the address specified in ADMIN_EMAIL
3. Return a success message when emails are sent successfully

The email will include:
- User information (name and email)
- Report category
- Report title
- Full report description