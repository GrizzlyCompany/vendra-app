# Fix User Role Issue

This document explains how to fix the issue where a user's role is not properly updated after their seller application has been approved.

## Problem

The user `angelf.delarosa@gmail.com` (ID: `503e1035-8781-4b87-b1fe-46305d8f6842`) has had their seller application approved, but their role is still showing as "comprador" instead of "vendedor_agente". This happens because:

1. The admin function only updates the database role
2. The application prioritizes auth metadata over database values
3. The auth metadata was not updated, causing the mismatch

## Solution

To fix this issue, you need to update both the database role and the auth metadata.

### Step 1: Update Database Role

Run the SQL script `fix-user-role.sql` in your Supabase SQL editor:

```sql
UPDATE users 
SET role = 'vendedor_agente', updated_at = NOW()
WHERE id = '503e1035-8781-4b87-b1fe-46305d8f6842';
```

### Step 2: Update Auth Metadata

You can update the auth metadata using one of these methods:

#### Method 1: Using Supabase Dashboard
1. Go to your Supabase project dashboard
2. Navigate to Authentication > Users
3. Find the user with email `angelf.delarosa@gmail.com`
4. Click on the user to edit their details
5. Update their user metadata to include `"role": "vendedor_agente"`
6. Save the changes

#### Method 2: Using the Node.js Script
1. Install the required dependencies:
   ```bash
   npm install @supabase/supabase-js
   ```

2. Set your Supabase credentials as environment variables:
   ```bash
   export SUPABASE_URL="https://your-project.supabase.co"
   export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
   ```

3. Run the script:
   ```bash
   node fix-user-auth-metadata.js
   ```

## Prevention

The admin function has been updated to automatically update both the database and auth metadata when approving applications. Make sure to deploy the updated function:

```bash
supabase functions deploy admin-update-application
```