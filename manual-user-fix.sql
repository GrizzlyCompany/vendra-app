-- Function to manually fix a specific user by ID
-- Usage: SELECT fix_user_by_id('USER_ID_HERE');

CREATE OR REPLACE FUNCTION fix_user_by_id(target_user_id uuid)
RETURNS TABLE(status text, message text) AS $$
BEGIN
  -- Check if user exists in auth.users
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = target_user_id) THEN
    RETURN QUERY SELECT 'ERROR', 'User not found in auth.users';
    RETURN;
  END IF;
  
  -- Insert into public.users if missing
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = target_user_id) THEN
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
    ON CONFLICT (id) DO NOTHING;
    
    IF FOUND THEN
      RETURN QUERY SELECT 'SUCCESS', 'User added to public.users';
    ELSE
      RETURN QUERY SELECT 'WARNING', 'Failed to add user to public.users';
    END IF;
  ELSE
    RETURN QUERY SELECT 'INFO', 'User already exists in public.users';
  END IF;
  
  -- Insert into public.public_profiles if missing
  IF NOT EXISTS (SELECT 1 FROM public.public_profiles WHERE id = target_user_id) THEN
    INSERT INTO public.public_profiles (id, name, email, role)
    SELECT 
      pu.id,
      pu.name,
      pu.email,
      pu.role
    FROM public.users pu
    WHERE pu.id = target_user_id
    ON CONFLICT (id) DO NOTHING;
    
    IF FOUND THEN
      RETURN QUERY SELECT 'SUCCESS', 'User added to public.public_profiles';
    ELSE
      RETURN QUERY SELECT 'WARNING', 'Failed to add user to public.public_profiles';
    END IF;
  ELSE
    RETURN QUERY SELECT 'INFO', 'User already exists in public.public_profiles';
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Example usage:
-- SELECT fix_user_by_id('91a1add6-b082-4d78-97a8-ff1f096310d7');