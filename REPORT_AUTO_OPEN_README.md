# Automatic Case Opening for Reports in Admin Panel

## Overview
This implementation ensures that when a user creates a new report, their case automatically opens in the messages section of the admin panel with the correct status.

## Changes Made

### 1. Updated send-report Function
- Modified `supabase/functions/send-report/index.ts` to ensure new reports are properly classified:
  - Set `conversation_type` to `'user_to_admin'`
  - Set `case_status` to `'open'` to ensure visibility in the admin messages section

### 2. Enhanced admin-get-messages Function
- Updated `supabase/functions/admin-get-messages/index.ts` to:
  - Automatically correct any misclassified messages containing "Nuevo Reporte"
  - Ensure all user_to_admin conversations have a proper case_status
  - Maintain proper sorting and display of conversations

### 3. Database Migration
- Created `supabase/migrations/20251010_auto_open_reports.sql` with:
  - Fixes for existing messages with "Nuevo Reporte" content
  - Automatic trigger to ensure new reports are properly classified
  - Indexes for efficient querying of admin messages
  - Admin user setup verification

### 4. UI Components
- Enhanced `src/components/admin/MessagesTable.tsx` to:
  - Properly display all conversations including new reports
  - Maintain consistent filtering and sorting
  - Provide better error handling and user feedback

## How It Works

1. When a user submits a report via the send-report function:
   - The message is inserted with `conversation_type = 'user_to_admin'`
   - The message is inserted with `case_status = 'open'`

2. The database trigger automatically ensures:
   - Any message containing "Nuevo Reporte" is classified correctly
   - All user_to_admin conversations have a proper case_status

3. The admin-get-messages function:
   - Retrieves all user_to_admin conversations
   - Ensures proper case status for all messages
   - Sorts conversations by most recent activity

4. The admin panel displays:
   - All open cases including new reports
   - Proper status indicators (open/closed)
   - Unread message counts

## Testing

To verify the implementation works correctly:

1. Run the test script:
   ```bash
   node test-report-auto-open.js
   ```

2. Or manually test by:
   - Creating a new report as a regular user
   - Logging in as admin and navigating to the messages section
   - Verifying the new report appears as an open case

## Verification

After implementation, new reports should:
- Automatically appear in the admin messages section
- Be marked with "Abierto" status
- Be visible in the default "Todos los casos" filter
- Show up in searches for the user's name or report content

## Troubleshooting

If new reports don't appear in the admin panel:

1. Check that the database migration was applied:
   ```sql
   SELECT * FROM public.messages WHERE content ILIKE '%Nuevo Reporte%' LIMIT 5;
   ```

2. Verify the trigger is working:
   ```sql
   SELECT * FROM pg_trigger WHERE tgname = 'auto_set_report_message_fields_trigger';
   ```

3. Check the admin-get-messages function logs in Supabase for errors

4. Ensure the admin user exists with proper role:
   ```sql
   SELECT id, email, role FROM public.users WHERE email = 'admin@vendra.com';
   ```