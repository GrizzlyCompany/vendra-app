-- Comprehensive fix for user profile synchronization issues

-- 1. First, let's ensure the handle_new_user function is correctly defined
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_name text;
  user_role text;
BEGIN
  -- Safely extract metadata with defaults
  user_name := COALESCE(
    NULLIF(trim(NEW.raw_user_meta_data->>'name'), ''),
    split_part(COALESCE(NEW.email, 'user@example.com'), '@', 1)
  );

  -- Validate and set role with fallback to default
  -- Special handling for admin user to ensure it gets the correct role
  IF NEW.email = 'admin@vendra.com' THEN
    user_role := 'empresa_constructora';
  ELSE
    user_role := CASE
      WHEN NEW.raw_user_meta_data->>'role' IN ('comprador', 'vendedor_agente', 'empresa_constructora')
      THEN NEW.raw_user_meta_data->>'role'
      ELSE 'comprador'
    END;
  END IF;

  -- Insert or update user in public.users table
  INSERT INTO public.users (
    id,
    email,
    name,
    role,
    subscription_active,
    phone,
    bio,
    rnc,
    website,
    headquarters_address,
    operational_areas,
    contact_person,
    primary_phone,
    secondary_phone,
    legal_documents,
    facebook_url,
    instagram_url,
    linkedin_url,
    terms_accepted
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    user_name,
    user_role,
    false,
    COALESCE(NEW.raw_user_meta_data->>'phone', null),
    null, -- bio
    null, -- rnc
    null, -- website
    null, -- headquarters_address
    null, -- operational_areas
    null, -- contact_person
    null, -- primary_phone
    null, -- secondary_phone
    '{}', -- legal_documents (empty array)
    null, -- facebook_url
    null, -- instagram_url
    null, -- linkedin_url
    false -- terms_accepted
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    name = EXCLUDED.name,
    role = CASE
      WHEN users.role = 'empresa_constructora' THEN users.role -- Preserve empresa_constructora
      ELSE EXCLUDED.role
    END,
    phone = COALESCE(EXCLUDED.phone, users.phone), -- Preserve existing if not null
    updated_at = now()
  WHERE users.id = EXCLUDED.id;

  -- Ensure the user has a public profile
  INSERT INTO public.public_profiles (id, name, email, bio, avatar_url, role)
  VALUES (
    NEW.id,
    user_name,
    COALESCE(NEW.email, ''),
    null, -- bio
    null, -- avatar_url
    user_role
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    email = EXCLUDED.email,
    role = EXCLUDED.role,
    updated_at = now();

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the auth transaction
    RAISE WARNING 'Error in handle_new_user trigger for user %: %', NEW.id, SQLERRM;
    -- Try to create at least a minimal profile as a fallback
    BEGIN
      INSERT INTO public.public_profiles (id, name, email, role)
      VALUES (
        NEW.id,
        split_part(COALESCE(NEW.email, 'user@example.com'), '@', 1),
        COALESCE(NEW.email, ''),
        'comprador'
      )
      ON CONFLICT (id) DO NOTHING;
    EXCEPTION
      WHEN OTHERS THEN
        -- If even this fails, we've done our best
        RAISE WARNING 'Failed to create fallback profile for user %: %', NEW.id, SQLERRM;
    END;
    RETURN NEW;
END;
$$;

-- 2. Recreate the trigger to ensure it's properly attached
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. Ensure all existing users have profiles
INSERT INTO public.public_profiles (id, name, email, bio, avatar_url, role)
SELECT u.id, u.name, u.email, u.bio, u.avatar_url, u.role
FROM public.users u
LEFT JOIN public.public_profiles pp ON u.id = pp.id
WHERE pp.id IS NULL
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  email = EXCLUDED.email,
  bio = EXCLUDED.bio,
  avatar_url = EXCLUDED.avatar_url,
  role = EXCLUDED.role,
  updated_at = now();

-- 4. Verify the fix
SELECT 
  COUNT(*) as total_auth_users,
  (SELECT COUNT(*) FROM public.users) as total_public_users,
  (SELECT COUNT(*) FROM public.public_profiles) as total_public_profiles,
  (SELECT COUNT(*) FROM auth.users au LEFT JOIN public.users pu ON au.id = pu.id WHERE pu.id IS NULL) as auth_users_missing_public_users,
  (SELECT COUNT(*) FROM public.users pu LEFT JOIN public.public_profiles pp ON pu.id = pp.id WHERE pp.id IS NULL) as public_users_missing_profiles
FROM auth.users;