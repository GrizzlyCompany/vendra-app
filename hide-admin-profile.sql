-- Drop the current overly permissive policy
DROP POLICY IF EXISTS "public_profiles_select_public" ON public.public_profiles;

-- Create a new, stricter policy
CREATE POLICY "public_profiles_select_public" 
ON public.public_profiles 
FOR SELECT 
USING (
  -- 1. Public can see any profile that is NOT an admin
  (role IS DISTINCT FROM 'admin') 
  OR 
  -- 2. Users can always see their own profile (even if they are admin)
  (auth.uid() = id) 
  OR 
  -- 3. The main admin can see everyone
  ((auth.jwt() ->> 'email') = 'admin@vendra.com')
);
