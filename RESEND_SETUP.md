# Resend Email Setup for Vendra

This document explains how to configure Resend to send emails from the reports page.

## Prerequisites

1. Create a Resend account at [resend.com](https://resend.com)
2. Verify your domain (recommended) or use the provided @resend.dev domain
3. Get your API key from the Resend dashboard

## Setup Instructions

### 1. Set Environment Variables in Supabase

You need to set the following environment variables in your Supabase project:

1. Go to your Supabase project dashboard
2. Navigate to Settings > Configuration > Environment Variables
3. Add the following variables:

```
RESEND_API_KEY=your_resend_api_key_here
ADMIN_EMAIL=your_admin_email@gmail.com
```

To set these via CLI:
```bash
supabase secrets set RESEND_API_KEY=your_resend_api_key_here
supabase secrets set ADMIN_EMAIL=your_admin_email@gmail.com
```

### 2. Deploy the Supabase Function

Deploy the send-report function:

```bash
supabase functions deploy send-report
```

### 3. Test the Function

You can test the function locally first:

```bash
supabase functions serve --env-file .env.local
```

Then call it with a test payload:
```bash
curl -X POST http://localhost:54321/functions/v1/send-report \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Report",
    "description": "This is a test report",
    "category": "bug",
    "userEmail": "test@example.com",
    "userName": "Test User",
    "userId": "user-123"
  }'
```

### 4. Configure Domain (Optional but Recommended)

To avoid emails going to spam:
1. Add your domain in the Resend dashboard
2. Configure the DNS records as instructed
3. Update the `from` address in the function to use your verified domain

## Troubleshooting

### Common Issues

1. **Emails going to spam**: Use a verified domain
2. **Function not found**: Make sure you deployed the function
3. **Authentication errors**: Check that your API key is correct
4. **Environment variables not set**: Verify the variables are set in Supabase

### Checking Function Logs

To debug issues with the function:

```bash
supabase functions logs send-report
```

## Security Considerations

1. Never commit API keys to version control
2. Use environment variables for sensitive data
3. Validate all input in the function
4. Consider rate limiting for production use

## Customization

You can customize the email template by modifying the HTML in the `supabase/functions/send-report/index.ts` file.

The email will be sent to the address specified in the `ADMIN_EMAIL` environment variable.