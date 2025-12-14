-- Emergency function to fix any user profile issue
-- Usage: SELECT emergency_fix_user_profile('USER_ID_HERE');

CREATE OR REPLACE FUNCTION emergency_fix_user_profile(target_user_id uuid)
RETURNS TABLE(status text, message text) AS $$
BEGIN
  -- Check if user exists in auth.users
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = target_user_id) THEN
    RETURN QUERY SELECT 'ERROR', 'User not found in auth.users';
    RETURN;
  END IF;
  
  -- Fix in public.users
  INSERT INTO public.users (id, email, name, role, subscription_active)
  SELECT 
    au.id,
    au.email,
    COALESCE(
      NULLIF(trim(au.raw_user_meta_data->>'name'), ''),
      split_part(COALESCE(au.email, 'user@example.com'), '@', 1)
    ) as name,
    CASE
      WHEN au.email = 'admin@vendra.com' THEN 'empresa_constructora'
      WHEN au.raw_user_meta_data->>'role' IN ('comprador', 'vendedor_agente', 'empresa_constructora')
      THEN au.raw_user_meta_data->>'role'
      ELSE 'comprador'
    END as role,
    false as subscription_active
  FROM auth.users au
  WHERE au.id = target_user_id
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    name = EXCLUDED.name,
    role = EXCLUDED.role,
    updated_at = now();
  
  -- Fix in public.public_profiles
  INSERT INTO public.public_profiles (id, name, email, role)
  SELECT 
    pu.id,
    pu.name,
    pu.email,
    pu.role
  FROM public.users pu
  WHERE pu.id = target_user_id
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    email = EXCLUDED.email,
    role = EXCLUDED.role,
    updated_at = now();
  
  RETURN QUERY SELECT 'SUCCESS', 'User profile fixed successfully';
END;
$$ LANGUAGE plpgsql;