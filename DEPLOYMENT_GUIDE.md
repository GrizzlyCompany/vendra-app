# Vendra Application Deployment Guide

This guide explains how to deploy and configure the Vendra application, including the reports feature.

## Prerequisites

1. Install Supabase CLI:
   ```bash
   npm install -g supabase
   ```

2. Login to Supabase:
   ```bash
   supabase login
   ```

## Deploying the Application

### 1. Link your Supabase project

```bash
supabase link --project-ref YOUR_PROJECT_ID
```

### 2. Deploy the database schema

```bash
supabase db push
```

### 3. Deploy the Edge Function

```bash
supabase functions deploy send-report
```

## Configuring the Reports Feature

### Option 1: Using Resend (Recommended)

1. Create a Resend account at https://resend.com
2. Get your API key from the Resend dashboard
3. Set the environment variables in Supabase:

```bash
supabase secrets set RESEND_API_KEY=your_resend_api_key_here
supabase secrets set ADMIN_EMAIL=your_admin_email@gmail.com
```

### Option 2: Using a Webhook

If you prefer to use a webhook service (like Zapier, Make, or a custom webhook):

1. Set up your webhook endpoint
2. Set the environment variable in Supabase:

```bash
supabase secrets set REPORTS_WEBHOOK_URL=https://your-webhook-url.com/reports
```

### Option 3: Logging Only (Development)

If you just want to log reports during development, no additional configuration is needed. Reports will be logged to the function console.

## Testing the Function

### Local Testing

1. Serve the function locally:
   ```bash
   supabase functions serve
   ```

2. Test with curl:
   ```bash
   curl -X POST http://localhost:54321/functions/v1/send-report \
     -H "Authorization: Bearer YOUR_SUPABASE_ANON_KEY" \
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

### Production Testing

After deployment, test the function with:

```bash
supabase functions invoke send-report --data '{
  "title": "Test Report",
  "description": "This is a test report",
  "category": "bug",
  "userEmail": "test@example.com",
  "userName": "Test User",
  "userId": "user-123"
}'
```

## Monitoring and Debugging

### View Function Logs

```bash
supabase functions logs send-report
```

### Common Issues

1. **Function not found**: Make sure you deployed the function
2. **Authentication errors**: Check your Supabase keys
3. **Environment variables not set**: Verify variables are set in Supabase
4. **Network errors**: Check firewall and network settings

## Security Considerations

1. Never commit API keys to version control
2. Use environment variables for sensitive data
3. Validate all input in functions
4. Monitor function logs for suspicious activity

## Updating the Function

To update the function after making changes:

```bash
supabase functions deploy send-report
```