# Admin User Setup Guide

## Overview
This guide explains how to properly set up the admin user for the Vendra platform so that reports can be sent to the admin via the messaging system.

## Steps to Set Up Admin User

### 1. Create Admin User in Supabase Auth

1. Go to your Supabase project dashboard
2. Navigate to **Authentication > Users**
3. Click **"Add user"**
4. Enter the following details:
   - **Email**: `admin@vendra.com`
   - **Password**: Choose a secure password
5. Click **"Add user"**

### 2. Add Admin User to Public Users Table

Run the following SQL in the Supabase SQL editor:

```sql
INSERT INTO public.users (id, email, name, role)
SELECT id, 'admin@vendra.com', 'Administrator', 'comprador'
FROM auth.users 
WHERE email = 'admin@vendra.com'
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  name = EXCLUDED.name,
  role = 'comprador';
```

### 3. Set ADMIN_EMAIL Environment Variable (Optional)

If you want to use a different admin email address:

1. Go to your Supabase project dashboard
2. Navigate to **Settings > Configuration > Secrets**
3. Add a new secret:
   - **Name**: `ADMIN_EMAIL`
   - **Value**: Your desired admin email address
4. Click **"Add secret"**

### 4. Verify Admin User Setup

You can verify the admin user is set up correctly by running the check script:

```bash
node check-and-create-admin.js
```

## Troubleshooting

### If you get "Admin user not found" error:

1. Make sure you've completed both steps above (Auth user and public.users entry)
2. Check that the email address matches exactly (`admin@vendra.com`)
3. Verify the user exists in both `auth.users` and `public.users` tables

### If you want to use a different admin email:

1. Follow step 3 above to set the `ADMIN_EMAIL` environment variable
2. Make sure that user exists in both `auth.users` and `public.users` tables

## Fallback Mechanism

The system includes a fallback mechanism that will look for any user with an email ending in `@admin.com` or `@vendra.com` if the primary admin user is not found. This provides additional flexibility in case you want to use a different admin email address.