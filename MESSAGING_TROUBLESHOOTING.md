# Messaging System Troubleshooting Guide

## Overview
This guide helps diagnose and fix common issues with the messaging system, particularly when users cannot see messages from the admin.

## Common Issues and Solutions

### 1. Users Cannot See Messages from Admin

#### Symptoms:
- Admin sends a message but user doesn't see it in their conversation list
- User cannot respond to admin messages
- Conversation with admin doesn't appear in user's conversation list

#### Diagnosis:
1. Check if admin user exists in `public.users` table
2. Verify admin user has a public profile in `public.public_profiles` table
3. Confirm messages are being created in `public.messages` table
4. Check if user has proper public profile

#### Solutions:
1. Run `setup-admin-user.sql` to ensure admin user exists in `public.users`
2. Run `ensure-admin-public-profile.sql` to create admin public profile
3. Verify user has public profile (should be created automatically when they sign up)

### 2. Conversation List Not Showing Admin

#### Symptoms:
- Admin user doesn't appear in user's conversation list
- User cannot start a conversation with admin

#### Diagnosis:
1. Check if admin has a public profile
2. Verify the conversation list query is working correctly
3. Check if there are any messages between user and admin

#### Solutions:
1. Ensure admin has a public profile (run `ensure-admin-public-profile.sql`)
2. Check that the conversation list query includes both sent and received messages
3. Verify RLS policies allow users to see their messages

### 3. Messages Not Appearing in Real-time

#### Symptoms:
- Messages sent by admin don't appear immediately in user's chat
- User has to refresh to see new messages

#### Diagnosis:
1. Check if Supabase Realtime is enabled
2. Verify the subscription is working correctly
3. Check network connectivity

#### Solutions:
1. Ensure Realtime is enabled in Supabase project
2. Verify the channel subscription code in `src/app/messages/page.tsx`
3. Check for any errors in browser console

## Debugging Tools

### 1. Automated Debugging Script
Run the `debug-messaging.js` script to automatically check:
- Admin user existence
- Admin public profile
- Messages involving admin
- User profiles
- Direct message visibility

```bash
node debug-messaging.js
```

### 2. Manual Database Queries

#### Check admin user:
```sql
SELECT id, email, name, role FROM public.users WHERE email = 'admin@vendra.com';
```

#### Check admin public profile:
```sql
SELECT id, name, email, avatar_url FROM public.public_profiles WHERE id = (SELECT id FROM public.users WHERE email = 'admin@vendra.com');
```

#### Check messages involving admin:
```sql
SELECT id, sender_id, recipient_id, content, created_at 
FROM public.messages 
WHERE sender_id = (SELECT id FROM public.users WHERE email = 'admin@vendra.com')
   OR recipient_id = (SELECT id FROM public.users WHERE email = 'admin@vendra.com')
ORDER BY created_at DESC;
```

#### Check conversation list for a specific user:
```sql
-- Replace USER_ID with actual user ID
SELECT 
  CASE 
    WHEN sender_id = 'USER_ID' THEN recipient_id 
    ELSE sender_id 
  END as other_id,
  MAX(created_at) as last_at,
  (SELECT content FROM public.messages m2 WHERE 
    (m2.sender_id = public.messages.sender_id AND m2.recipient_id = public.messages.recipient_id) OR
    (m2.sender_id = public.messages.recipient_id AND m2.recipient_id = public.messages.sender_id)
   ORDER BY created_at DESC LIMIT 1) as last_message
FROM public.messages 
WHERE sender_id = 'USER_ID' OR recipient_id = 'USER_ID'
GROUP BY other_id
ORDER BY last_at DESC;
```

## Testing User Message Visibility

### 1. Automated Test
Run the `test-user-messages.js` script to verify:
- Admin user setup
- User public profiles
- Message sending from admin to user
- Message visibility for user

```bash
node test-user-messages.js
```

### 2. Manual Testing
1. Log in as admin user
2. Navigate to a user's profile
3. Send a message through the messaging system
4. Log out and log in as the user
5. Check if the message appears in the conversation list
6. Open the conversation with admin and verify the message is visible

## RLS Policy Verification

### Messages Table Policies
Ensure these policies exist in the `public.messages` table:

1. **messages_select_participant**: Allows users to read messages where they are sender or recipient
2. **messages_insert_self**: Allows users to insert messages where they are the sender
3. **messages_update_participant**: Allows users to update messages where they are participant
4. **messages_delete_sender**: Allows users to delete messages they sent

Check policies:
```sql
SELECT policyname, tablename, schemaname 
FROM pg_policies 
WHERE tablename = 'messages' AND schemaname = 'public';
```

## Common Fixes

### 1. Ensure Admin User Setup
Run these SQL scripts in order:
1. `setup-admin-user.sql` - Creates admin user in public.users
2. `ensure-admin-public-profile.sql` - Creates admin public profile

### 2. Verify User Profiles
Check that all users have public profiles:
```sql
-- Find users without public profiles
SELECT u.id, u.email, u.name 
FROM public.users u 
LEFT JOIN public.public_profiles p ON u.id = p.id 
WHERE p.id IS NULL;
```

### 3. Check Realtime Subscriptions
In browser console, check if there are any errors with:
```javascript
// Check if Supabase client is properly initialized
console.log(supabase);

// Check if channels are subscribed
console.log(supabase.getChannels());
```

## Prevention

### 1. Regular Maintenance
- Run the debug script periodically to ensure messaging system is working
- Check that new users get public profiles automatically
- Verify admin user still exists and has proper profile

### 2. Monitoring
- Set up alerts for messaging system errors
- Monitor database for missing public profiles
- Check Realtime subscription logs

## Contact Support
If issues persist after following this guide:
1. Run the debug script and save the output
2. Check browser console for errors
3. Verify all SQL scripts have been run
4. Contact development team with detailed information about the issue