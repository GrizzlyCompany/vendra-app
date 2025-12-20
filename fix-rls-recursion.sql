-- Definitive fix for "infinite recursion detected in policy for relation 'users'"
-- This script resets RLS policies on the users table to avoid circular dependencies.

-- 1. Disable and Re-enable RLS to ensure a clean state (optional but safer)
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 2. Drop all existing policies on the users table
DROP POLICY IF EXISTS "users_select_own" ON public.users;
DROP POLICY IF EXISTS "users_insert_own" ON public.users;
DROP POLICY IF EXISTS "users_update_own" ON public.users;
DROP POLICY IF EXISTS "users_admin_all" ON public.users;
DROP POLICY IF EXISTS "admin_select_all" ON public.users;
DROP POLICY IF EXISTS "allow_admin_to_manage_users" ON public.users;

-- 3. Create clean, non-recursive policies

-- Users can see their own record
CREATE POLICY "users_select_own" 
ON public.users 
FOR SELECT 
TO authenticated 
USING (id = auth.uid());

-- Users can insert their own record (required for signup handle_new_user trigger)
CREATE POLICY "users_insert_own" 
ON public.users 
FOR INSERT 
TO authenticated 
WITH CHECK (id = auth.uid());

-- Users can update their own record
CREATE POLICY "users_update_own" 
ON public.users 
FOR UPDATE 
TO authenticated 
USING (id = auth.uid()) 
WITH CHECK (id = auth.uid());

-- 4. Special Admin Policy (The Safe Way)
-- We identify the admin by the email in the JWT session, NOT by querying the users table.
-- This prevents the infinite recursion error.
CREATE POLICY "users_admin_select" 
ON public.users 
FOR SELECT 
TO authenticated 
USING (
  (auth.jwt() ->> 'email') = 'admin@vendra.com'
);

-- Also allow admin to update any user (e.g. for role management)
CREATE POLICY "users_admin_update" 
ON public.users 
FOR UPDATE 
TO authenticated 
USING (
  (auth.jwt() ->> 'email') = 'admin@vendra.com'
)
WITH CHECK (
  (auth.jwt() ->> 'email') = 'admin@vendra.com'
);

-- 5. Verification
SELECT policyname, cmd, qual, with_check 
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'users';
