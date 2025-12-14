# Resend Quick Start Guide for Vendra

This guide provides quick steps to get Resend working with your Vendra application.

## Step 1: Get Resend API Key

1. Go to https://resend.com
2. Sign up for a free account
3. Navigate to API Keys section
4. Create a new API key
5. Copy the API key (you'll need it in Step 3)

## Step 2: Verify Your Domain (Optional but Recommended)

1. In your Resend dashboard, go to Domains
2. Add your domain (e.g., yourdomain.com)
3. Follow the DNS verification steps
4. Wait for domain verification to complete

## Step 3: Configure Supabase Environment Variables

Set these environment variables in your Supabase project:

```bash
# If you have Supabase CLI installed:
supabase secrets set RESEND_API_KEY=your_resend_api_key_here
supabase secrets set ADMIN_EMAIL=your_gmail_address@gmail.com

# If you don't have Supabase CLI:
# 1. Go to your Supabase project dashboard
# 2. Settings > Configuration > Environment Variables
# 3. Add RESEND_API_KEY with your API key
# 4. Add ADMIN_EMAIL with your Gmail address
```

## Step 4: Deploy the Function

```bash
# If you have Supabase CLI installed:
supabase functions deploy send-report

# If you don't have Supabase CLI:
# 1. Go to your Supabase project dashboard
# 2. Edge Functions > send-report
# 3. Click "Deploy"
```

## Step 5: Test the Setup

1. Go to your Vendra application
2. Navigate to the Reports page (/reports)
3. Submit a test report
4. Check your Gmail inbox for the report

## Troubleshooting

### No Email Received?

1. Check Supabase function logs:
   ```bash
   supabase functions logs send-report
   ```

2. Verify environment variables are set correctly

3. Check that your domain is verified in Resend (if using a custom domain)

### Function Not Found?

1. Make sure you deployed the function:
   ```bash
   supabase functions deploy send-report
   ```

2. Check that the function name matches exactly

### Authentication Errors?

1. Verify your RESEND_API_KEY is correct
2. Check that your Supabase project is properly configured

## Need Help?

If you're still having issues:

1. Check the detailed setup guide: `RESEND_SETUP.md`
2. Check the deployment guide: `DEPLOYMENT_GUIDE.md`
3. View function logs for detailed error messages