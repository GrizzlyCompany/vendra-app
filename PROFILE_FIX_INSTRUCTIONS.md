# Profile Loading Issue Fix Instructions

## Problem
Users are experiencing the error "Cannot coerce the result to a single JSON object" when trying to access their profile after registration and email confirmation.

## Root Cause
This error typically occurs when:
1. A database query expects exactly one result but returns zero or multiple results
2. There are data integrity issues with user profiles
3. The synchronization between `auth.users`, `public.users`, and `public.public_profiles` tables is not working correctly

## Solution

### Step 1: Run the Diagnostic Script
First, run the diagnostic script to identify the exact cause:

1. Open your Supabase project dashboard
2. Go to the SQL Editor
3. Copy and paste the contents of `debug-profile-error.sql`
4. Run the script
5. Review the results to identify any data integrity issues

### Step 2: Apply the Complete Fix
Run the complete fix script to resolve all potential issues:

1. In the Supabase SQL Editor, copy and paste the contents of `complete-profile-fix.sql`
2. Run the entire script
3. This will:
   - Ensure all tables have the correct structure
   - Fix any data integrity issues
   - Recreate the trigger functions with improved error handling
   - Ensure all existing users have proper profiles

### Step 3: Fix Specific Users (If Needed)
If you have specific users that are still missing, you can use the targeted fixes:

1. For the specific users identified in your diagnostic output, run `fix-specific-users.sql`
2. For an automated fix of all missing users, run `auto-fix-missing-users.sql`
3. For manual fixing of individual users, use the function in `manual-user-fix.sql`

### Step 4: Update the Frontend Code
The frontend code in `src/app/profile/page.tsx` has already been updated to use `maybeSingle()` instead of `single()` and includes better error handling.

### Step 5: Test the Fix
1. Create a new test user through the signup process
2. Confirm the email
3. Log in and navigate to the profile page
4. Verify that the profile loads correctly

## Additional Scripts

### diagnose-profile-issue.sql
This script provides detailed information about the current state of user data and can help identify specific issues.

### test-profile-access.js
This Node.js script can be used to programmatically test profile access and identify issues.

## Manual Fix Function
If you encounter issues with specific users, you can manually fix a user's profile using the `fix_user_profile` function:

```sql
SELECT public.fix_user_profile('USER_ID_HERE');
```

Or use the more detailed `fix_user_by_id` function:

```sql
SELECT fix_user_by_id('USER_ID_HERE');
```

## Prevention
The updated trigger functions will prevent this issue from occurring with new users by:
1. Ensuring proper error handling
2. Creating fallback profiles when needed
3. Maintaining data integrity between tables

## Verification
After applying the fix, run the verification query at the end of the complete fix script to ensure all users have proper profiles:

```sql
SELECT 
  COUNT(*) as total_auth_users,
  (SELECT COUNT(*) FROM public.users) as total_public_users,
  (SELECT COUNT(*) FROM public.public_profiles) as total_public_profiles,
  (SELECT COUNT(*) FROM auth.users au LEFT JOIN public.users pu ON au.id = pu.id WHERE pu.id IS NULL) as auth_users_missing_public_users,
  (SELECT COUNT(*) FROM public.users pu LEFT JOIN public.public_profiles pp ON pu.id = pp.id WHERE pp.id IS NULL) as public_users_missing_profiles
FROM auth.users;
```

All counts should match, with 0 users missing profiles.