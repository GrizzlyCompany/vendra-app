# User Profile Loading Issue Fix

## Problem
When new users register, confirm their email, and log in, their profile page doesn't load and shows the error:
```
Cannot coerce the result to a single JSON object.
```

## Root Cause
The issue occurs due to incomplete synchronization between the `public.users` table and the `public.public_profiles` table. When a new user registers:

1. The `handle_new_user()` trigger should create entries in both tables
2. Sometimes this synchronization fails, leaving users without a public profile
3. The profile page expects exactly one row from the `public_profiles` table using `.single()`
4. When no row exists, Supabase throws the "Cannot coerce the result to a single JSON object" error

## Solution Implemented

### 1. Database Schema Updates
Updated the database schema with improved synchronization:

1. Enhanced the `handle_new_user()` function to ensure public profiles are always created
2. Added better error handling in the `sync_public_profile()` function
3. Created an `ensure_user_public_profile()` function for manual fixes

### 2. Fix Scripts
Created two scripts to resolve the issue:

1. `fix-missing-public-profiles.sql` - SQL script to fix missing public profiles
2. `fix-missing-profiles.js` - JavaScript script for programmatic fixing

## How to Apply the Fix

### Option 1: Run the SQL Script (Recommended)
Execute the `fix-missing-public-profiles.sql` script in your Supabase SQL editor:

```sql
-- This will fix all missing public profiles
-- Run the entire script in your Supabase SQL editor
```

### Option 2: Run the JavaScript Script
Execute the JavaScript script:

```bash
node fix-missing-profiles.js
```

## Prevention for Future Users

The updated `handle_new_user()` function now ensures that:
1. Users are always created in the `public.users` table
2. Public profiles are always created in the `public.public_profiles` table
3. Better error handling prevents silent failures

## Verification

After applying the fix, you can verify it worked by running:

```sql
-- Check that all users have public profiles
SELECT 
  COUNT(*) as total_users,
  (SELECT COUNT(*) FROM public.public_profiles) as total_profiles,
  (SELECT COUNT(*) FROM public.users u LEFT JOIN public.public_profiles pp ON u.id = pp.id WHERE pp.id IS NULL) as users_still_missing_profiles
FROM public.users;
```

All counts should match, with 0 users still missing profiles.