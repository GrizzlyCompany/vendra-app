# Email Functions Explanation

This document explains the two email functions in your Vendra project.

## 1. send-report Function

**Location**: `supabase/functions/send-report/`
**Status**: Local development, needs deployment

This is the function we've been working on. It has multiple delivery methods:
1. Webhook integration (if `REPORTS_WEBHOOK_URL` is set)
2. Email via Resend (if `RESEND_API_KEY` is set)
3. Console logging (fallback)

### To deploy this function:
```bash
supabase functions deploy send-report
```

### Required environment variables:
- `RESEND_API_KEY`: Your Resend API key
- `ADMIN_EMAIL`: The email address where reports should be sent
- `REPORTS_WEBHOOK_URL`: (Optional) Webhook URL for report delivery

## 2. resend-email Function

**Location**: Deployed at `https://vvuvuibcmvqxtvdadwne.supabase.co/functions/v1/resend-email`
**Status**: Already deployed to your Supabase project

This function appears to already exist in your Supabase project but is not in your local codebase. It's likely an older version or a different implementation.

## Current Implementation in Reports Page

The reports page (`src/app/reports/page.tsx`) now tries both functions as a fallback mechanism:

1. First attempts to use the `send-report` function
2. If that fails, falls back to the `resend-email` function

This ensures that reports can still be sent even if one of the functions isn't properly configured.

## Recommendations

1. **Check what's deployed**: 
   - Go to your Supabase dashboard
   - Navigate to Edge Functions
   - See what functions are currently deployed

2. **If resend-email is working**:
   - Download the source code for this function to your local project
   - Use it as the basis for future development

3. **If send-report is preferred**:
   - Deploy it to replace resend-email
   - Update any references to use send-report instead

## Testing Functions

You can test both functions using the test page at `/test-email` which will show you which one is working correctly.

## Environment Variables Setup

To set up the environment variables in Supabase:

```bash
# If you have Supabase CLI:
supabase secrets set RESEND_API_KEY=your_resend_api_key_here
supabase secrets set ADMIN_EMAIL=your_admin_email@gmail.com

# If you don't have Supabase CLI:
# 1. Go to your Supabase project dashboard
# 2. Settings > Configuration > Environment Variables
# 3. Add the variables manually
```