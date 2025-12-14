-- Ensure users table exists with proper structure and policies
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
  reviews_count integer,
  inserted_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Create or replace RLS policies
DROP POLICY IF EXISTS "users_select_own" ON public.users;
CREATE POLICY "users_select_own" ON public.users FOR SELECT TO authenticated USING (id = auth.uid());

DROP POLICY IF EXISTS "users_insert_own" ON public.users;
CREATE POLICY "users_insert_own" ON public.users FOR INSERT TO authenticated WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "users_update_own" ON public.users;
CREATE POLICY "users_update_own" ON public.users FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- Ensure role constraint exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_role_check'
  ) THEN
    ALTER TABLE public.users
      ADD CONSTRAINT users_role_check CHECK (role IN ('comprador','vendedor_agente','empresa_constructora'));
  END IF;
END $$;

-- Create updated_at trigger if not exists
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname='trg_users_set_updated_at'
  ) THEN
    CREATE TRIGGER trg_users_set_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

-- Ensure public_profiles table exists
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

-- Enable RLS on public_profiles
ALTER TABLE public.public_profiles ENABLE ROW LEVEL SECURITY;

-- Create or replace RLS policies for public_profiles
DROP POLICY IF EXISTS "public_profiles_select_public" ON public.public_profiles;
CREATE POLICY "public_profiles_select_public" ON public.public_profiles FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "public_profiles_insert_own" ON public.public_profiles;
CREATE POLICY "public_profiles_insert_own" ON public.public_profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "public_profiles_update_own" ON public.public_profiles;
CREATE POLICY "public_profiles_update_own" ON public.public_profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "public_profiles_delete_own" ON public.public_profiles;
CREATE POLICY "public_profiles_delete_own" ON public.public_profiles FOR DELETE TO authenticated USING (id = auth.uid());

-- Create updated_at trigger for public_profiles if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname='trg_public_profiles_set_updated_at'
  ) THEN
    CREATE TRIGGER trg_public_profiles_set_updated_at
    BEFORE UPDATE ON public.public_profiles
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

-- Create function to sync public profiles with users
-- This version includes better error handling and logging
CREATE OR REPLACE FUNCTION public.sync_public_profile()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.public_profiles WHERE id = OLD.id;
    RETURN OLD;
  ELSE
    -- Insert or update the public profile with all user data
    INSERT INTO public.public_profiles (id, name, email, bio, avatar_url, role)
    VALUES (NEW.id, NEW.name, NEW.email, NEW.bio, NEW.avatar_url, NEW.role)
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      email = EXCLUDED.email,
      bio = EXCLUDED.bio,
      avatar_url = EXCLUDED.avatar_url,
      role = EXCLUDED.role,
      updated_at = now();
    RETURN NEW;
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error for debugging
    RAISE WARNING 'sync_public_profile failed for user %: %', NEW.id, SQLERRM;
    -- Still return NEW to not break the trigger chain
    RETURN NEW;
END;
$$;

-- Create triggers to sync users with public_profiles
DROP TRIGGER IF EXISTS trg_users_sync_public_profile_upsert ON public.users;
CREATE TRIGGER trg_users_sync_public_profile_upsert
AFTER INSERT OR UPDATE ON public.users
FOR EACH ROW EXECUTE FUNCTION public.sync_public_profile();

DROP TRIGGER IF EXISTS trg_users_sync_public_profile_delete ON public.users;
CREATE TRIGGER trg_users_sync_public_profile_delete
AFTER DELETE ON public.users
FOR EACH ROW EXECUTE FUNCTION public.sync_public_profile();

-- Backfill public_profiles from existing users
INSERT INTO public.public_profiles (id, name, email, bio, avatar_url, role)
SELECT u.id, u.name, u.email, u.bio, u.avatar_url, u.role
FROM public.users u
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  email = EXCLUDED.email,
  bio = EXCLUDED.bio,
  avatar_url = EXCLUDED.avatar_url,
  role = EXCLUDED.role,
  updated_at = now();

-- Create a function to ensure a user has a public profile
-- This can be called manually if needed to fix any synchronization issues
CREATE OR REPLACE FUNCTION public.ensure_user_public_profile(user_id uuid)
RETURNS void AS $$
BEGIN
  -- Check if the user exists in public.users
  IF EXISTS (SELECT 1 FROM public.users WHERE id = user_id) THEN
    -- Check if the user has a public profile
    IF NOT EXISTS (SELECT 1 FROM public.public_profiles WHERE id = user_id) THEN
      -- Create the public profile from the user data
      INSERT INTO public.public_profiles (id, name, email, bio, avatar_url, role)
      SELECT id, name, email, bio, avatar_url, role
      FROM public.users
      WHERE id = user_id;
    END IF;
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'ensure_user_public_profile failed for user %: %', user_id, SQLERRM;
END;
$$ LANGUAGE plpgsql;