-- DEFINITIVE FIX FOR USER PROFILE LOADING ISSUE

-- 1. Ensure table structures are correct
CREATE TABLE IF NOT EXISTS public.users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  name text,
  bio text,
  role text DEFAULT 'comprador',
  avatar_url text,
  phone text,
  subscription_active boolean DEFAULT false,
  rating numeric,
  reviews_count integer DEFAULT 0,
  inserted_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT users_role_check CHECK (role IN ('comprador','vendedor_agente','empresa_constructora'))
);

CREATE TABLE IF NOT EXISTS public.public_profiles (
  id uuid PRIMARY KEY,
  name text,
  email text,
  bio text,
  avatar_url text,
  role text,
  banner_url text,
  inserted_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. Fix data integrity issues
-- Remove duplicates (keeping most recent)
DELETE FROM public.users
WHERE id IN (
  SELECT id
  FROM (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY id ORDER BY updated_at DESC) as row_num
    FROM public.users
  ) t
  WHERE row_num > 1
);

DELETE FROM public.public_profiles
WHERE id IN (
  SELECT id
  FROM (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY id ORDER BY updated_at DESC) as row_num
    FROM public.public_profiles
  ) t
  WHERE row_num > 1
);

-- Fix invalid roles
UPDATE public.users
SET role = 'comprador'
WHERE role NOT IN ('comprador', 'vendedor_agente', 'empresa_constructora') OR role IS NULL;

UPDATE public.public_profiles
SET role = 'comprador'
WHERE role NOT IN ('comprador', 'vendedor_agente', 'empresa_constructora') OR role IS NULL;

-- 3. Create robust handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_name text;
  user_role text;
BEGIN
  -- Extract user data with fallbacks
  user_name := COALESCE(
    NULLIF(trim(NEW.raw_user_meta_data->>'name'), ''),
    split_part(COALESCE(NEW.email, 'user@example.com'), '@', 1)
  );

  -- Set role with proper fallback
  IF NEW.email = 'admin@vendra.com' THEN
    user_role := 'empresa_constructora';
  ELSE
    user_role := CASE
      WHEN NEW.raw_user_meta_data->>'role' IN ('comprador', 'vendedor_agente', 'empresa_constructora')
      THEN NEW.raw_user_meta_data->>'role'
      ELSE 'comprador'
    END;
  END IF;

  -- Insert or update user in public.users
  INSERT INTO public.users (
    id, email, name, role, subscription_active, phone, bio, rnc, website,
    headquarters_address, operational_areas, contact_person, primary_phone,
    secondary_phone, legal_documents, facebook_url, instagram_url, linkedin_url, terms_accepted
  )
  VALUES (
    NEW.id, COALESCE(NEW.email, ''), user_name, user_role, false,
    COALESCE(NEW.raw_user_meta_data->>'phone', null), null, null, null, null, null, null, null, null,
    '{}', null, null, null, false
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    name = EXCLUDED.name,
    role = CASE
      WHEN users.role = 'empresa_constructora' THEN users.role
      ELSE EXCLUDED.role
    END,
    phone = COALESCE(EXCLUDED.phone, users.phone),
    updated_at = now()
  WHERE users.id = EXCLUDED.id;

  -- Ensure public profile exists
  INSERT INTO public.public_profiles (id, name, email, bio, avatar_url, role)
  VALUES (NEW.id, user_name, COALESCE(NEW.email, ''), null, null, user_role)
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    email = EXCLUDED.email,
    role = EXCLUDED.role,
    updated_at = now();

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail auth transaction
    RAISE WARNING 'Error in handle_new_user for user %: %', NEW.id, SQLERRM;
    -- Create minimal fallback profile
    BEGIN
      INSERT INTO public.public_profiles (id, name, email, role)
      VALUES (NEW.id, split_part(COALESCE(NEW.email, 'user@example.com'), '@', 1), COALESCE(NEW.email, ''), 'comprador')
      ON CONFLICT (id) DO NOTHING;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE WARNING 'Failed to create fallback profile for user %: %', NEW.id, SQLERRM;
    END;
    RETURN NEW;
END;
$$;

-- 4. Recreate trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. Fix existing missing users (like the ones in your diagnostic)
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
LEFT JOIN public.users pu ON au.id = pu.id
WHERE pu.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- 6. Ensure all users have public profiles
INSERT INTO public.public_profiles (id, name, email, role)
SELECT 
  pu.id,
  pu.name,
  pu.email,
  pu.role
FROM public.users pu
LEFT JOIN public.public_profiles pp ON pu.id = pp.id
WHERE pp.id IS NULL
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  email = EXCLUDED.email,
  role = EXCLUDED.role,
  updated_at = now();

-- 7. Verification query
SELECT 
  COUNT(*) as total_auth_users,
  (SELECT COUNT(*) FROM public.users) as total_public_users,
  (SELECT COUNT(*) FROM public.public_profiles) as total_public_profiles,
  (SELECT COUNT(*) FROM auth.users au LEFT JOIN public.users pu ON au.id = pu.id WHERE pu.id IS NULL) as auth_users_missing_public_users,
  (SELECT COUNT(*) FROM public.users pu LEFT JOIN public.public_profiles pp ON pu.id = pp.id WHERE pp.id IS NULL) as public_users_missing_profiles
FROM auth.users;