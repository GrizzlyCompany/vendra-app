# Admin Messaging Visibility Fix

## Problem
Users were not receiving or seeing messages from the admin user in their chat window on the `/messages` page. This was caused by two issues:

1. The admin user was assigned the role 'admin' which violates the database constraint that only allows roles: 'comprador', 'vendedor_agente', 'empresa_constructora'
2. The admin user's public profile might not have been properly set up for messaging visibility

## Solution Implemented

### 1. Database Schema Updates
Updated the `supabase/schema.sql` file with:

- Modified the `handle_new_user()` function to ensure the admin user always gets the 'empresa_constructora' role
- Added a one-time function `ensure_admin_user()` to fix existing admin user issues

### 2. Fix Scripts
Created two scripts to resolve the issue:

1. `fix-admin-user-messaging.sql` - SQL script to fix the admin user's role and public profile
2. `test-admin-messaging.js` - JavaScript test script to verify the fix works

## How to Apply the Fix

### Option 1: Run the SQL Script (Recommended)
Execute the `fix-admin-user-messaging.sql` script in your Supabase SQL editor:

```sql
-- This will fix the admin user's role and public profile
-- Run the entire script in your Supabase SQL editor
```

### Option 2: Re-deploy the Schema
If you prefer to re-deploy the entire schema:

```bash
supabase db push
```

## Verification

After applying the fix, you can verify it worked by:

1. Checking that the admin user has the correct role:
   ```sql
   SELECT id, email, name, role FROM public.users WHERE email = 'admin@vendra.com';
   ```

2. Checking that the admin user has a public profile:
   ```sql
   SELECT id, name, email, role FROM public.public_profiles WHERE email = 'admin@vendra.com';
   ```

3. Running the test script:
   ```bash
   node test-admin-messaging.js
   ```

## Why This Fixes the Issue

1. **Role Constraint Compliance**: The admin user now has a valid role ('empresa_constructora') that complies with the database constraint
2. **Messaging Visibility**: The admin user now has a proper public profile, which is required for users to see the admin in their conversation list
3. **Future Prevention**: The updated `handle_new_user()` function ensures that any new admin user will automatically get the correct role

## Additional Notes

- The messaging system was already working correctly for the admin (admin could see messages)
- The issue was that regular users couldn't see messages from the admin in their chat interface
- This was due to the missing or incomplete public profile for the admin user
- The fix ensures both proper role assignment and public profile visibility