-- Relax the role constraint to allow 'agente', 'vendedor', and 'admin' in addition to legacy values.

DO $$ 
BEGIN
  -- Drop existing constraint if it exists
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_role_check'
  ) THEN
    ALTER TABLE public.users DROP CONSTRAINT users_role_check;
  END IF;

  -- Add new broader constraint
  ALTER TABLE public.users
    ADD CONSTRAINT users_role_check 
    CHECK (role IN ('comprador', 'vendedor', 'agente', 'vendedor_agente', 'empresa_constructora', 'admin'));
END $$;
