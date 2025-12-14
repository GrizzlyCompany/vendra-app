-- Vendra Supabase schema
-- Idempotent SQL to set up users, properties, policies, triggers and optional extras.

-- 1) Extensions ---------------------------------------------------------------
create extension if not exists pgcrypto;

-- 2) public.users ------------------------------------------------------------
create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  name text,
  bio text,
  role text default 'comprador',
  avatar_url text,
  phone text,
  subscription_active boolean default false,
  rating numeric,
  reviews_count integer,
  inserted_at timestamptz default now()
);

alter table public.users enable row level security;

-- RLS policies (idempotent guards)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='users' AND policyname='users_select_own'
  ) THEN
    CREATE POLICY "users_select_own" ON public.users FOR SELECT TO authenticated USING (id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='users' AND policyname='users_insert_own'
  ) THEN
    CREATE POLICY "users_insert_own" ON public.users FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='users' AND policyname='users_update_own'
  ) THEN
    CREATE POLICY "users_update_own" ON public.users FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());
  END IF;
END $$;

-- Ensure role only allows the 3 valid values and is not null (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_role_check'
  ) THEN
    ALTER TABLE public.users
      ADD CONSTRAINT users_role_check CHECK (role IN ('comprador','vendedor_agente','empresa_constructora'));
  END IF;
  -- Make column NOT NULL if not already
  IF EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='users' AND column_name='role' AND is_nullable='YES'
  ) THEN
    ALTER TABLE public.users ALTER COLUMN role SET NOT NULL;
  END IF;
END $$;

-- Generic updated_at column and trigger on users (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='users' AND column_name='updated_at'
  ) THEN
    ALTER TABLE public.users ADD COLUMN updated_at timestamptz;
  END IF;
END $$;

-- Add bio column to users table (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='users' AND column_name='bio'
  ) THEN
    ALTER TABLE public.users ADD COLUMN bio text;
  END IF;
END $$;

-- Add company profile columns to users table (idempotent)
DO $$
BEGIN
  -- RNC field
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='users' AND column_name='rnc'
  ) THEN
    ALTER TABLE public.users ADD COLUMN rnc text;
  END IF;

  -- Website field
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='users' AND column_name='website'
  ) THEN
    ALTER TABLE public.users ADD COLUMN website text;
  END IF;

  -- Headquarters address
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='users' AND column_name='headquarters_address'
  ) THEN
    ALTER TABLE public.users ADD COLUMN headquarters_address text;
  END IF;

  -- Operational areas (array)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='users' AND column_name='operational_areas'
  ) THEN
    ALTER TABLE public.users ADD COLUMN operational_areas text[];
  END IF;

  -- Contact person
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='users' AND column_name='contact_person'
  ) THEN
    ALTER TABLE public.users ADD COLUMN contact_person text;
  END IF;

  -- Primary phone
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='users' AND column_name='primary_phone'
  ) THEN
    ALTER TABLE public.users ADD COLUMN primary_phone text;
  END IF;

  -- Secondary phone
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='users' AND column_name='secondary_phone'
  ) THEN
    ALTER TABLE public.users ADD COLUMN secondary_phone text;
  END IF;

  -- Legal documents array
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='users' AND column_name='legal_documents'
  ) THEN
    ALTER TABLE public.users ADD COLUMN legal_documents text[];
  END IF;

  -- Social media URLs
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='users' AND column_name='facebook_url'
  ) THEN
    ALTER TABLE public.users ADD COLUMN facebook_url text;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='users' AND column_name='instagram_url'
  ) THEN
    ALTER TABLE public.users ADD COLUMN instagram_url text;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='users' AND column_name='linkedin_url'
  ) THEN
    ALTER TABLE public.users ADD COLUMN linkedin_url text;
  END IF;

  -- Terms acceptance
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='users' AND column_name='terms_accepted'
  ) THEN
    ALTER TABLE public.users ADD COLUMN terms_accepted boolean DEFAULT false;
  END IF;
END $$;

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

-- Prevent switching to empresa_constructora after insert (idempotent)
CREATE OR REPLACE FUNCTION public.enforce_empresa_constructora_only_on_insert()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' THEN
    IF NEW.role = 'empresa_constructora' AND OLD.role <> 'empresa_constructora' THEN
      RAISE EXCEPTION 'No puedes cambiar el rol a empresa_constructora después del registro';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname='trg_users_empresa_constructora_guard'
  ) THEN
    CREATE TRIGGER trg_users_empresa_constructora_guard
    BEFORE INSERT OR UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION public.enforce_empresa_constructora_only_on_insert();
  END IF;
END $$;

-- Trigger: auto-insert into public.users when a new auth user is created
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

  -- Insert user with all profile fields to prevent missing column errors
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
    RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created'
  ) THEN
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
  END IF;
END $$;

-- 3) public.properties -------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.properties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  price numeric NOT NULL,
  location text NOT NULL,
  images text[] DEFAULT '{}',
  owner_id uuid REFERENCES auth.users(id),
  type text,
  inserted_at timestamptz DEFAULT now()
);

ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;

-- Public read policy for feed
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='properties' AND policyname='properties_public_read'
  ) THEN
    CREATE POLICY "properties_public_read" ON public.properties FOR SELECT USING (TRUE);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='properties' AND policyname='properties_insert_owner'
  ) THEN
    -- Solo pueden insertar propiedades:
    --  - Usuarios con solicitud de verificación aprobada como vendedor/agente, o
    --  - Usuarios con rol empresa_constructora.
    CREATE POLICY "properties_insert_owner" ON public.properties
      FOR INSERT TO authenticated
      WITH CHECK (
        owner_id = auth.uid()
        AND (
          EXISTS (
            SELECT 1 FROM public.seller_applications sa
            WHERE sa.user_id = auth.uid() AND sa.status IN ('approved','submitted')
          )
          OR EXISTS (
            SELECT 1 FROM public.users u
            WHERE u.id = auth.uid() AND u.role = 'empresa_constructora'
          )
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='properties' AND policyname='properties_update_owner'
  ) THEN
    CREATE POLICY "properties_update_owner" ON public.properties FOR UPDATE TO authenticated USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='properties' AND policyname='properties_delete_owner'
  ) THEN
    CREATE POLICY "properties_delete_owner" ON public.properties FOR DELETE TO authenticated USING (owner_id = auth.uid());
  END IF;
END $$;

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_properties_location ON public.properties (location);
CREATE INDEX IF NOT EXISTS idx_properties_price ON public.properties (price);
CREATE INDEX IF NOT EXISTS idx_properties_owner ON public.properties (owner_id);
CREATE INDEX IF NOT EXISTS idx_properties_inserted_at ON public.properties (inserted_at DESC);

-- Extend properties with additional fields (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='properties' AND column_name='currency'
  ) THEN
    ALTER TABLE public.properties ADD COLUMN currency text;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='properties' AND column_name='address'
  ) THEN
    ALTER TABLE public.properties ADD COLUMN address text;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='properties' AND column_name='bedrooms'
  ) THEN
    ALTER TABLE public.properties ADD COLUMN bedrooms integer;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='properties' AND column_name='bathrooms'
  ) THEN
    ALTER TABLE public.properties ADD COLUMN bathrooms integer;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='properties' AND column_name='area'
  ) THEN
    ALTER TABLE public.properties ADD COLUMN area numeric;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='properties' AND column_name='features'
  ) THEN
    ALTER TABLE public.properties ADD COLUMN features text[] DEFAULT '{}';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='properties' AND column_name='status'
  ) THEN
    ALTER TABLE public.properties ADD COLUMN status text DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'sold', 'rented'));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='properties' AND column_name='is_published'
  ) THEN
    ALTER TABLE public.properties ADD COLUMN is_published boolean DEFAULT true;
  END IF;
END $$;

-- 4) Seller verification applications (KYC) ---------------------------------
-- Almacena los datos del formulario para ascender a vendedor/agente
CREATE TABLE IF NOT EXISTS public.seller_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- 1. Datos básicos
  full_name text,
  id_document_type text,            -- cedula/pasaporte
  id_document_number text,
  birth_date date,
  nationality text,
  -- 2. Contacto
  phone text,
  email text,
  address text,
  -- 3. Rol en la plataforma
  role_choice text CHECK (role_choice IN ('agente_inmobiliario','vendedor_particular')),
  -- Datos para agente
  company_name text,
  company_tax_id text,              -- RNC
  license_number text,
  job_title text,
  -- Datos para vendedor particular
  owner_relation text,              -- propietario/familiar/apoderado
  ownership_proof_url text,
  -- 4. Verificación de identidad (urls en Storage)
  doc_front_url text,
  doc_back_url text,
  selfie_url text,
  terms_accepted boolean default false,
  confirm_truth boolean default false,
  -- 5. Redes (opcionales)
  linkedin_url text,
  website_url text,
  social_urls text[],
  -- Estado de la solicitud
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','submitted','approved','rejected','needs_more_info')),
  reviewer_id uuid,                 -- opcional: id del revisor
  review_notes text,
  submitted_at timestamptz,
  reviewed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_seller_apps_user ON public.seller_applications (user_id);
CREATE INDEX IF NOT EXISTS idx_seller_apps_status ON public.seller_applications (status);

-- Trigger updated_at
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname='trg_seller_apps_set_updated_at'
  ) THEN
    CREATE TRIGGER trg_seller_apps_set_updated_at
    BEFORE UPDATE ON public.seller_applications
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

-- RLS
ALTER TABLE public.seller_applications ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  -- El usuario ve sus solicitudes
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname='seller_apps_select_own' AND tablename='seller_applications'
  ) THEN
    CREATE POLICY "seller_apps_select_own" ON public.seller_applications
      FOR SELECT TO authenticated USING (user_id = auth.uid());
  END IF;

  -- Crear solicitudes propias
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname='seller_apps_insert_own' AND tablename='seller_applications'
  ) THEN
    CREATE POLICY "seller_apps_insert_own" ON public.seller_applications
      FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
  END IF;

  -- Actualizar solicitudes propias, pero no pueden auto-aprobarse
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname='seller_apps_update_own' AND tablename='seller_applications'
  ) THEN
    CREATE POLICY "seller_apps_update_own" ON public.seller_applications
      FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

-- Solo el service_role puede cambiar estado a approved/rejected
CREATE OR REPLACE FUNCTION public.seller_apps_guard_status()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE v_role text;
BEGIN
  v_role := auth.role();
  IF TG_OP = 'UPDATE' THEN
    IF NEW.status IN ('approved','rejected','needs_more_info') AND v_role <> 'service_role' THEN
      RAISE EXCEPTION 'Solo el service_role puede cambiar el estado de la solicitud';
    END IF;
    IF NEW.status = 'submitted' AND OLD.status = 'draft' THEN
      NEW.submitted_at = now();
    END IF;
    IF NEW.status IN ('approved','rejected','needs_more_info') AND NEW.reviewed_at IS NULL THEN
      NEW.reviewed_at = now();
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname='trg_seller_apps_guard_status'
  ) THEN
    CREATE TRIGGER trg_seller_apps_guard_status
    BEFORE UPDATE ON public.seller_applications
    FOR EACH ROW EXECUTE FUNCTION public.seller_apps_guard_status();
  END IF;
END $$;

-- 4.1) Storage bucket para KYC (idempotente)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'kyc-docs'
  ) THEN
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('kyc-docs','kyc-docs', false);
  END IF;
END $$;

-- RLS de Storage: el usuario puede leer/escribir sus archivos en 'kyc-docs'
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname='objects_kyc_select_own' AND tablename='objects'
  ) THEN
    CREATE POLICY objects_kyc_select_own ON storage.objects FOR SELECT TO authenticated
      USING (bucket_id = 'kyc-docs' AND owner = auth.uid());
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname='objects_kyc_insert_own' AND tablename='objects'
  ) THEN
    CREATE POLICY objects_kyc_insert_own ON storage.objects FOR INSERT TO authenticated
      WITH CHECK (bucket_id = 'kyc-docs' AND owner = auth.uid());
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname='objects_kyc_delete_own' AND tablename='objects'
  ) THEN
    CREATE POLICY objects_kyc_delete_own ON storage.objects FOR DELETE TO authenticated
      USING (bucket_id = 'kyc-docs' AND owner = auth.uid());
  END IF;
END $$;

-- Existing storage buckets and policies ...

-- BANNERS bucket (for selectable profile banners)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'banners'
  ) THEN
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('banners', 'banners', true);
  END IF;
END $$;

-- Policies for banners
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname='Banners read public' AND tablename='objects'
  ) THEN
    CREATE POLICY "Banners read public"
      ON storage.objects FOR SELECT
      USING (bucket_id = 'banners');
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname='Banners insert own' AND tablename='objects'
  ) THEN
    CREATE POLICY "Banners insert own"
      ON storage.objects FOR INSERT TO authenticated
      WITH CHECK (bucket_id = 'banners' AND owner = auth.uid());
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname='Banners update own' AND tablename='objects'
  ) THEN
    CREATE POLICY "Banners update own"
      ON storage.objects FOR UPDATE TO authenticated
      USING (bucket_id = 'banners' AND owner = auth.uid())
      WITH CHECK (bucket_id = 'banners' AND owner = auth.uid());
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname='Banners delete own' AND tablename='objects'
  ) THEN
    CREATE POLICY "Banners delete own"
      ON storage.objects FOR DELETE TO authenticated
      USING (bucket_id = 'banners' AND owner = auth.uid());
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'avatars'
  ) THEN
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('avatars','avatars', true);
  END IF;
END $$;

-- RLS de Storage para 'avatars': subir/gestionar solo archivos propios
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname='objects_avatars_select_own' AND tablename='objects'
  ) THEN
    CREATE POLICY objects_avatars_select_own ON storage.objects FOR SELECT TO authenticated
      USING (bucket_id = 'avatars' AND owner = auth.uid());
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname='objects_avatars_insert_own' AND tablename='objects'
  ) THEN
    CREATE POLICY objects_avatars_insert_own ON storage.objects FOR INSERT TO authenticated
      WITH CHECK (bucket_id = 'avatars' AND owner = auth.uid());
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname='objects_avatars_update_own' AND tablename='objects'
  ) THEN
    CREATE POLICY objects_avatars_update_own ON storage.objects FOR UPDATE TO authenticated
      USING (bucket_id = 'avatars' AND owner = auth.uid())
      WITH CHECK (bucket_id = 'avatars' AND owner = auth.uid());
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname='objects_avatars_delete_own' AND tablename='objects'
  ) THEN
    CREATE POLICY objects_avatars_delete_own ON storage.objects FOR DELETE TO authenticated
      USING (bucket_id = 'avatars' AND owner = auth.uid());
  END IF;
END $$;

-- Legal Documents bucket for company legal files (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'legal-docs'
  ) THEN
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('legal-docs','legal-docs', false);
  END IF;
END $$;

-- RLS de Storage para 'legal-docs': subir/gestionar solo archivos propios
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname='objects_legal_docs_select_own' AND tablename='objects'
  ) THEN
    CREATE POLICY objects_legal_docs_select_own ON storage.objects FOR SELECT TO authenticated
      USING (bucket_id = 'legal-docs' AND owner = auth.uid());
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname='objects_legal_docs_insert_own' AND tablename='objects'
  ) THEN
    CREATE POLICY objects_legal_docs_insert_own ON storage.objects FOR INSERT TO authenticated
      WITH CHECK (bucket_id = 'legal-docs' AND owner = auth.uid());
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname='objects_legal_docs_update_own' AND tablename='objects'
  ) THEN
    CREATE POLICY objects_legal_docs_update_own ON storage.objects FOR UPDATE TO authenticated
      USING (bucket_id = 'legal-docs' AND owner = auth.uid())
      WITH CHECK (bucket_id = 'legal-docs' AND owner = auth.uid());
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname='objects_legal_docs_delete_own' AND tablename='objects'
  ) THEN
    CREATE POLICY objects_legal_docs_delete_own ON storage.objects FOR DELETE TO authenticated
      USING (bucket_id = 'legal-docs' AND owner = auth.uid());
  END IF;
END $$;

-- 4) Optional extras for profile tabs ---------------------------------------
-- Saved properties (for "Propiedades Guardadas")
CREATE TABLE IF NOT EXISTS public.saved_properties (
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  property_id uuid REFERENCES public.properties(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, property_id)
);

ALTER TABLE public.saved_properties ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname='saved_select_own' AND tablename='saved_properties'
  ) THEN
    CREATE POLICY "saved_select_own" ON public.saved_properties FOR SELECT TO authenticated USING (user_id = auth.uid());
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname='saved_insert_own' AND tablename='saved_properties'
  ) THEN
    CREATE POLICY "saved_insert_own" ON public.saved_properties FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname='saved_delete_own' AND tablename='saved_properties'
  ) THEN
    CREATE POLICY "saved_delete_own" ON public.saved_properties FOR DELETE TO authenticated USING (user_id = auth.uid());
  END IF;
END $$;

-- Reviews (for ratings)
CREATE TABLE IF NOT EXISTS public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  author_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  rating int CHECK (rating BETWEEN 1 AND 5),
  comment text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname='reviews_public_read' AND tablename='reviews'
  ) THEN
    CREATE POLICY "reviews_public_read" ON public.reviews FOR SELECT USING (TRUE);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname='reviews_insert_auth' AND tablename='reviews'
  ) THEN
    CREATE POLICY "reviews_insert_auth" ON public.reviews FOR INSERT TO authenticated WITH CHECK (author_user_id = auth.uid());
  END IF;
END $$;

-- Summary view for user ratings (optional)
CREATE OR REPLACE VIEW public.user_reviews_summary AS
SELECT
  target_user_id AS user_id,
  AVG(rating)::numeric(10,2) AS avg_rating,
  COUNT(*)::int AS reviews_count
FROM public.reviews
GROUP BY target_user_id;

-- 5) Backfill existing auth.users into public.users -------------------------
--INSERT INTO public.users (id, email, name, role, avatar_url, subscription_active)
--SELECT
--  u.id,
--  u.email,
--  COALESCE(u.raw_user_meta_data->>'name', u.email),
--  'comprador',
--  u.raw_user_meta_data->>'avatar_url',
--  false
--FROM auth.users u
--LEFT JOIN public.users pu ON pu.id = u.id
--WHERE pu.id IS NULL;

-- 5b) Public profiles for owner display (idempotent) -----------------------
CREATE TABLE IF NOT EXISTS public.public_profiles (
  id uuid PRIMARY KEY,
  name text,
  email text,
  bio text,
  avatar_url text,
  role text,
  inserted_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.public_profiles ENABLE ROW LEVEL SECURITY;

-- Ensure 'role' column exists even if table pre-existed without it
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='public_profiles' AND column_name='role'
  ) THEN
    ALTER TABLE public.public_profiles ADD COLUMN role text;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='public_profiles' AND column_name='banner_url'
  ) THEN
    ALTER TABLE public.public_profiles ADD COLUMN banner_url text;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='public_profiles' AND column_name='bio'
  ) THEN
    ALTER TABLE public.public_profiles ADD COLUMN bio text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname='public_profiles_select_public' AND tablename='public_profiles'
  ) THEN
    CREATE POLICY public_profiles_select_public ON public.public_profiles FOR SELECT USING (TRUE);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname='public_profiles_insert_own' AND tablename='public_profiles'
  ) THEN
    CREATE POLICY public_profiles_insert_own ON public.public_profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname='public_profiles_update_own' AND tablename='public_profiles'
  ) THEN
    CREATE POLICY public_profiles_update_own ON public.public_profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname='public_profiles_delete_own' AND tablename='public_profiles'
  ) THEN
    CREATE POLICY public_profiles_delete_own ON public.public_profiles FOR DELETE TO authenticated USING (id = auth.uid());
  END IF;
END $$;

-- updated_at trigger for public_profiles (reuses set_updated_at)
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

-- Keep public_profiles synced with public.users
CREATE OR REPLACE FUNCTION public.sync_public_profile()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.public_profiles WHERE id = OLD.id;
    RETURN OLD;
  ELSE
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
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname='trg_users_sync_public_profile_upsert'
  ) THEN
    CREATE TRIGGER trg_users_sync_public_profile_upsert
    AFTER INSERT OR UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION public.sync_public_profile();
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname='trg_users_sync_public_profile_delete'
  ) THEN
    CREATE TRIGGER trg_users_sync_public_profile_delete
    AFTER DELETE ON public.users
    FOR EACH ROW EXECUTE FUNCTION public.sync_public_profile();
  END IF;
END $$;

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

CREATE INDEX IF NOT EXISTS idx_public_profiles_id ON public.public_profiles (id);

-- 6) Projects table for construction companies ---------------------------------
CREATE TABLE IF NOT EXISTS public.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_name text NOT NULL,
  description_title text,
  short_description text,
  category text,
  address text,
  city_province text,
  zone_sector text,
  project_status text,
  delivery_date text,
  units_count integer,
  floors integer,
  land_size numeric,
  built_areas numeric,
  unit_types text,
  size_range text,
  price_range text,
  quantity_per_type text,
  amenities text[],
  images text[] DEFAULT '{}',
  promo_video text,
  plans text[] DEFAULT '{}',
  unit_price_range text,
  payment_methods text,
  partner_bank text,
  currency text DEFAULT 'USD',
  owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  owner_role text DEFAULT 'empresa_constructora' CHECK (owner_role IN ('empresa_constructora')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- RLS policies for projects
DO $$
BEGIN
  -- Public read policy for projects feed
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='projects' AND policyname='projects_public_read'
  ) THEN
    CREATE POLICY "projects_public_read" ON public.projects FOR SELECT USING (TRUE);
  END IF;

  -- Insert policy - only empresa_constructora users can create projects
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='projects' AND policyname='projects_insert_owner'
  ) THEN
    CREATE POLICY "projects_insert_owner" ON public.projects
      FOR INSERT TO authenticated
      WITH CHECK (
        owner_id = auth.uid()
        AND (
          EXISTS (
            SELECT 1 FROM public.users u
            WHERE u.id = auth.uid() AND u.role = 'empresa_constructora'
          )
        )
      );
  END IF;

  -- Update policy - only owner can update
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='projects' AND policyname='projects_update_owner'
  ) THEN
    CREATE POLICY "projects_update_owner" ON public.projects 
      FOR UPDATE TO authenticated 
      USING (owner_id = auth.uid()) 
      WITH CHECK (owner_id = auth.uid());
  END IF;

  -- Delete policy - only owner can delete
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='projects' AND policyname='projects_delete_owner'
  ) THEN
    CREATE POLICY "projects_delete_owner" ON public.projects 
      FOR DELETE TO authenticated 
      USING (owner_id = auth.uid());
  END IF;
END $$;

-- Indexes for projects
CREATE INDEX IF NOT EXISTS idx_projects_owner ON public.projects (owner_id);
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON public.projects (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_projects_owner_role ON public.projects (owner_role);

-- Trigger to maintain updated_at
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname='trg_projects_set_updated_at'
  ) THEN
    CREATE TRIGGER trg_projects_set_updated_at
      BEFORE UPDATE ON public.projects
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

-- Ensure description_title column exists (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema='public' AND table_name='projects' AND column_name='description_title'
  ) THEN
    ALTER TABLE public.projects ADD COLUMN description_title text;
  END IF;
END $$;

-- 7) Example seed for properties (OPTIONAL) ---------------------------------
-- Replace the owner_id UUID by an existing auth.users.id in your project
-- SELECT id, email FROM auth.users;
-- INSERT INTO public.properties (title, description, price, location, images, owner_id, type) VALUES
-- ('Luminoso Apartamento en Naco', 'Apartamento remodelado con 2 habitaciones y 2 baños.', 185000, 'Santo Domingo', ARRAY['https://images.unsplash.com/photo-1501183638710-841dd1904471'], '11111111-1111-1111-1111-111111111111', 'Apartamento'),
-- ('Villa Moderna en Punta Cana', 'Villa de lujo con piscina y jardín.', 650000, 'Punta Cana', ARRAY['https://images.unsplash.com/photo-1600585154526-990dced4db0d'], '11111111-1111-1111-1111-111111111111', 'Casa'),
-- ('Local Comercial en Piantini', 'Excelente ubicación para tu negocio.', 320000, 'Santo Domingo', ARRAY['https://images.unsplash.com/photo-1522708323590-d24dbb6b0267'], '11111111-1111-1111-1111-111111111111', 'Comercial');

-- 8) Public user ratings (idempotent) ---------------------------------------
CREATE TABLE IF NOT EXISTS public.user_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  reviewer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (target_user_id, reviewer_id)
);

ALTER TABLE public.user_ratings ENABLE ROW LEVEL SECURITY;

-- RLS policies
DO $$
BEGIN
  -- Public read of ratings for aggregation and listing
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='user_ratings' AND policyname='user_ratings_public_read'
  ) THEN
    CREATE POLICY user_ratings_public_read ON public.user_ratings FOR SELECT USING (TRUE);
  END IF;

  -- Insert only by authenticated users for themselves (cannot rate own profile)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='user_ratings' AND policyname='user_ratings_insert_own'
  ) THEN
    CREATE POLICY user_ratings_insert_own ON public.user_ratings
      FOR INSERT TO authenticated
      WITH CHECK (reviewer_id = auth.uid() AND target_user_id <> auth.uid());
  END IF;

  -- Update only own rating
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='user_ratings' AND policyname='user_ratings_update_own'
  ) THEN
    CREATE POLICY user_ratings_update_own ON public.user_ratings
      FOR UPDATE TO authenticated
      USING (reviewer_id = auth.uid())
      WITH CHECK (reviewer_id = auth.uid());
  END IF;

  -- Delete only own rating
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='user_ratings' AND policyname='user_ratings_delete_own'
  ) THEN
    CREATE POLICY user_ratings_delete_own ON public.user_ratings
      FOR DELETE TO authenticated
      USING (reviewer_id = auth.uid());
  END IF;
END $$;

-- Trigger to maintain updated_at
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'set_updated_at'
  ) THEN
    CREATE FUNCTION public.set_updated_at()
    RETURNS trigger LANGUAGE plpgsql AS $set_updated_at$
    BEGIN
      NEW.updated_at = now();
      RETURN NEW;
    END;
    $set_updated_at$;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname='trg_user_ratings_set_updated_at'
  ) THEN
    CREATE TRIGGER trg_user_ratings_set_updated_at
      BEFORE UPDATE ON public.user_ratings
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

-- Helpful indexes for ratings
CREATE INDEX IF NOT EXISTS idx_user_ratings_target ON public.user_ratings (target_user_id);
CREATE INDEX IF NOT EXISTS idx_user_ratings_reviewer ON public.user_ratings (reviewer_id);

-- 9) 1:1 Messages (idempotent) ---------------------------------------------
CREATE TABLE IF NOT EXISTS public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz DEFAULT now(),
  read_at timestamptz,
  updated_at timestamptz DEFAULT now(),
  -- Conversation grouping fields for admin support cases
  conversation_type text DEFAULT 'user_to_user' CHECK (conversation_type IN ('user_to_user', 'user_to_admin', 'admin_to_user')),
  case_status text DEFAULT 'open' CHECK (case_status IN ('open', 'closed', 'resolved')),
  closed_at timestamptz,
  closed_by uuid REFERENCES auth.users(id)
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Ensure these columns exist (idempotent ALTER TABLE)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'messages' AND column_name = 'conversation_type'
  ) THEN
    ALTER TABLE public.messages ADD COLUMN conversation_type text DEFAULT 'user_to_user' CHECK (conversation_type IN ('user_to_user', 'user_to_admin', 'admin_to_user'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'messages' AND column_name = 'case_status'
  ) THEN
    ALTER TABLE public.messages ADD COLUMN case_status text DEFAULT 'open' CHECK (case_status IN ('open', 'closed', 'resolved'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'messages' AND column_name = 'closed_at'
  ) THEN
    ALTER TABLE public.messages ADD COLUMN closed_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'messages' AND column_name = 'closed_by'
  ) THEN
    ALTER TABLE public.messages ADD COLUMN closed_by uuid REFERENCES auth.users(id);
  END IF;
END $$;

DO $$
BEGIN
  -- Read if you are participant
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='messages' AND policyname='messages_select_participant'
  ) THEN
    CREATE POLICY messages_select_participant ON public.messages
      FOR SELECT USING (sender_id = auth.uid() OR recipient_id = auth.uid());
  END IF;

  -- Insert only as self sender
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='messages' AND policyname='messages_insert_self'
  ) THEN
    CREATE POLICY messages_insert_self ON public.messages
      FOR INSERT TO authenticated
      WITH CHECK (sender_id = auth.uid());
  END IF;

  -- Update only when participant; recipient can mark as read
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='messages' AND policyname='messages_update_participant'
  ) THEN
    CREATE POLICY messages_update_participant ON public.messages
      FOR UPDATE TO authenticated
      USING (sender_id = auth.uid() OR recipient_id = auth.uid())
      WITH CHECK (sender_id = auth.uid() OR recipient_id = auth.uid());
  END IF;

  -- Optional: delete only own sent messages
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='messages' AND policyname='messages_delete_sender'
  ) THEN
    CREATE POLICY messages_delete_sender ON public.messages
      FOR DELETE TO authenticated
      USING (sender_id = auth.uid());
  END IF;
END $$;

-- Trigger to maintain updated_at
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname='trg_messages_set_updated_at'
  ) THEN
    CREATE TRIGGER trg_messages_set_updated_at
      BEFORE UPDATE ON public.messages
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_messages_sender ON public.messages (sender_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_recipient ON public.messages (recipient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_pair ON public.messages (sender_id, recipient_id, created_at DESC);
-- Indexes for admin conversation support
CREATE INDEX IF NOT EXISTS idx_messages_conversation_type ON public.messages (conversation_type);
CREATE INDEX IF NOT EXISTS idx_messages_case_status ON public.messages (case_status);
CREATE INDEX IF NOT EXISTS idx_messages_closed_at ON public.messages (closed_at);
CREATE INDEX IF NOT EXISTS idx_messages_admin_conversations ON public.messages (case_status, conversation_type, created_at DESC);

-- 11) Contact Forms for admin management (idempotent) ---------------------
CREATE TABLE IF NOT EXISTS public.contact_forms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  phone text,
  property_id uuid REFERENCES public.properties(id) ON DELETE SET NULL,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'responded', 'archived')),
  admin_response text,
  response_date timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.contact_forms ENABLE ROW LEVEL SECURITY;

-- RLS policies (only admin can access)
DO $$
BEGIN
  -- Admin can read all contact forms
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='contact_forms' AND policyname='contact_forms_admin_all'
  ) THEN
    CREATE POLICY "contact_forms_admin_all" ON public.contact_forms FOR ALL TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.users u
          WHERE u.id = auth.uid() AND u.email = 'admin@vendra.com'
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.users u
          WHERE u.id = auth.uid() AND u.email = 'admin@vendra.com'
        )
      );
  END IF;

  -- Public insert policy for contact forms
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='contact_forms' AND policyname='contact_forms_public_insert'
  ) THEN
    CREATE POLICY "contact_forms_public_insert" ON public.contact_forms FOR INSERT
      WITH CHECK (true);
  END IF;
END $$;

-- Trigger to maintain updated_at
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname='trg_contact_forms_set_updated_at'
  ) THEN
    CREATE TRIGGER trg_contact_forms_set_updated_at
      BEFORE UPDATE ON public.contact_forms
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_contact_forms_status ON public.contact_forms (status);
CREATE INDEX IF NOT EXISTS idx_contact_forms_created_at ON public.contact_forms (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contact_forms_property ON public.contact_forms (property_id);

-- 10) Property Views Tracking (for statistics) -----------------------------
-- Add views_count column to properties table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema='public' AND table_name='properties' AND column_name='views_count'
  ) THEN
    ALTER TABLE public.properties ADD COLUMN views_count integer DEFAULT 0;
  END IF;
END $$;

-- Create property_views table for detailed tracking
CREATE TABLE IF NOT EXISTS public.property_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  viewer_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  viewer_ip text,
  user_agent text,
  referrer text,
  session_id text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.property_views ENABLE ROW LEVEL SECURITY;

-- RLS policies for property_views
DO $$
BEGIN
  -- Property owners can see views of their properties
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='property_views' AND policyname='property_views_owner_read'
  ) THEN
    CREATE POLICY "property_views_owner_read" ON public.property_views 
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM public.properties p 
          WHERE p.id = property_id AND p.owner_id = auth.uid()
        )
      );
  END IF;

  -- Anyone can insert views (for tracking)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='property_views' AND policyname='property_views_insert_public'
  ) THEN
    CREATE POLICY "property_views_insert_public" ON public.property_views 
      FOR INSERT WITH CHECK (true);
  END IF;
END $$;

-- Indexes for property_views performance
CREATE INDEX IF NOT EXISTS idx_property_views_property_id ON public.property_views (property_id);
CREATE INDEX IF NOT EXISTS idx_property_views_viewer_id ON public.property_views (viewer_id);
CREATE INDEX IF NOT EXISTS idx_property_views_created_at ON public.property_views (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_property_views_property_date ON public.property_views (property_id, created_at DESC);

-- Function to increment view count
CREATE OR REPLACE FUNCTION public.increment_property_views(property_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.properties 
  SET views_count = COALESCE(views_count, 0) + 1 
  WHERE id = property_id;
END;
$$;

-- Function to get property statistics for dashboard
CREATE OR REPLACE FUNCTION public.get_property_stats(owner_id uuid)
RETURNS TABLE (
  active_properties bigint,
  total_views bigint,
  views_this_month bigint,
  unique_viewers bigint,
  active_projects bigint,
  total_project_views bigint,
  project_views_this_month bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (SELECT COUNT(*) FROM public.properties WHERE owner_id = $1) as active_properties,
    (SELECT COALESCE(SUM(views_count), 0) FROM public.properties WHERE owner_id = $1) as total_views,
    (SELECT COUNT(*) FROM public.property_views pv 
     JOIN public.properties p ON p.id = pv.property_id 
     WHERE p.owner_id = $1 
     AND pv.created_at >= date_trunc('month', now())) as views_this_month,
    (SELECT COUNT(DISTINCT viewer_id) FROM public.property_views pv 
     JOIN public.properties p ON p.id = pv.property_id 
     WHERE p.owner_id = $1 
     AND viewer_id IS NOT NULL) as unique_viewers,
    (SELECT COUNT(*) FROM public.projects WHERE owner_id = $1) as active_projects,
    (SELECT COALESCE(SUM(views_count), 0) FROM public.projects WHERE owner_id = $1) as total_project_views,
    (SELECT COUNT(*) FROM public.project_views pv 
     JOIN public.projects p ON p.id = pv.project_id 
     WHERE p.owner_id = $1 
     AND pv.created_at >= date_trunc('month', now())) as project_views_this_month;
END;
$$;

-- Function to get monthly view trends
CREATE OR REPLACE FUNCTION public.get_monthly_view_trends(owner_id uuid, months_back integer DEFAULT 6)
RETURNS TABLE (
  month_year text,
  views_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH combined_views AS (
    -- Property views
    SELECT 
      date_trunc('month', pv.created_at) as month,
      COUNT(*) as views
    FROM public.property_views pv
    JOIN public.properties p ON p.id = pv.property_id
    WHERE p.owner_id = $1
      AND pv.created_at >= date_trunc('month', now()) - INTERVAL '1 month' * months_back
    GROUP BY date_trunc('month', pv.created_at)
    
    UNION ALL
    
    -- Project views
    SELECT 
      date_trunc('month', pv.created_at) as month,
      COUNT(*) as views
    FROM public.project_views pv
    JOIN public.projects p ON p.id = pv.project_id
    WHERE p.owner_id = $1
      AND pv.created_at >= date_trunc('month', now()) - INTERVAL '1 month' * months_back
    GROUP BY date_trunc('month', pv.created_at)
  )
  SELECT 
    TO_CHAR(month, 'Mon YYYY') as month_year,
    SUM(views)::bigint as views_count
  FROM combined_views
  GROUP BY month
  ORDER BY month DESC;
END;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.increment_property_views(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_property_stats(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_monthly_view_trends(uuid, integer) TO authenticated;

-- 11) Migration: Backfill missing profile fields for existing users -----------------
-- This ensures existing users have all required profile fields initialized
-- Only runs when all profile columns have been added (safe guard)
DO $$
DECLARE
    user_record RECORD;
    updated_count INTEGER := 0;
    phone_exists BOOLEAN := FALSE;
    rnc_exists BOOLEAN := FALSE;
    terms_exists BOOLEAN := FALSE;
    areas_exists BOOLEAN := FALSE;
    docs_exists BOOLEAN := FALSE;
BEGIN
    -- Check if required columns exist before proceeding
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'phone'
    ) INTO phone_exists;

    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'rnc'
    ) INTO rnc_exists;

    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'terms_accepted'
    ) INTO terms_exists;

    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'operational_areas'
    ) INTO areas_exists;

    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'legal_documents'
    ) INTO docs_exists;

    -- Only proceed if all columns exist
    IF phone_exists AND rnc_exists AND terms_exists AND areas_exists AND docs_exists THEN
        -- Loop through all users and ensure they have all profile fields initialized
        FOR user_record IN
            SELECT id, email, name, role
            FROM public.users
            WHERE (phone::text = '' OR phone IS NULL)
               OR (rnc = '' OR rnc IS NULL)
               OR terms_accepted IS NULL
               OR operational_areas IS NULL
               OR legal_documents IS NULL
        LOOP
            RAISE NOTICE 'Backfilling profile fields for user: %', user_record.id;

            UPDATE public.users
            SET
                phone = COALESCE(phone, ''),
                bio = COALESCE(bio, ''),
                rnc = COALESCE(rnc, ''),
                website = COALESCE(website, null),
                headquarters_address = COALESCE(headquarters_address, ''),
                operational_areas = COALESCE(operational_areas, '{}'),
                contact_person = COALESCE(contact_person, ''),
                primary_phone = COALESCE(primary_phone, ''),
                secondary_phone = COALESCE(secondary_phone, ''),
                legal_documents = COALESCE(legal_documents, '{}'),
                facebook_url = COALESCE(facebook_url, ''),
                instagram_url = COALESCE(instagram_url, ''),
                linkedin_url = COALESCE(linkedin_url, ''),
                terms_accepted = COALESCE(terms_accepted, false)
            WHERE id = user_record.id;

            updated_count := updated_count + 1;
        END LOOP;

        RAISE NOTICE 'Profile fields backfill completed. Updated % users.', updated_count;
    ELSE
        RAISE NOTICE 'Profile backfill skipped - not all required columns exist yet. Will run on next schema deployment.';
    END IF;
END $$;

-- Show final summary (only if all columns exist)
DO $$
DECLARE
    phone_exists BOOLEAN := FALSE;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'phone'
    ) INTO phone_exists;

    IF phone_exists THEN
        RAISE NOTICE 'User Profile Summary:';
        -- Will show in the next deployment run after columns are added
    END IF;
END $$;

-- Add a function to ensure admin user has correct role and profile
CREATE OR REPLACE FUNCTION public.ensure_admin_user()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Ensure admin user has a public profile
  INSERT INTO public.public_profiles (id, name, email, role)
  SELECT id, 
         COALESCE(name, 'Administrador Vendra') as name, 
         email, 
         role 
  FROM public.users 
  WHERE email = 'admin@vendra.com'
  ON CONFLICT (id) 
  DO UPDATE SET 
      name = EXCLUDED.name,
      email = EXCLUDED.email,
      role = EXCLUDED.role,
      updated_at = now();
END;
$$;

-- Run the function to ensure admin user is properly set up
SELECT public.ensure_admin_user();

-- Drop the function after use as it's not needed for ongoing operations
DROP FUNCTION public.ensure_admin_user();
